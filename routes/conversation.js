const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Contact = require('../models/Contact');
const { authenticateToken } = require('../middleware/auth');
const whatsappService = require('../services/WhatsAppService');

// Obter contatos com mensagens recebidas
router.get('/contacts', async (req, res) => {
    try {
        console.log('Rota /contacts chamada com status:', req.query.status);
        const status = req.query.status || 'all';
        
        // Verificar se o WhatsApp está conectado
        if (await whatsappService.getStatus() !== 'CONNECTED') {
            return res.status(503).json({
                success: false,
                message: 'WhatsApp não está conectado'
            });
        }
        
        console.log('WhatsApp conectado, obtendo chats...');
        
        // Obter todos os chats do WhatsApp (inclui conversas individuais e grupos)
        const chats = await whatsappService.client.getChats();
        console.log(`Total de chats encontrados: ${chats.length}`);
        
        // Filtrar chats conforme o status solicitado
        let filteredChats = chats;
        if (status === 'archived') {
            filteredChats = chats.filter(chat => chat.archived);
        } else if (status === 'all') {
            // Mostrar todos os chats não arquivados por padrão
            filteredChats = chats.filter(chat => !chat.archived);
        }
        
        console.log(`Chats filtrados por status '${status}': ${filteredChats.length}`);
        
        // Mapear chats para o formato esperado pelo frontend
        const contactsData = await Promise.all(filteredChats.map(async (chat) => {
            try {
                // Obter informações do contato/grupo
                const contactId = chat.id._serialized;
                let name = '';
                let phone = '';
                let profilePicUrl = null;
                
                if (chat.isGroup) {
                    // Para grupos
                    name = chat.name;
                } else {
                    // Para contatos individuais
                    try {
                        const contact = await whatsappService.client.getContactById(contactId);
                        name = contact.name || contact.pushname || contact.id.user;
                        phone = contact.id.user;
                    } catch (error) {
                        console.log(`Erro ao obter contato ${contactId}:`, error.message);
                        name = chat.name || 'Desconhecido';
                        phone = contactId.split('@')[0];
                    }
                }
                
                // Tentar obter foto de perfil
                try {
                    profilePicUrl = await whatsappService.client.getProfilePicUrl(contactId);
                } catch (error) {
                    console.log(`Erro ao obter foto de perfil para ${contactId}:`, error.message);
                }
                
                // Última mensagem e data
                let lastMessage = '';
                let lastMessageDate = new Date();
                
                if (chat.lastMessage) {
                    lastMessage = chat.lastMessage.body || '';
                    lastMessageDate = new Date(chat.lastMessage.timestamp * 1000);
                }
                
                // Retornar objeto formatado
                return {
                    _id: contactId,
                    name: name,
                    phone: phone,
                    lastMessage: lastMessage,
                    lastMessageDate: lastMessageDate,
                    unreadCount: chat.unreadCount || 0,
                    profilePicUrl: profilePicUrl,
                    isGroup: chat.isGroup
                };
            } catch (error) {
                console.error('Erro ao processar chat:', error);
                return null;
            }
        }));
        
        // Filtrar contatos nulos (em caso de erro no processamento)
        const validContacts = contactsData.filter(contact => contact !== null);
        
        // Ordenar por data da última mensagem (mais recente primeiro)
        validContacts.sort((a, b) => {
            return new Date(b.lastMessageDate) - new Date(a.lastMessageDate);
        });
        
        console.log('Retornando contatos:', validContacts.length, 'contatos encontrados');
        
        // Log do primeiro contato para debug
        if (validContacts.length > 0) {
            console.log('Exemplo do primeiro contato:', JSON.stringify(validContacts[0], null, 2));
        }
        
        res.json({
            success: true,
            data: validContacts
        });
    } catch (error) {
        console.error('Erro ao obter contatos:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao obter contatos: ' + error.message
        });
    }
});

// Obter conversa com um contato específico
router.get('/conversation/:contactId', async (req, res) => {
    try {
        const contactId = req.params.contactId;
        console.log(`Carregando conversa para o contato: ${contactId}`);
        
        // Verificar se o WhatsApp está conectado
        if (await whatsappService.getStatus() !== 'CONNECTED') {
            return res.status(503).json({
                success: false,
                message: 'WhatsApp não está conectado'
            });
        }
        
        // Formatar ID do contato para WhatsApp se necessário
        let formattedContactId = contactId;
        if (!contactId.includes('@')) {
            // Se for apenas um número de telefone, formatar para o padrão do WhatsApp
            formattedContactId = `${contactId}@c.us`;
        }
        
        console.log(`ID formatado do contato: ${formattedContactId}`);
        
        // Obter chat do contato diretamente do WhatsApp
        const chat = await whatsappService.client.getChatById(formattedContactId);
        
        if (!chat) {
            return res.status(404).json({
                success: false,
                message: 'Conversa não encontrada'
            });
        }
        
        console.log(`Chat encontrado. Carregando mensagens...`);
        
        // Carregar mensagens do chat
        const messages = await chat.fetchMessages({ limit: 100 }); // Carregar as últimas 100 mensagens
        console.log(`${messages.length} mensagens carregadas`);
        
        // Obter informações do contato
        let contactInfo;
        try {
            contactInfo = await whatsappService.client.getContactById(formattedContactId);
        } catch (error) {
            console.log('Erro ao obter informações do contato:', error);
        }
        
        // Formatar mensagens para o formato esperado pelo frontend
        const formattedMessages = [];
        
        for (const message of messages) {
            try {
                // Determinar se a mensagem é recebida ou enviada
                const isIncoming = !message.fromMe;
                
                // Objeto base da mensagem
                const formattedMessage = {
                    _id: message.id._serialized,
                    content: message.body,
                    createdAt: new Date(message.timestamp * 1000), // Converter timestamp para data
                    isOutgoing: message.fromMe, // Importante: frontend usa isOutgoing, não isIncoming
                    senderPhone: isIncoming ? contactInfo?.id.user : whatsappService.client.info.wid.user,
                    isRead: message.isStatus || message.isRead,
                    status: message.ack || 0, // 0: enviando, 1: enviado, 2: recebido, 3: lido
                    media: null
                };
                
                // Processar mídia se existir
                if (message.hasMedia) {
                    try {
                        const media = await message.downloadMedia();
                        
                        formattedMessage.media = {
                            type: message.type,
                            mimetype: media.mimetype,
                            data: media.data, // Base64 da mídia
                            filename: media.filename || `${message.type}-${Date.now()}`
                        };
                        
                        // Se for áudio, adicionar duração se disponível
                        if (message.type === 'audio' || message.type === 'ptt') {
                            formattedMessage.media.duration = message.duration || 0;
                        }
                        
                        console.log(`Mídia processada: ${message.type}`);
                    } catch (mediaError) {
                        console.error(`Erro ao processar mídia da mensagem ${message.id._serialized}:`, mediaError);
                        formattedMessage.media = {
                            type: message.type,
                            error: 'Não foi possível carregar a mídia'
                        };
                    }
                }
                
                formattedMessages.push(formattedMessage);
            } catch (messageError) {
                console.error('Erro ao processar mensagem:', messageError);
            }
        }
        
        console.log(`${formattedMessages.length} mensagens formatadas e prontas para envio`);
        
        res.json({
            success: true,
            data: formattedMessages
        });
    } catch (error) {
        console.error('Erro ao obter conversa:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao obter conversa: ' + error.message
        });
    }
});

// Marcar mensagens de um contato como lidas
router.put('/read/:contactId', async (req, res) => {
    try {
        const contactId = req.params.contactId;
        
        // Verificar se o WhatsApp está conectado
        if (await whatsappService.getStatus() !== 'CONNECTED') {
            return res.status(503).json({
                success: false,
                message: 'WhatsApp não está conectado'
            });
        }
        
        // Formatar ID do contato para WhatsApp se necessário
        let formattedContactId = contactId;
        if (!contactId.includes('@')) {
            // Se for apenas um número de telefone, formatar para o padrão do WhatsApp
            formattedContactId = `${contactId}@c.us`;
        }
        
        // Obter chat do contato
        const chat = await whatsappService.client.getChatById(formattedContactId);
        
        if (!chat) {
            return res.status(404).json({
                success: false,
                message: 'Conversa não encontrada'
            });
        }
        
        // Marcar chat como lido no WhatsApp
        await chat.sendSeen();
        
        res.json({
            success: true,
            message: 'Mensagens marcadas como lidas'
        });
    } catch (error) {
        console.error('Erro ao marcar mensagens como lidas:', error);
        res.status(500).json({
            success: false,
            message: 'Erro ao marcar mensagens como lidas'
        });
    }
});

module.exports = router;

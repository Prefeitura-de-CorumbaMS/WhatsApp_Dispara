// Chat Interface Manager - Estilo WhatsApp
class ChatInterfaceManager {
    constructor(dashboardManager) {
        this.dashboard = dashboardManager;
        this.contacts = [];
        this.selectedContact = null;
        this.conversations = {};
        this.messageStatus = 'all'; // 'all' ou 'archived'
        
        this.initializeChatInterface();
    }

    initializeChatInterface() {
        this.bindEvents();
        this.loadContacts();
        this.connectToMessageEvents();
    }

    bindEvents() {
        // Botões de filtro
        const allMessagesBtn = document.getElementById('show-all-messages');
        const archivedMessagesBtn = document.getElementById('show-archived-messages');

        if (allMessagesBtn) {
            allMessagesBtn.addEventListener('click', () => {
                this.setActiveFilterButton(allMessagesBtn);
                this.messageStatus = 'all';
                this.loadContacts();
            });
        }

        if (archivedMessagesBtn) {
            archivedMessagesBtn.addEventListener('click', () => {
                this.setActiveFilterButton(archivedMessagesBtn);
                this.messageStatus = 'archived';
                this.loadContacts();
            });
        }

        // Formulário de envio de mensagem
        const sendMessageForm = document.getElementById('send-message-form');
        if (sendMessageForm) {
            sendMessageForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.sendMessage();
            });
        }
    }

    setActiveFilterButton(activeButton) {
        // Remover classe ativa de todos os botões
        const filterButtons = document.querySelectorAll('#show-all-messages, #show-archived-messages');
        filterButtons.forEach(button => {
            button.classList.remove('btn-info', 'active');
            button.classList.add('btn-light');
        });

        // Adicionar classe ativa ao botão selecionado
        activeButton.classList.remove('btn-light');
        activeButton.classList.add('btn-info', 'active');
    }

    async loadContacts() {
        console.log('Iniciando carregamento de contatos...');
        try {
            const contactsList = document.getElementById('contacts-list');
            if (!contactsList) return;

            // Mostrar indicador de carregamento
            contactsList.innerHTML = `
                <div class="text-center py-4">
                    <div class="spinner-border text-info mb-2" role="status">
                        <span class="visually-hidden">Carregando...</span>
                    </div>
                    <span class="text-muted">Carregando contatos...</span>
                </div>
            `;

            // Construir parâmetros da consulta
            const params = new URLSearchParams({
                status: this.messageStatus
            });
            
            console.log('Chamando API:', `/api/conversation/contacts?${params}`);

            // Obter contatos com mensagens recebidas
            const response = await fetch(`/api/conversation/contacts?${params}`);
            console.log('Resposta recebida. Status:', response.status);
            
            const result = await response.json();
            console.log('Dados recebidos:', result);
            
            if (result.success) {
                console.log('Contatos carregados com sucesso. Total:', result.data.length);
                this.contacts = result.data;
                this.renderContacts();
            } else {
                console.error('Falha ao carregar contatos:', result.message);
                this.showToast('Erro ao carregar contatos', 'error');
            }
        } catch (error) {
            console.error('Erro ao carregar contatos:', error);
            this.showToast('Erro ao carregar contatos', 'error');
        }
    }

    renderContacts() {
        const contactsList = document.getElementById('contacts-list');
        if (!contactsList) return;
        
        if (this.contacts.length === 0) {
            contactsList.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-users text-muted mb-2" style="font-size: 2rem;"></i>
                    <p class="text-muted">Nenhum contato com mensagens encontrado</p>
                </div>
            `;
            return;
        }

        contactsList.innerHTML = '';
        
        // Variável para armazenar o primeiro contato para seleção automática
        let firstContact = null;
        
        this.contacts.forEach((contact, index) => {
            // Armazenar o primeiro contato para seleção automática
            if (index === 0) {
                firstContact = contact;
            }
            
            const contactItem = document.createElement('a');
            contactItem.href = '#';
            contactItem.className = 'list-group-item list-group-item-action border-0';
            contactItem.dataset.id = contact._id;
            
            // Formatar última mensagem e data
            const lastMessage = contact.lastMessage ? 
                (contact.lastMessage.length > 30 ? contact.lastMessage.substring(0, 30) + '...' : contact.lastMessage) : 
                'Nenhuma mensagem';
            
            const lastMessageDate = contact.lastMessageDate ? 
                this.formatMessageDate(new Date(contact.lastMessageDate)) : '';
            
            // Verificar se há mensagens não lidas
            const unreadBadge = contact.unreadCount > 0 ? 
                `<span class="badge bg-primary rounded-pill">${contact.unreadCount}</span>` : '';
            
            // Verificar se o contato tem foto de perfil
            const profilePic = contact.profilePicUrl ? 
                `<img src="${contact.profilePicUrl}" alt="${contact.name || contact.phone}" class="rounded-circle" style="width: 50px; height: 50px; object-fit: cover;">` : 
                `<div class="bg-light rounded-circle d-flex align-items-center justify-content-center" style="width: 50px; height: 50px;">
                    <i class="fas fa-${contact.isGroup ? 'users' : 'user'} text-secondary"></i>
                </div>`;
            
            contactItem.innerHTML = `
                <div class="d-flex align-items-center">
                    <div class="me-3" style="width: 50px; height: 50px; flex-shrink: 0;">
                        ${profilePic}
                    </div>
                    <div class="flex-grow-1 overflow-hidden">
                        <div class="d-flex justify-content-between align-items-center">
                            <h6 class="mb-0 text-truncate">${contact.name || contact.phone}</h6>
                            <small class="text-muted ms-2">${lastMessageDate}</small>
                        </div>
                        <div class="d-flex justify-content-between align-items-center">
                            <p class="text-muted small mb-0 text-truncate">${lastMessage}</p>
                            ${unreadBadge}
                        </div>
                    </div>
                </div>
            `;
            
            contactItem.addEventListener('click', (e) => {
                e.preventDefault();
                this.selectContact(contact);
            });
            
            contactsList.appendChild(contactItem);
        });
        
        // Selecionar automaticamente o primeiro contato da lista
        if (firstContact) {
            console.log('Selecionando automaticamente o primeiro contato:', firstContact.name || firstContact.phone);
            this.selectContact(firstContact);
        }
    }

    selectContact(contact) {
        // Atualizar contato selecionado
        this.selectedContact = contact;
        
        // Atualizar UI para mostrar o contato selecionado
        const contactHeader = document.getElementById('selected-contact-header');
        const contactName = document.getElementById('selected-contact-name');
        const contactStatus = document.getElementById('selected-contact-status');
        const messageInput = document.getElementById('message-input');
        const sendButton = document.getElementById('send-message-btn');
        
        if (contactHeader && contactName && contactStatus) {
            // Atualizar o cabeçalho com foto, nome/número e status
            const profilePic = contact.profilePicUrl ? 
                `<img src="${contact.profilePicUrl}" alt="${contact.name || contact.phone}" class="rounded-circle" style="width: 40px; height: 40px; object-fit: cover;">` : 
                `<i class="fas fa-${contact.isGroup ? 'users' : 'user'} text-secondary"></i>`;
            
            // Atualizar o HTML do cabeçalho
            contactHeader.innerHTML = `
                <div class="d-flex align-items-center">
                    <div class="bg-light rounded-circle d-flex align-items-center justify-content-center me-2" style="width: 40px; height: 40px;">
                        ${profilePic}
                    </div>
                    <div>
                        <h6 class="mb-0" id="selected-contact-name" style="color: #000000;">${contact.name || contact.phone}</h6>
                        <small class="text-muted" id="selected-contact-status" style="color: #555555;">${contact.isOnline ? 'Online' : 'Offline'}</small>
                    </div>
                </div>
            `;
            
            // Habilitar campo de mensagem
            if (messageInput && sendButton) {
                messageInput.disabled = false;
                sendButton.disabled = false;
            }
        }
        
        // Destacar contato selecionado na lista
        const contactItems = document.querySelectorAll('#contacts-list .list-group-item');
        contactItems.forEach(item => {
            item.classList.remove('active');
            if (item.dataset.id === contact._id) {
                item.classList.add('active');
            }
        });
        
        // Carregar mensagens do contato
        this.loadConversation(contact._id);
    }

    async loadConversation(contactId) {
        try {
            const messagesContainer = document.getElementById('messages-container');
            if (!messagesContainer) return;
            
            // Mostrar indicador de carregamento
            messagesContainer.innerHTML = `
                <div class="d-flex justify-content-center py-4">
                    <div class="spinner-border text-info" role="status">
                        <span class="visually-hidden">Carregando mensagens...</span>
                    </div>
                </div>
            `;
            
            // Obter mensagens da conversa
            const response = await fetch(`/api/conversation/conversation/${contactId}`);
            const result = await response.json();
            
            if (result.success) {
                this.conversations[contactId] = result.data;
                this.renderConversation(contactId);
                
                // Marcar mensagens como lidas
                this.markConversationAsRead(contactId);
            } else {
                console.error('Falha ao carregar conversa:', result.message);
                this.showToast('Erro ao carregar mensagens', 'error');
            }
        } catch (error) {
            console.error('Erro ao carregar conversa:', error);
            this.showToast('Erro ao carregar mensagens', 'error');
        }
    }

    renderConversation(contactId) {
        const messagesContainer = document.getElementById('messages-container');
        if (!messagesContainer) return;
        
        const messages = this.conversations[contactId];
        
        if (!messages || messages.length === 0) {
            messagesContainer.innerHTML = `
                <div class="d-flex flex-column align-items-center justify-content-center h-100">
                    <div class="text-center">
                        <i class="fas fa-comments text-muted mb-3" style="font-size: 3rem;"></i>
                        <h5 class="text-muted">Nenhuma mensagem nesta conversa</h5>
                    </div>
                </div>
            `;
            return;
        }
        
        messagesContainer.innerHTML = '';
        
        // Agrupar mensagens por data
        const messagesByDate = this.groupMessagesByDate(messages);
        
        // Renderizar mensagens agrupadas por data
        Object.keys(messagesByDate).forEach(date => {
            // Adicionar separador de data
            const dateDiv = document.createElement('div');
            dateDiv.className = 'text-center my-3';
            dateDiv.innerHTML = `<span class="badge bg-light text-dark px-3 py-2">${date}</span>`;
            messagesContainer.appendChild(dateDiv);
            
            // Adicionar mensagens do dia
            messagesByDate[date].forEach(message => {
                const isIncoming = !message.isOutgoing;
                const messageDiv = document.createElement('div');
                messageDiv.className = `d-flex mb-3 ${isIncoming ? '' : 'justify-content-end'}`;
                
                const time = new Date(message.createdAt).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                const statusIcon = message.isOutgoing ? this.getMessageStatusIcon(message.status) : '';
                
                // Processar o conteúdo da mensagem com base no tipo
                let messageContent = '';
                
                // Verificar se a mensagem tem mídia
                if (message.media) {
                    switch (message.media.type) {
                        case 'image':
                            messageContent = `
                                <div class="message-media mb-2">
                                    <img src="data:${message.media.mimetype};base64,${message.media.data}" 
                                         class="img-fluid rounded" style="max-height: 200px;" 
                                         onclick="window.open(this.src)" alt="Imagem">
                                </div>
                                ${message.content ? `<div class="message-text" style="white-space: pre-wrap; color: #000000;">${message.content}</div>` : ''}
                            `;
                            break;
                            
                        case 'video':
                            messageContent = `
                                <div class="message-media mb-2">
                                    <video controls class="img-fluid rounded" style="max-height: 200px;">
                                        <source src="data:${message.media.mimetype};base64,${message.media.data}" type="${message.media.mimetype}">
                                        Seu navegador não suporta a reprodução de vídeos.
                                    </video>
                                </div>
                                ${message.content ? `<div class="message-text" style="white-space: pre-wrap; color: #000000;">${message.content}</div>` : ''}
                            `;
                            break;
                            
                        case 'audio':
                        case 'ptt':
                            messageContent = `
                                <div class="message-media mb-2">
                                    <audio controls>
                                        <source src="data:${message.media.mimetype};base64,${message.media.data}" type="${message.media.mimetype}">
                                        Seu navegador não suporta a reprodução de áudios.
                                    </audio>
                                </div>
                                ${message.content ? `<div class="message-text" style="white-space: pre-wrap; color: #000000;">${message.content}</div>` : ''}
                            `;
                            break;
                            
                        case 'document':
                            const fileName = message.media.filename || 'documento';
                            messageContent = `
                                <div class="message-media mb-2">
                                    <div class="document-preview p-2 border rounded">
                                        <i class="fas fa-file-alt me-2"></i>
                                        <a href="data:${message.media.mimetype};base64,${message.media.data}" 
                                           download="${fileName}" target="_blank">${fileName}</a>
                                    </div>
                                </div>
                                ${message.content ? `<div class="message-text" style="white-space: pre-wrap; color: #000000;">${message.content}</div>` : ''}
                            `;
                            break;
                            
                        default:
                            if (message.media.error) {
                                messageContent = `
                                    <div class="message-media mb-2">
                                        <div class="media-error p-2 border rounded">
                                            <i class="fas fa-exclamation-triangle text-warning me-2"></i>
                                            ${message.media.error}
                                        </div>
                                    </div>
                                    ${message.content ? `<div class="message-text" style="white-space: pre-wrap; color: #000000;">${message.content}</div>` : ''}
                                `;
                            } else {
                                messageContent = `<div class="message-text">${message.content || 'Mídia não suportada'}</div>`;
                            }
                    }
                } else {
                    // Mensagem de texto simples
                    messageContent = `<div class="message-text" style="white-space: pre-wrap; color: #000000;">${message.content}</div>`;
                }
                
                messageDiv.innerHTML = `
                    <div class="message-bubble ${isIncoming ? 'incoming' : 'outgoing'} p-3 rounded shadow-sm" 
                         style="max-width: 75%; background-color: ${isIncoming ? '#ffffff' : '#dcf8c6'}; word-break: break-word; color: #000000;">
                        ${messageContent}
                        <div class="d-flex justify-content-end align-items-center mt-1">
                            <small class="text-muted me-1">${time}</small>
                            ${statusIcon}
                        </div>
                    </div>
                `;
                
                messagesContainer.appendChild(messageDiv);
            });
        });
        
        // Rolar para o final da conversa
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    groupMessagesByDate(messages) {
        const groups = {};
        
        messages.forEach(message => {
            const date = new Date(message.createdAt).toLocaleDateString('pt-BR');
            if (!groups[date]) {
                groups[date] = [];
            }
            groups[date].push(message);
        });
        
        return groups;
    }

    getMessageStatusIcon(status) {
        switch(status) {
            case 'sent':
                return '<i class="fas fa-check text-muted small"></i>';
            case 'delivered':
                return '<i class="fas fa-check-double text-muted small"></i>';
            case 'read':
                return '<i class="fas fa-check-double text-primary small"></i>';
            case 'failed':
                return '<i class="fas fa-exclamation-circle text-danger small"></i>';
            default:
                return '<i class="fas fa-clock text-muted small"></i>';
        }
    }

    formatMessageDate(date) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        
        if (messageDate.getTime() === today.getTime()) {
            return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        } else if (messageDate.getTime() === yesterday.getTime()) {
            return 'Ontem';
        } else {
            return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        }
    }

    async sendMessage() {
        if (!this.selectedContact) return;
        
        const messageInput = document.getElementById('message-input');
        if (!messageInput || !messageInput.value.trim()) return;
        
        const messageContent = messageInput.value.trim();
        messageInput.value = '';
        
        try {
            // Adicionar mensagem temporária à conversa
            const tempMessage = {
                _id: 'temp-' + Date.now(),
                content: messageContent,
                isOutgoing: true,
                status: 'pending',
                createdAt: new Date().toISOString()
            };
            
            if (!this.conversations[this.selectedContact._id]) {
                this.conversations[this.selectedContact._id] = [];
            }
            
            this.conversations[this.selectedContact._id].push(tempMessage);
            this.renderConversation(this.selectedContact._id);
            
            // Enviar mensagem para o servidor
            const response = await fetch('/api/messages/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    recipients: [this.selectedContact._id],
                    content: messageContent,
                    type: 'text'
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Atualizar status da mensagem temporária
                const sentMessage = result.data;
                const index = this.conversations[this.selectedContact._id].findIndex(m => m._id === tempMessage._id);
                
                if (index !== -1) {
                    this.conversations[this.selectedContact._id][index] = sentMessage;
                    this.renderConversation(this.selectedContact._id);
                }
            } else {
                console.error('Falha ao enviar mensagem:', result.message);
                this.showToast('Erro ao enviar mensagem', 'error');
                
                // Marcar mensagem como falha
                const index = this.conversations[this.selectedContact._id].findIndex(m => m._id === tempMessage._id);
                if (index !== -1) {
                    this.conversations[this.selectedContact._id][index].status = 'failed';
                    this.renderConversation(this.selectedContact._id);
                }
            }
        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
            this.showToast('Erro ao enviar mensagem', 'error');
        }
    }

    async markConversationAsRead(contactId) {
        try {
            await fetch(`/api/conversation/read/${contactId}`, {
                method: 'PUT'
            });
            
            // Atualizar contador de mensagens não lidas
            const contactItem = document.querySelector(`#contacts-list a[data-id="${contactId}"]`);
            if (contactItem) {
                const badge = contactItem.querySelector('.badge');
                if (badge) {
                    badge.remove();
                }
            }
        } catch (error) {
            console.error('Erro ao marcar mensagens como lidas:', error);
        }
    }

    connectToMessageEvents() {
        const eventSource = new EventSource('/api/messages/events');

        eventSource.onmessage = (event) => {
            const message = JSON.parse(event.data);
            this.handleNewMessage(message);
        };

        eventSource.onerror = (error) => {
            console.error('EventSource failed:', error);
            eventSource.close();
        };
    }

    handleNewMessage(message) {
        // Verificar se a mensagem é de um contato existente
        const contactId = message.sender._id || message.senderPhone;
        const existingContact = this.contacts.find(c => c._id === contactId || c.phone === message.senderPhone);
        
        if (existingContact) {
            // Atualizar último contato
            existingContact.lastMessage = message.content;
            existingContact.lastMessageDate = message.createdAt;
            existingContact.unreadCount = (existingContact.unreadCount || 0) + 1;
            
            // Se for o contato selecionado, adicionar à conversa
            if (this.selectedContact && (this.selectedContact._id === contactId || this.selectedContact.phone === message.senderPhone)) {
                if (!this.conversations[contactId]) {
                    this.conversations[contactId] = [];
                }
                
                this.conversations[contactId].push(message);
                this.renderConversation(contactId);
                this.markConversationAsRead(contactId);
            }
        } else {
            // Novo contato, recarregar lista
            this.loadContacts();
        }
        
        // Reordenar e renderizar contatos
        this.contacts.sort((a, b) => {
            const dateA = a.lastMessageDate ? new Date(a.lastMessageDate) : new Date(0);
            const dateB = b.lastMessageDate ? new Date(b.lastMessageDate) : new Date(0);
            return dateB - dateA;
        });
        
        this.renderContacts();
    }

    showToast(message, type = 'info') {
        if (this.dashboard && this.dashboard.showToast) {
            this.dashboard.showToast(message, type);
        } else {
            console.log(`Toast: ${message} (${type})`);
        }
    }
}

// Initialize chat interface when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check if dashboard manager exists
    if (window.dashboardManager) {
        window.chatInterfaceManager = new ChatInterfaceManager(window.dashboardManager);
    }
});

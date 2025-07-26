// routes/index.js
const express = require('express');
const router = express.Router();

// Importa os módulos de rota
const authRoutes = require('./auth');
const whatsappRoutes = require('./whatsapp');
const messagesRoutes = require('./messages');
const contactsRoutes = require('./contacts');
const diagnosticsRoutes = require('./diagnostics');
const templatesRoutes = require('./templates');
const reportsRoutes = require('./reports');

// Middleware para verificar se o WhatsApp está conectado
const checkWhatsAppConnection = async (req, res, next) => {
    try {
        // Se já existe uma flag na sessão indicando que está conectado, prossegue
        if (req.session && req.session.whatsappConnected) {
            return next();
        }
        
        // Caso contrário, verifica o status atual
        const WhatsAppService = require('../services/WhatsAppService');
        const status = await WhatsAppService.getStatus();
        
        if (status === 'CONNECTED') {
            // Se estiver conectado, salva na sessão e prossegue
            req.session.whatsappConnected = true;
            return next();
        } else {
            // Se não estiver conectado, redireciona para a página de conexão
            return res.redirect('/connection');
        }
    } catch (error) {
        console.error('Erro ao verificar conexão do WhatsApp:', error);
        return res.redirect('/connection');
    }
};

// Rotas de Páginas (Views)
// Rota para a página de conexão (já existente)
router.get('/connection', (req, res) => {
    res.render('pages/connection', {
        title: 'WhatsApp Dispara - Conexão',
        connectionStatus: 'Aguardando inicialização do WhatsApp...',
        statusClass: 'status-pending'
    });
});

// Rota principal do dashboard, renderizando o layout e o módulo 'messages' por padrão
router.get('/', checkWhatsAppConnection, (req, res) => {
    res.render('dashboard', {
        currentPage: 'messages',
        connectionStatus: 'Conectado',
        statusClass: 'status-connected'
    });
});

// Rota específica para /dashboard (mesma renderização da rota principal)
router.get('/dashboard', checkWhatsAppConnection, (req, res) => {
    res.render('dashboard', {
        currentPage: 'messages',
        connectionStatus: 'Conectado',
        statusClass: 'status-connected',
        targetSection: 'messages' // Seção padrão
    });
});

// Rota para seções específicas do dashboard via URL
router.get('/dashboard/:section', checkWhatsAppConnection, (req, res) => {
    // Lista de seções válidas
    const validSections = ['messages', 'contacts', 'templates', 'reports', 'diagnostics'];
    
    // Verificar se a seção solicitada é válida
    const section = validSections.includes(req.params.section) ? req.params.section : 'messages';
    
    res.render('dashboard', { 
        currentPage: 'dashboard',
        connectionStatus: 'Conectado', 
        statusClass: 'status-connected',
        targetSection: section
    });
});

// Rotas para as páginas modulares do dashboard
router.get('/messages', checkWhatsAppConnection, (req, res) => {
    res.render('dashboard', { 
        currentPage: 'messages', 
        connectionStatus: 'Conectado', 
        statusClass: 'status-connected' 
    });
});

router.get('/contacts', checkWhatsAppConnection, (req, res) => {
    res.render('dashboard', { 
        currentPage: 'contacts', 
        connectionStatus: 'Conectado', 
        statusClass: 'status-connected' 
    });
});

router.get('/diagnostics', checkWhatsAppConnection, (req, res) => {
    res.render('dashboard', { 
        currentPage: 'diagnostics', 
        connectionStatus: 'Conectado', 
        statusClass: 'status-connected' 
    });
});

router.get('/templates', checkWhatsAppConnection, (req, res) => {
    res.render('dashboard', { 
        currentPage: 'templates', 
        connectionStatus: 'Conectado', 
        statusClass: 'status-connected' 
    });
});

router.get('/reports', checkWhatsAppConnection, (req, res) => {
    res.render('dashboard', { 
        currentPage: 'reports', 
        connectionStatus: 'Conectado', 
        statusClass: 'status-connected' 
    });
});

// Rotas de API (Chamadas dos Métodos do Controller)
// Cada módulo de rota (ex: messagesRoutes) já deve conter as rotas específicas para seus controllers.
router.use('/api/auth', authRoutes);
router.use('/api/whatsapp', whatsappRoutes);
router.use('/api/messages', messagesRoutes);
router.use('/api/contacts', contactsRoutes);
router.use('/api/diagnostics', diagnosticsRoutes);
router.use('/api/templates', templatesRoutes);
router.use('/api/reports', reportsRoutes);

module.exports = router;

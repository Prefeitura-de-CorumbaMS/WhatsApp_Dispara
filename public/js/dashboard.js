// Dashboard JavaScript
class DashboardManager {
    constructor(initialSection = 'messages') {
        // Usar seção passada ou recuperar do localStorage
        const savedSection = localStorage.getItem('lastSection');
        this.currentSection = initialSection || savedSection || 'messages';
        
        this.selectedContacts = new Set();
        this.contacts = [];
        this.templates = [];
        this.stats = {};
        
        // Adicionar propriedade para rastrear carregamentos
        this.loadedScripts = new Set();
        this.sectionLoaded = {
            messages: false,
            contacts: false,
            templates: false,
            reports: false,
            diagnostics: false
        };
        
        this.initializeElements();
        this.bindEvents();
        this.loadInitialData();
        
        // Pré-carregar scripts críticos
        this.preloadScripts();
    }

    initializeElements() {
        this.elements = {
            // Navigation
            navLinks: document.querySelectorAll('.nav-link[data-section]'),
            
            // Sections
            sections: document.querySelectorAll('.content-section'),
            
            // Message form
            messageForm: document.getElementById('messageForm'),
            messageContent: document.getElementById('messageContent'),
            mediaFile: document.getElementById('mediaFile'),
            scheduledFor: document.getElementById('scheduledFor'),
            charCount: document.getElementById('charCount'),
            
            // Contact selection
            contactSearch: document.getElementById('contactSearch'),
            tagFilter: document.getElementById('tagFilter'),
            groupFilter: document.getElementById('groupFilter'),
            selectAll: document.getElementById('selectAll'),
            contactsList: document.getElementById('contactsList'),
            selectedCount: document.getElementById('selectedCount'),
            
            // Stats
            totalSent: document.getElementById('totalSent'),
            totalDelivered: document.getElementById('totalDelivered'),
            totalRead: document.getElementById('totalRead'),
            totalFailed: document.getElementById('totalFailed'),
            
            // Modals
            loadingModal: new bootstrap.Modal(document.getElementById('loadingModal'))
        };
    }

    bindEvents() {
        // Navigation
        this.elements.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.dataset.section;
                this.showSection(section);
            });
        });
        
        // Suporte para botões voltar/avançar do navegador
        window.addEventListener('popstate', (e) => {
            // Extrair seção da URL atual
            const path = window.location.pathname;
            const match = path.match(/\/dashboard\/([\w-]+)/);
            if (match && match[1]) {
                this.showSection(match[1]);
            } else {
                this.showSection('messages'); // Fallback para seção padrão
            }
        });

        // Message form
        this.elements.messageForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendMessage();
        });

        // Character counter
        this.elements.messageContent.addEventListener('input', () => {
            this.updateCharCount();
        });

        // Contact selection
        this.elements.contactSearch.addEventListener('input', () => {
            this.filterContacts();
        });

        this.elements.tagFilter.addEventListener('change', () => {
            this.filterContacts();
        });

        this.elements.groupFilter.addEventListener('change', () => {
            this.filterContacts();
        });

        this.elements.selectAll.addEventListener('change', () => {
            this.toggleSelectAll();
        });

        // Auto-refresh stats
        setInterval(() => {
            this.loadStats();
        }, 30000); // Every 30 seconds
        
        // Iniciar na seção correta após binding de eventos
        setTimeout(() => {
            this.showSection(this.currentSection);
        }, 100);
    }

    async loadInitialData() {
        // Remove loading modal for quick initial data load
        // Only show loading for operations that take significant time
        
        try {
            await Promise.all([
                this.loadStats(),
                this.loadContacts(),
                this.loadFilters()
            ]);
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showToast('Erro ao carregar dados iniciais', 'error');
        }
    }

    async loadStats() {
        try {
            const response = await fetch('/api/messages/stats/overview');
            const result = await response.json();
            
            if (result.success) {
                this.stats = result.data;
                this.updateStatsDisplay();
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    updateStatsDisplay() {
        this.elements.totalSent.textContent = this.stats.totalSent || 0;
        this.elements.totalDelivered.textContent = this.stats.totalDelivered || 0;
        this.elements.totalRead.textContent = this.stats.totalRead || 0;
        this.elements.totalFailed.textContent = this.stats.totalFailed || 0;
    }

    async loadContacts() {
        try {
            const response = await fetch('/api/contacts?limit=1000');
            const result = await response.json();
            
            if (result.success) {
                this.contacts = result.data.contacts;
                this.renderContacts();
            }
        } catch (error) {
            console.error('Error loading contacts:', error);
        }
    }

    async loadFilters() {
        try {
            const response = await fetch('/api/contacts?limit=1');
            const result = await response.json();
            
            if (result.success && result.data.filters) {
                this.populateFilters(result.data.filters);
            }
        } catch (error) {
            console.error('Error loading filters:', error);
        }
    }

    populateFilters(filters) {
        // Populate tag filter
        this.elements.tagFilter.innerHTML = '<option value="">Todas as tags</option>';
        filters.tags.forEach(tag => {
            const option = document.createElement('option');
            option.value = tag;
            option.textContent = tag;
            this.elements.tagFilter.appendChild(option);
        });

        // Populate group filter
        this.elements.groupFilter.innerHTML = '<option value="">Todos os grupos</option>';
        filters.groups.forEach(group => {
            const option = document.createElement('option');
            option.value = group;
            option.textContent = group;
            this.elements.groupFilter.appendChild(option);
        });
    }

    renderContacts() {
        const filteredContacts = this.getFilteredContacts();
        
        this.elements.contactsList.innerHTML = '';
        
        if (filteredContacts.length === 0) {
            this.elements.contactsList.innerHTML = `
                <div class="text-center text-muted py-3">
                    <i class="bi bi-people"></i>
                    <p class="mb-0">Nenhum contato encontrado</p>
                </div>
            `;
            return;
        }

        filteredContacts.forEach(contact => {
            const contactItem = document.createElement('div');
            contactItem.className = 'contact-item d-flex align-items-center';
            contactItem.innerHTML = `
                <div class="form-check me-2">
                    <input class="form-check-input contact-checkbox" type="checkbox" 
                           value="${contact._id}" id="contact-${contact._id}"
                           ${this.selectedContacts.has(contact._id) ? 'checked' : ''}>
                </div>
                <div class="flex-grow-1">
                    <div class="fw-medium">${contact.name}</div>
                    <small class="text-muted">${contact.phone}</small>
                    ${contact.tags.length > 0 ? `
                        <div class="mt-1">
                            ${contact.tags.map(tag => `<span class="badge bg-secondary me-1">${tag}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
            `;

            const checkbox = contactItem.querySelector('.contact-checkbox');
            checkbox.addEventListener('change', () => {
                this.toggleContactSelection(contact._id, checkbox.checked);
            });

            this.elements.contactsList.appendChild(contactItem);
        });

        this.updateSelectedCount();
    }

    getFilteredContacts() {
        const search = this.elements.contactSearch.value.toLowerCase();
        const selectedTag = this.elements.tagFilter.value;
        const selectedGroup = this.elements.groupFilter.value;

        return this.contacts.filter(contact => {
            const matchesSearch = !search || 
                contact.name.toLowerCase().includes(search) ||
                contact.phone.includes(search);
            
            const matchesTag = !selectedTag || contact.tags.includes(selectedTag);
            const matchesGroup = !selectedGroup || contact.groups.includes(selectedGroup);

            return matchesSearch && matchesTag && matchesGroup;
        });
    }

    filterContacts() {
        this.renderContacts();
    }

    toggleContactSelection(contactId, selected) {
        if (selected) {
            this.selectedContacts.add(contactId);
        } else {
            this.selectedContacts.delete(contactId);
        }
        this.updateSelectedCount();
        this.updateSelectAllState();
    }

    toggleSelectAll() {
        const isChecked = this.elements.selectAll.checked;
        const filteredContacts = this.getFilteredContacts();

        if (isChecked) {
            filteredContacts.forEach(contact => {
                this.selectedContacts.add(contact._id);
            });
        } else {
            filteredContacts.forEach(contact => {
                this.selectedContacts.delete(contact._id);
            });
        }

        this.renderContacts();
    }

    updateSelectAllState() {
        const filteredContacts = this.getFilteredContacts();
        const selectedFiltered = filteredContacts.filter(contact => 
            this.selectedContacts.has(contact._id)
        );

        if (selectedFiltered.length === 0) {
            this.elements.selectAll.indeterminate = false;
            this.elements.selectAll.checked = false;
        } else if (selectedFiltered.length === filteredContacts.length) {
            this.elements.selectAll.indeterminate = false;
            this.elements.selectAll.checked = true;
        } else {
            this.elements.selectAll.indeterminate = true;
            this.elements.selectAll.checked = false;
        }
    }

    updateSelectedCount() {
        this.elements.selectedCount.textContent = this.selectedContacts.size;
    }

    updateCharCount() {
        const count = this.elements.messageContent.value.length;
        this.elements.charCount.textContent = count;
        
        if (count > 1000) {
            this.elements.charCount.className = 'text-warning';
        } else if (count > 1500) {
            this.elements.charCount.className = 'text-danger';
        } else {
            this.elements.charCount.className = 'text-muted';
        }
    }

    async sendMessage() {
        if (this.selectedContacts.size === 0) {
            this.showToast('Selecione pelo menos um contato', 'warning');
            return;
        }

        const content = this.elements.messageContent.value.trim();
        if (!content) {
            this.showToast('Digite o conteúdo da mensagem', 'warning');
            return;
        }

        this.showLoading('Enviando mensagem...', 'Processando envio para os contatos selecionados');

        try {
            const formData = new FormData();
            formData.append('content', content);
            formData.append('recipients', JSON.stringify([...this.selectedContacts]));
            
            if (this.elements.scheduledFor.value) {
                formData.append('scheduledFor', this.elements.scheduledFor.value);
            }

            if (this.elements.mediaFile.files[0]) {
                formData.append('media', this.elements.mediaFile.files[0]);
            }

            const response = await fetch('/api/messages/send', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                this.showToast('Mensagem enviada com sucesso!', 'success');
                this.resetMessageForm();
                this.loadStats(); // Refresh stats
            } else {
                this.showToast(result.message || 'Erro ao enviar mensagem', 'error');
            }
        } catch (error) {
            console.error('Send message error:', error);
            this.showToast('Erro ao enviar mensagem', 'error');
        } finally {
            this.elements.loadingModal.hide();
        }
    }

    resetMessageForm() {
        this.elements.messageForm.reset();
        this.selectedContacts.clear();
        this.updateSelectedCount();
        this.updateCharCount();
        this.renderContacts();
    }

    showSection(sectionName) {
        // Update navigation
        this.elements.navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.dataset.section === sectionName) {
                link.classList.add('active');
            }
        });

        // Show/hide sections
        this.elements.sections.forEach(section => {
            section.style.display = 'none';
        });

        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.style.display = 'block';
            this.currentSection = sectionName;
            
            // NOVO: Salvar seção atual no localStorage
            localStorage.setItem('lastSection', sectionName);
            
            // NOVO: Atualizar URL sem recarregar a página
            const newUrl = `/dashboard/${sectionName}`;
            if (window.location.pathname !== newUrl) {
                history.pushState(null, null, newUrl);
            }
            
            // Mostrar indicador de carregamento se a seção não estiver carregada
            if (!this.sectionLoaded[sectionName]) {
                this.showSectionLoading(targetSection);
            }
            
            // Load section-specific data
            this.loadSectionData(sectionName);
        }
    }

    // Novo método para mostrar indicador de carregamento na seção
    showSectionLoading(sectionElement) {
        // Verificar se já existe um indicador de carregamento
        if (sectionElement.querySelector('.section-loading')) return;
        
        // Criar indicador de carregamento
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'section-loading';
        loadingIndicator.innerHTML = `
            <div class="d-flex justify-content-center align-items-center" style="height: 200px;">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Carregando...</span>
                </div>
                <span class="ms-3">Carregando seção...</span>
            </div>
        `;
        sectionElement.appendChild(loadingIndicator);
    }

    // Novo método para esconder indicador de carregamento
    hideSectionLoading(sectionName) {
        const sectionElement = document.getElementById(`${sectionName}-section`);
        if (!sectionElement) return;
        
        const loadingIndicator = sectionElement.querySelector('.section-loading');
        if (loadingIndicator) {
            loadingIndicator.remove();
        }
        
        // Marcar seção como carregada
        this.sectionLoaded[sectionName] = true;
    }
    
    // Novo método para pré-carregar scripts críticos
    preloadScripts() {
        // Lista de scripts críticos para pré-carregar
        const scripts = [
            { src: '/js/contacts.js', key: 'contacts' },
            { src: '/js/templates.js', key: 'templates' }
        ];
        
        // Pré-carregar scripts em segundo plano
        scripts.forEach(script => {
            // Verificar se já foi carregado
            if (!document.querySelector(`script[src="${script.src}"]`) && !this.loadedScripts.has(script.key)) {
                const link = document.createElement('link');
                link.rel = 'preload';
                link.as = 'script';
                link.href = script.src;
                document.head.appendChild(link);
            }
        });
    }
    
    async loadSectionData(sectionName) {
        try {
            switch (sectionName) {
                case 'contacts':
                    await this.loadContactsSection();
                    break;
                case 'templates':
                    await this.loadTemplatesSection();
                    break;
                case 'reports':
                    await this.loadReportsSection();
                    break;
                case 'diagnostics':
                    await this.loadDiagnosticsSection();
                    break;
            }
        } finally {
            // Esconder indicador de carregamento quando terminar
            this.hideSectionLoading(sectionName);
        }
    }

    async loadContactsSection() {
        if (!this.contactsManager) {
            // Load contacts script if not already loaded
            if (!document.querySelector('script[src="/js/contacts.js"]')) {
                const script = document.createElement('script');
                script.src = '/js/contacts.js';
                script.onload = () => {
                    this.contactsManager = new ContactsManager(this);
                    contactsManager = this.contactsManager; // Global reference
                    this.contactsManager.loadContacts();
                };
                document.head.appendChild(script);
            } else {
                this.contactsManager = new ContactsManager(this);
                contactsManager = this.contactsManager; // Global reference
                this.contactsManager.loadContacts();
            }
        } else {
            this.contactsManager.loadContacts();
        }
    }

    async loadTemplatesSection() {
        if (!this.templatesManager) {
            // Load templates script if not already loaded
            if (!document.querySelector('script[src="/js/templates.js"]')) {
                const script = document.createElement('script');
                script.src = '/js/templates.js';
                script.onload = () => {
                    this.templatesManager = new TemplatesManager(this);
                    templatesManager = this.templatesManager; // Global reference
                    this.templatesManager.loadTemplates();
                };
                document.head.appendChild(script);
            } else {
                this.templatesManager = new TemplatesManager(this);
                templatesManager = this.templatesManager; // Global reference
                this.templatesManager.loadTemplates();
            }
        } else {
            this.templatesManager.loadTemplates();
        }
    }

    async loadReportsSection() {
        if (!this.reportsManager) {
            // Load Chart.js if not already loaded
            if (!window.Chart) {
                const chartScript = document.createElement('script');
                chartScript.src = 'https://cdn.jsdelivr.net/npm/chart.js';
                chartScript.onload = () => {
                    this.loadReportsScript();
                };
                document.head.appendChild(chartScript);
            } else {
                this.loadReportsScript();
            }
        } else {
            this.reportsManager.generateReport();
        }
    }

    loadReportsScript() {
        // Load reports script if not already loaded
        if (!document.querySelector('script[src="/js/reports.js"]')) {
            const script = document.createElement('script');
            script.src = '/js/reports.js';
            script.onload = () => {
                this.reportsManager = new ReportsManager(this);
                reportsManager = this.reportsManager; // Global reference
            };
            document.head.appendChild(script);
        } else {
            this.reportsManager = new ReportsManager(this);
            reportsManager = this.reportsManager; // Global reference
        }
    }

    async loadDiagnosticsSection() {
        if (!this.diagnosticsManager) {
            // Load diagnostics script if not already loaded
            if (!document.querySelector('script[src="/js/diagnostics.js"]')) {
                const script = document.createElement('script');
                script.src = '/js/diagnostics.js';
                script.onload = () => {
                    this.diagnosticsManager = new DiagnosticsManager(this);
                    diagnosticsManager = this.diagnosticsManager; // Global reference
                };
                document.head.appendChild(script);
            } else {
                this.diagnosticsManager = new DiagnosticsManager(this);
                diagnosticsManager = this.diagnosticsManager; // Global reference
            }
        } else {
            this.diagnosticsManager.refreshDiagnostics();
        }
    }

    showLoading(title = 'Carregando...', subtitle = 'Aguarde um momento') {
        document.getElementById('loadingText').textContent = title;
        document.getElementById('loadingSubtext').textContent = subtitle;
        this.elements.loadingModal.show();
    }

    showToast(message, type = 'info') {
        // Create toast container if it doesn't exist
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }

        // Create toast
        const toastId = 'toast-' + Date.now();
        const toastHtml = `
            <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="toast-header">
                    <i class="bi bi-${this.getToastIcon(type)} me-2 text-${type}"></i>
                    <strong class="me-auto">Notificação</strong>
                    <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
                </div>
                <div class="toast-body">
                    ${message}
                </div>
            </div>
        `;

        toastContainer.insertAdjacentHTML('beforeend', toastHtml);
        
        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement, {
            autohide: true,
            delay: type === 'error' ? 5000 : 3000
        });
        
        toast.show();

        // Remove toast element after it's hidden
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    }

    getToastIcon(type) {
        const icons = {
            success: 'check-circle-fill',
            error: 'exclamation-triangle-fill',
            warning: 'exclamation-triangle-fill',
            info: 'info-circle-fill'
        };
        return icons[type] || icons.info;
    }
}

// Global functions for navbar actions
function showConnectionStatus() {
    // Implementation for showing connection status modal
    console.log('Show connection status');
}

function confirmDisconnect() {
    if (confirm('Tem certeza que deseja voltar à tela de conexão?')) {
        window.location.href = '/';
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboardManager = new DashboardManager();
    
    // Add contacts script to head for dynamic loading
    const contactsScript = document.createElement('link');
    contactsScript.rel = 'preload';
    contactsScript.href = '/js/contacts.js';
    contactsScript.as = 'script';
    document.head.appendChild(contactsScript);
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && window.dashboardManager) {
        window.dashboardManager.loadStats();
    }
});

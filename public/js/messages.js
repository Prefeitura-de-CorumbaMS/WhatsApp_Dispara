// Messages Section JavaScript
class MessagesManager {
    constructor(dashboardManager) {
        this.dashboard = dashboardManager;
        this.contacts = [];
        this.selectedContacts = new Set();
        this.messages = [];
        this.currentPage = 1;
        this.totalPages = 1;
        
        this.initializeMessagesSection();
    }

    initializeMessagesSection() {
        this.bindMessagesEvents();
        this.loadInitialData();
    }

    bindMessagesEvents() {
        // Message form
        const messageForm = document.getElementById('message-form');
        if (messageForm) {
            messageForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.sendMessage();
            });
        }

        // Select all contacts checkbox
        const selectAllContacts = document.getElementById('selectAllContacts');
        if (selectAllContacts) {
            selectAllContacts.addEventListener('change', () => {
                this.toggleSelectAll(selectAllContacts.checked);
            });
        }

        // Clear media button
        const clearMedia = document.getElementById('clear-media');
        if (clearMedia) {
            clearMedia.addEventListener('click', () => {
                const mediaUpload = document.getElementById('media-upload');
                if (mediaUpload) {
                    mediaUpload.value = '';
                }
            });
        }
    }

    async loadInitialData() {
        try {
            await Promise.all([
                this.loadContacts(),
                this.loadRecentMessages()
            ]);
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showToast('Erro ao carregar dados iniciais', 'error');
        }
    }

    async loadContacts() {
        try {
            const response = await fetch('/api/whatsapp/contacts');
            const result = await response.json();
            
            if (result.success) {
                this.contacts = result.data.contacts;
                this.renderContacts();
            } else {
                console.error('Failed to load contacts:', result.message);
            }
        } catch (error) {
            console.error('Error loading contacts:', error);
        }
    }

    renderContacts() {
        const contactSelect = document.getElementById('contact-selection-select2');
        if (!contactSelect) return;

        if (this.contacts.length === 0) {
            contactSelect.innerHTML = '<option disabled>Nenhum contato encontrado</option>';
            return;
        }

        // Popula o select com os contatos
        contactSelect.innerHTML = this.contacts.map(contact =>
            `<option value="${contact.id._serialized}">${contact.name || contact.pushname} (${contact.id.user})</option>`
        ).join('');

        // Inicializa o Select2
        const select2Instance = $(contactSelect).select2({
            theme: 'bootstrap-5',
            placeholder: 'Selecione um ou mais contatos',
            closeOnSelect: false,
            width: '100%'
        });

        // Adiciona o evento de mudança para atualizar a lista interna
        select2Instance.on('change', () => {
            const selectedValues = $(contactSelect).val();
            this.updateSelectedContacts(selectedValues);
        });
    }

    updateSelectedContacts(selectedValues) {
        this.selectedContacts = new Set(selectedValues);
    }

    toggleSelectAll(select) {
        const contactSelection = document.getElementById('contact-selection');
        if (!contactSelection) return;
        
        Array.from(contactSelection.options).forEach(option => {
            option.selected = select;
        });
        
        if (select) {
            this.selectedContacts = new Set(this.contacts.map(contact => contact.id));
        } else {
            this.selectedContacts.clear();
        }
        
        // Update select2 if it's being used
        if (typeof $ !== 'undefined' && $.fn.select2) {
            $(contactSelection).trigger('change');
        }
    }

    async loadRecentMessages(page = 1) {
        try {
            const response = await fetch(`/api/messages?page=${page}&limit=10`);
            const result = await response.json();
            
            if (result.success) {
                this.messages = result.data.messages;
                this.currentPage = result.data.currentPage;
                this.totalPages = result.data.totalPages;
                this.renderMessages();
                this.renderPagination();
            }
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    }

    renderMessages() {
        const messagesTableBody = document.getElementById('messages-table-body');
        if (!messagesTableBody) return;
        
        if (this.messages.length === 0) {
            messagesTableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-4">
                        <div class="d-flex flex-column align-items-center">
                            <i class="bi bi-chat-dots text-muted mb-2" style="font-size: 2rem;"></i>
                            <span class="text-muted">Nenhuma mensagem encontrada</span>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        messagesTableBody.innerHTML = '';
        
        this.messages.forEach(message => {
            const row = document.createElement('tr');
            
            // Format date
            const messageDate = new Date(message.createdAt);
            const formattedDate = messageDate.toLocaleString('pt-BR');
            
            // Get recipient count
            const recipientCount = message.recipients ? message.recipients.length : 0;
            
            // Truncate message content if too long
            const truncatedContent = message.content.length > 50 
                ? message.content.substring(0, 50) + '...' 
                : message.content;
            
            // Determine status class and text
            let statusClass = 'bg-secondary';
            let statusText = 'Pendente';
            
            if (message.status === 'sent') {
                statusClass = 'bg-primary';
                statusText = 'Enviada';
            } else if (message.status === 'delivered') {
                statusClass = 'bg-success';
                statusText = 'Entregue';
            } else if (message.status === 'read') {
                statusClass = 'bg-info';
                statusText = 'Lida';
            } else if (message.status === 'failed') {
                statusClass = 'bg-danger';
                statusText = 'Falha';
            }
            
            row.innerHTML = `
                <td>${formattedDate}</td>
                <td>${recipientCount > 1 ? recipientCount + ' contatos' : message.recipients[0]?.name || 'Desconhecido'}</td>
                <td>${truncatedContent}</td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-primary view-message" data-id="${message._id}">
                        <i class="bi bi-eye"></i>
                    </button>
                </td>
            `;
            
            // Add event listener to view button
            const viewButton = row.querySelector('.view-message');
            viewButton.addEventListener('click', () => {
                this.viewMessage(message._id);
            });
            
            messagesTableBody.appendChild(row);
        });
    }

    renderPagination() {
        const paginationContainer = document.getElementById('messages-pagination');
        if (!paginationContainer || this.totalPages <= 1) {
            if (paginationContainer) paginationContainer.innerHTML = '';
            return;
        }
        
        let paginationHTML = '<nav><ul class="pagination">';
        
        // Previous button
        paginationHTML += `
            <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${this.currentPage - 1}">Anterior</a>
            </li>
        `;
        
        // Page numbers
        for (let i = 1; i <= this.totalPages; i++) {
            paginationHTML += `
                <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
        }
        
        // Next button
        paginationHTML += `
            <li class="page-item ${this.currentPage === this.totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${this.currentPage + 1}">Próximo</a>
            </li>
        `;
        
        paginationHTML += '</ul></nav>';
        paginationContainer.innerHTML = paginationHTML;
        
        // Add event listeners to pagination links
        const pageLinks = paginationContainer.querySelectorAll('.page-link');
        pageLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = parseInt(link.dataset.page);
                if (page && page !== this.currentPage && page >= 1 && page <= this.totalPages) {
                    this.loadRecentMessages(page);
                }
            });
        });
    }

    async viewMessage(messageId) {
        try {
            const response = await fetch(`/api/messages/${messageId}`);
            const result = await response.json();
            
            if (result.success) {
                const message = result.data;
                
                // Create modal HTML
                const modalHTML = `
                    <div class="modal fade" id="viewMessageModal" tabindex="-1" aria-hidden="true">
                        <div class="modal-dialog modal-lg">
                            <div class="modal-content">
                                <div class="modal-header">
                                    <h5 class="modal-title">Detalhes da Mensagem</h5>
                                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                </div>
                                <div class="modal-body">
                                    <div class="mb-3">
                                        <h6>Conteúdo:</h6>
                                        <div class="p-3 bg-light rounded">${message.content}</div>
                                    </div>
                                    ${message.mediaUrl ? `
                                        <div class="mb-3">
                                            <h6>Mídia:</h6>
                                            <div class="text-center">
                                                ${message.mediaType?.startsWith('image') 
                                                    ? `<img src="${message.mediaUrl}" class="img-fluid rounded" style="max-height: 300px;">` 
                                                    : `<a href="${message.mediaUrl}" target="_blank" class="btn btn-sm btn-outline-primary">
                                                        <i class="bi bi-download me-2"></i>Baixar Mídia
                                                      </a>`
                                                }
                                            </div>
                                        </div>
                                    ` : ''}
                                    <div class="mb-3">
                                        <h6>Enviada em:</h6>
                                        <p>${new Date(message.createdAt).toLocaleString('pt-BR')}</p>
                                    </div>
                                    <div class="mb-3">
                                        <h6>Destinatários:</h6>
                                        <div class="table-responsive">
                                            <table class="table table-sm table-striped">
                                                <thead>
                                                    <tr>
                                                        <th>Nome</th>
                                                        <th>Telefone</th>
                                                        <th>Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    ${message.recipients.map(recipient => `
                                                        <tr>
                                                            <td>${recipient.name || 'N/A'}</td>
                                                            <td>${recipient.phone}</td>
                                                            <td>
                                                                <span class="badge ${this.getStatusClass(recipient.status)}">
                                                                    ${this.getStatusText(recipient.status)}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    `).join('')}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                
                // Append modal to body
                const modalContainer = document.createElement('div');
                modalContainer.innerHTML = modalHTML;
                document.body.appendChild(modalContainer);
                
                // Show modal
                const modal = new bootstrap.Modal(document.getElementById('viewMessageModal'));
                modal.show();
                
                // Remove modal from DOM after it's hidden
                document.getElementById('viewMessageModal').addEventListener('hidden.bs.modal', function () {
                    document.body.removeChild(modalContainer);
                });
            }
        } catch (error) {
            console.error('Error viewing message:', error);
        }
    }

    getStatusClass(status) {
        switch (status) {
            case 'sent': return 'bg-primary';
            case 'delivered': return 'bg-success';
            case 'read': return 'bg-info';
            case 'failed': return 'bg-danger';
            default: return 'bg-secondary';
        }
    }

    getStatusText(status) {
        switch (status) {
            case 'sent': return 'Enviada';
            case 'delivered': return 'Entregue';
            case 'read': return 'Lida';
            case 'failed': return 'Falha';
            default: return 'Pendente';
        }
    }

    async sendMessage() {
        try {
            // Verificar se os elementos existem
            const messageContent = document.getElementById('message-content');
            const mediaUpload = document.getElementById('media-upload');
            const contactSelection = document.getElementById('contact-selection');
            
            if (!messageContent) {
                console.warn('Elemento message-content não encontrado');
                this.showToast('Erro ao enviar mensagem: formulário incompleto', 'error');
                return;
            }
            
            if (!contactSelection) {
                console.warn('Elemento contact-selection não encontrado');
                this.showToast('Erro ao enviar mensagem: seletor de contatos não encontrado', 'error');
                return;
            }
            
            const content = messageContent.value.trim();
            
            // Verificar se selectedOptions existe antes de usar
            let recipients = [];
            if (contactSelection.selectedOptions) {
                const selectedOptions = Array.from(contactSelection.selectedOptions);
                recipients = selectedOptions.map(option => option.value);
            } else if (contactSelection.options) {
                // Fallback para browsers que não suportam selectedOptions
                const options = Array.from(contactSelection.options);
                recipients = options.filter(option => option.selected).map(option => option.value);
            }
            
            if (!content) {
                this.showToast('Digite o conteúdo da mensagem', 'warning');
                return;
            }
            
            if (recipients.length === 0) {
                this.showToast('Selecione pelo menos um contato', 'warning');
                return;
            }
            
            this.showLoading('Enviando mensagem...', 'Processando envio para os contatos selecionados');
            
            const formData = new FormData();
            formData.append('content', content);
            formData.append('recipients', JSON.stringify(recipients));
            
            // Verificar se mediaUpload existe e tem arquivos
            if (mediaUpload && mediaUpload.files && mediaUpload.files.length > 0) {
                formData.append('media', mediaUpload.files[0]);
            }
            
            const response = await fetch('/api/messages/send', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showToast('Mensagem enviada com sucesso!', 'success');
                this.resetMessageForm();
                this.loadRecentMessages(); // Refresh messages list
            } else {
                this.showToast(result.message || 'Erro ao enviar mensagem', 'error');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            this.showToast('Erro ao enviar mensagem', 'error');
        } finally {
            this.hideLoading();
        }
    }

    resetMessageForm() {
        const messageForm = document.getElementById('message-form');
        const messageContent = document.getElementById('message-content');
        const mediaUpload = document.getElementById('media-upload');
        const contactSelection = document.getElementById('contact-selection');
        
        if (messageForm) messageForm.reset();
        if (messageContent) messageContent.value = '';
        if (mediaUpload) mediaUpload.value = '';
        
        if (contactSelection) {
            Array.from(contactSelection.options).forEach(option => {
                option.selected = false;
            });
            
            // Update select2 if it's being used
            if (typeof $ !== 'undefined' && $.fn.select2) {
                $(contactSelection).val(null).trigger('change');
            }
        }
        
        this.selectedContacts.clear();
    }

    showLoading(title = 'Carregando...', subtitle = 'Aguarde um momento') {
        // Check if dashboard manager is available
        if (this.dashboard && this.dashboard.showLoading) {
            this.dashboard.showLoading(title, subtitle);
            return;
        }
        
        // Fallback loading implementation
        const loadingModalHTML = `
            <div class="modal fade" id="loadingModal" tabindex="-1" data-bs-backdrop="static" data-bs-keyboard="false">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-body text-center p-4">
                            <div class="spinner-border text-primary mb-3" role="status">
                                <span class="visually-hidden">Carregando...</span>
                            </div>
                            <h5 class="modal-title">${title}</h5>
                            <p class="text-muted mb-0">${subtitle}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Check if loading modal already exists
        let loadingModal = document.getElementById('loadingModal');
        if (!loadingModal) {
            const modalContainer = document.createElement('div');
            modalContainer.innerHTML = loadingModalHTML;
            document.body.appendChild(modalContainer);
            loadingModal = document.getElementById('loadingModal');
        }
        
        // Show modal
        const bsModal = new bootstrap.Modal(loadingModal);
        bsModal.show();
    }

    hideLoading() {
        // Check if dashboard manager is available
        if (this.dashboard && this.dashboard.elements && this.dashboard.elements.loadingModal) {
            this.dashboard.elements.loadingModal.hide();
            return;
        }
        
        // Fallback hide loading
        const loadingModal = document.getElementById('loadingModal');
        if (loadingModal) {
            const bsModal = bootstrap.Modal.getInstance(loadingModal);
            if (bsModal) bsModal.hide();
        }
    }

    showToast(message, type = 'info') {
        // Check if dashboard manager is available
        if (this.dashboard && this.dashboard.showToast) {
            this.dashboard.showToast(message, type);
            return;
        }
        
        // Fallback toast implementation
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
            document.body.appendChild(toastContainer);
        }
        
        const toastId = 'toast-' + Date.now();
        const toastHTML = `
            <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="toast-header">
                    <i class="bi ${this.getToastIcon(type)} me-2 text-${type}"></i>
                    <strong class="me-auto">Notificação</strong>
                    <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
                </div>
                <div class="toast-body">
                    ${message}
                </div>
            </div>
        `;
        
        const toastElement = document.createElement('div');
        toastElement.innerHTML = toastHTML;
        toastContainer.appendChild(toastElement.firstChild);
        
        const toast = new bootstrap.Toast(document.getElementById(toastId), {
            delay: 5000
        });
        toast.show();
    }

    getToastIcon(type) {
        switch (type) {
            case 'success': return 'bi-check-circle-fill';
            case 'warning': return 'bi-exclamation-triangle-fill';
            case 'error': return 'bi-x-circle-fill';
            default: return 'bi-info-circle-fill';
        }
    }
}

// Initialize messages manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check if dashboard manager exists
    if (window.dashboardManager) {
        window.messagesManager = new MessagesManager(window.dashboardManager);
    } else {
        window.messagesManager = new MessagesManager();
    }
});

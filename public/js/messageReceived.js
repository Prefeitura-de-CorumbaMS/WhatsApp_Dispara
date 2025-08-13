// Message Received JavaScript
class MessageReceivedManager {
    constructor(dashboardManager) {
        this.dashboard = dashboardManager;
        this.receivedMessages = [];
        this.currentPage = 1;
        this.totalPages = 1;
        this.messageStatus = 'all'; // 'all', 'open', 'archived'
        
        this.initializeMessageReceivedSection();
    }

    initializeMessageReceivedSection() {
        this.bindMessageReceivedEvents();
        this.loadInitialData();
        this.connectToMessageEvents();
    }

    bindMessageReceivedEvents() {
        // Botões de filtro
        const allMessagesBtn = document.getElementById('show-all-messages');
        const openMessagesBtn = document.getElementById('show-open-messages');
        const archivedMessagesBtn = document.getElementById('show-archived-messages');

        if (allMessagesBtn) {
            allMessagesBtn.addEventListener('click', () => {
                this.setActiveFilterButton(allMessagesBtn);
                this.messageStatus = 'all';
                this.loadReceivedMessages();
            });
        }

        if (openMessagesBtn) {
            openMessagesBtn.addEventListener('click', () => {
                this.setActiveFilterButton(openMessagesBtn);
                this.messageStatus = 'open';
                this.loadReceivedMessages();
            });
        }

        if (archivedMessagesBtn) {
            archivedMessagesBtn.addEventListener('click', () => {
                this.setActiveFilterButton(archivedMessagesBtn);
                this.messageStatus = 'archived';
                this.loadReceivedMessages();
            });
        }
    }

    setActiveFilterButton(activeButton) {
        // Remover classe ativa de todos os botões
        const filterButtons = document.querySelectorAll('#show-all-messages, #show-open-messages, #show-archived-messages');
        filterButtons.forEach(button => {
            button.classList.remove('btn-info', 'active');
            button.classList.add('btn-light');
        });

        // Adicionar classe ativa ao botão selecionado
        activeButton.classList.remove('btn-light');
        activeButton.classList.add('btn-info', 'active');
    }

    async loadInitialData() {
        try {
            await this.loadReceivedMessages();
        } catch (error) {
            console.error('Error loading initial data:', error);
            this.showToast('Erro ao carregar mensagens recebidas', 'error');
        }
    }

    async loadReceivedMessages(page = 1) {
        try {
            const tableBody = document.getElementById('received-messages-table-body');
            if (!tableBody) return;

            // Mostrar indicador de carregamento
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-4">
                        <div class="d-flex flex-column align-items-center">
                            <div class="spinner-border text-info mb-2" role="status">
                                <span class="visually-hidden">Carregando...</span>
                            </div>
                            <span class="text-muted">Carregando mensagens recebidas...</span>
                        </div>
                    </td>
                </tr>
            `;

            // Construir parâmetros da consulta
            const params = new URLSearchParams({
                page: page,
                limit: 10,
                status: this.messageStatus
            });

            const response = await fetch(`/api/messages/received?${params}`);
            const result = await response.json();
            
            if (result.success) {
                this.receivedMessages = result.data.messages;
                this.currentPage = result.data.pagination.page;
                this.totalPages = result.data.pagination.pages;
                this.renderReceivedMessages();
                this.renderReceivedPagination();
            } else {
                console.error('Failed to load received messages:', result.message);
                this.showToast('Erro ao carregar mensagens recebidas', 'error');
            }
        } catch (error) {
            console.error('Error loading received messages:', error);
            this.showToast('Erro ao carregar mensagens recebidas', 'error');
        }
    }

    connectToMessageEvents() {
        const eventSource = new EventSource('/api/messages/events');

        eventSource.onmessage = (event) => {
            const message = JSON.parse(event.data);
            this.prependNewMessage(message);
        };

        eventSource.onerror = (error) => {
            console.error('EventSource failed:', error);
            eventSource.close();
        };
    }

    prependNewMessage(message) {
        const tableBody = document.getElementById('received-messages-table-body');
        if (!tableBody) return;

        // Remove a mensagem 'Nenhuma mensagem encontrada' se existir
        const noMessagesRow = tableBody.querySelector('td[colspan="5"]');
        if (noMessagesRow) {
            tableBody.innerHTML = '';
        }

        const newRow = document.createElement('tr');
        const formattedDate = new Date(message.timestamp * 1000).toLocaleString('pt-BR');
        const senderPhone = message.from.split('@')[0];

        newRow.innerHTML = `
            <td>${formattedDate}</td>
            <td>${senderPhone}</td>
            <td>${message.body}</td>
            <td><span class="badge bg-info">Nova</span></td>
            <td class="text-end">
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-sm btn-outline-primary" title="Visualizar">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-secondary" title="Arquivar">
                        <i class="fas fa-archive"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-success" title="Responder">
                        <i class="fas fa-reply"></i>
                    </button>
                </div>
            </td>
        `;

        tableBody.prepend(newRow);
    }

    renderReceivedMessages() {
        const tableBody = document.getElementById('received-messages-table-body');
        if (!tableBody) return;
        
        if (this.receivedMessages.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-4">
                        <div class="d-flex flex-column align-items-center">
                            <i class="fas fa-inbox text-muted mb-2" style="font-size: 2rem;"></i>
                            <span class="text-muted">Nenhuma mensagem recebida encontrada</span>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = '';
        
        this.receivedMessages.forEach(message => {
            const row = document.createElement('tr');
            
            // Format date
            const messageDate = new Date(message.createdAt);
            const formattedDate = messageDate.toLocaleString('pt-BR');
            
            // Truncate message content if too long
            const truncatedContent = message.content.length > 50 
                ? message.content.substring(0, 50) + '...' 
                : message.content;
            
            // Determine status class and text
            let statusClass = 'bg-info';
            let statusText = 'Nova';
            
            if (message.isRead) {
                statusClass = 'bg-success';
                statusText = 'Lida';
            } else if (message.isArchived) {
                statusClass = 'bg-secondary';
                statusText = 'Arquivada';
            }
            
            row.innerHTML = `
                <td>${formattedDate}</td>
                <td>${message.sender ? message.sender.name : message.senderPhone}</td>
                <td>${truncatedContent}</td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
                <td class="text-end">
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-sm btn-outline-primary view-received-message" data-id="${message._id}">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${!message.isArchived ? 
                            `<button class="btn btn-sm btn-outline-secondary archive-message" data-id="${message._id}">
                                <i class="fas fa-archive"></i>
                            </button>` : 
                            `<button class="btn btn-sm btn-outline-info unarchive-message" data-id="${message._id}">
                                <i class="fas fa-inbox"></i>
                            </button>`
                        }
                        <button class="btn btn-sm btn-outline-success reply-message" data-id="${message._id}">
                            <i class="fas fa-reply"></i>
                        </button>
                    </div>
                </td>
            `;
            
            // Add event listeners to buttons
            const viewButton = row.querySelector('.view-received-message');
            if (viewButton) {
                viewButton.addEventListener('click', () => {
                    this.viewReceivedMessage(message._id);
                });
            }
            
            const archiveButton = row.querySelector('.archive-message');
            if (archiveButton) {
                archiveButton.addEventListener('click', () => {
                    this.archiveMessage(message._id);
                });
            }
            
            const unarchiveButton = row.querySelector('.unarchive-message');
            if (unarchiveButton) {
                unarchiveButton.addEventListener('click', () => {
                    this.unarchiveMessage(message._id);
                });
            }
            
            const replyButton = row.querySelector('.reply-message');
            if (replyButton) {
                replyButton.addEventListener('click', () => {
                    this.replyToMessage(message);
                });
            }
            
            tableBody.appendChild(row);
        });
    }

    renderReceivedPagination() {
        const paginationContainer = document.getElementById('received-messages-pagination');
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
                    this.loadReceivedMessages(page);
                }
            });
        });
    }

    async viewReceivedMessage(messageId) {
        try {
            const response = await fetch(`/api/messages/received/${messageId}`);
            const result = await response.json();
            
            if (result.success) {
                const message = result.data;
                
                // Marcar mensagem como lida se ainda não estiver
                if (!message.isRead) {
                    this.markAsRead(messageId);
                }
                
                // Create modal HTML
                const modalHTML = `
                    <div class="modal fade" id="viewReceivedMessageModal" tabindex="-1" aria-hidden="true">
                        <div class="modal-dialog modal-lg">
                            <div class="modal-content">
                                <div class="modal-header">
                                    <h5 class="modal-title">Mensagem Recebida</h5>
                                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                </div>
                                <div class="modal-body">
                                    <div class="mb-3">
                                        <h6>De:</h6>
                                        <p>${message.sender ? message.sender.name : 'Desconhecido'} (${message.senderPhone})</p>
                                    </div>
                                    <div class="mb-3">
                                        <h6>Recebida em:</h6>
                                        <p>${new Date(message.createdAt).toLocaleString('pt-BR')}</p>
                                    </div>
                                    <div class="mb-3">
                                        <h6>Mensagem:</h6>
                                        <div class="p-3 bg-light rounded">${message.content}</div>
                                    </div>
                                    ${message.media && message.media.url ? `
                                        <div class="mb-3">
                                            <h6>Mídia:</h6>
                                            <div class="text-center">
                                                ${message.media.mimeType?.startsWith('image') 
                                                    ? `<img src="${message.media.url}" class="img-fluid rounded clickable-image" 
                                                           style="max-height: 300px; cursor: pointer;" 
                                                           data-message-id="${message._id}"
                                                           onclick="window.messageReceivedManager.openImageViewer('${message._id}')">` 
                                                    : `<a href="${message.media.url}" target="_blank" class="btn btn-sm btn-outline-primary">
                                                        <i class="fas fa-download me-2"></i>Baixar Mídia
                                                      </a>`
                                                }
                                            </div>
                                        </div>
                                    ` : ''}
                                </div>
                                <div class="modal-footer">
                                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
                                    <button type="button" class="btn btn-success" id="modal-reply-btn">
                                        <i class="fas fa-reply me-2"></i>Responder
                                    </button>
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
                const modal = new bootstrap.Modal(document.getElementById('viewReceivedMessageModal'));
                modal.show();
                
                // Add reply button event listener
                const replyButton = document.getElementById('modal-reply-btn');
                if (replyButton) {
                    replyButton.addEventListener('click', () => {
                        modal.hide();
                        this.replyToMessage(message);
                    });
                }
                
                // Remove modal from DOM after it's hidden
                document.getElementById('viewReceivedMessageModal').addEventListener('hidden.bs.modal', function () {
                    document.body.removeChild(modalContainer);
                });
            }
        } catch (error) {
            console.error('Error viewing received message:', error);
            this.showToast('Erro ao visualizar mensagem', 'error');
        }
    }

    async markAsRead(messageId) {
        try {
            const response = await fetch(`/api/messages/received/${messageId}/read`, {
                method: 'PUT'
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Atualizar a mensagem na lista
                this.loadReceivedMessages(this.currentPage);
            }
        } catch (error) {
            console.error('Error marking message as read:', error);
        }
    }

    async archiveMessage(messageId) {
        try {
            const response = await fetch(`/api/messages/received/${messageId}/archive`, {
                method: 'PUT'
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showToast('Mensagem arquivada com sucesso', 'success');
                this.loadReceivedMessages(this.currentPage);
            } else {
                this.showToast(result.message || 'Erro ao arquivar mensagem', 'error');
            }
        } catch (error) {
            console.error('Error archiving message:', error);
            this.showToast('Erro ao arquivar mensagem', 'error');
        }
    }

    async unarchiveMessage(messageId) {
        try {
            const response = await fetch(`/api/messages/received/${messageId}/unarchive`, {
                method: 'PUT'
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showToast('Mensagem desarquivada com sucesso', 'success');
                this.loadReceivedMessages(this.currentPage);
            } else {
                this.showToast(result.message || 'Erro ao desarquivar mensagem', 'error');
            }
        } catch (error) {
            console.error('Error unarchiving message:', error);
            this.showToast('Erro ao desarquivar mensagem', 'error');
        }
    }
    
    /**
     * Abre o visualizador de imagens com todas as imagens da conversa atual
     * @param {string} messageId - ID da mensagem cuja imagem foi clicada
     */
    async openImageViewer(messageId) {
        try {
            // Obter a mensagem atual para extrair o contato
            const response = await fetch(`/api/messages/received/${messageId}`);
            const result = await response.json();
            
            if (!result.success || !result.data) {
                console.error('Erro ao obter detalhes da mensagem');
                return;
            }
            
            const message = result.data;
            const contactPhone = message.senderPhone;
            
            if (!contactPhone) {
                console.error('Telefone do contato não encontrado');
                return;
            }
            
            // Buscar todas as mensagens com imagens da conversa com este contato
            const conversationResponse = await fetch(`/api/messages/conversation/${contactPhone}`);
            const conversationResult = await conversationResponse.json();
            
            if (!conversationResult.success || !conversationResult.data) {
                console.error('Erro ao carregar conversa');
                return;
            }
            
            // Filtrar apenas mensagens com mídia do tipo imagem
            const imageMessages = conversationResult.data.filter(msg => 
                msg.media && 
                msg.media.url && 
                msg.media.mimeType && 
                msg.media.mimeType.startsWith('image')
            );
            
            // Preparar array de imagens para o visualizador
            const images = imageMessages.map(msg => ({
                url: msg.media.url,
                id: msg._id,
                title: `Imagem de ${new Date(msg.createdAt).toLocaleString('pt-BR')}`,
                timestamp: new Date(msg.createdAt)
            }));
            
            // Ordenar imagens por data (mais recentes primeiro)
            images.sort((a, b) => b.timestamp - a.timestamp);
            
            // Encontrar o índice da imagem clicada
            let startIndex = 0;
            if (messageId) {
                const index = images.findIndex(img => img.id === messageId);
                if (index !== -1) startIndex = index;
            }
            
            // Abrir o visualizador de imagens
            if (window.imageViewer && images.length > 0) {
                window.imageViewer.showViewer(images, startIndex);
            } else {
                console.error('Visualizador de imagens não encontrado ou não há imagens para exibir');
                this.showToast('Não foi possível exibir a imagem', 'error');
            }
        } catch (error) {
            console.error('Erro ao abrir visualizador de imagens:', error);
            this.showToast('Erro ao carregar imagens da conversa', 'error');
        }
    }
    
    async unarchiveMessage(messageId) {
        try {
            const response = await fetch(`/api/messages/received/${messageId}/unarchive`, {
                method: 'PUT'
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.showToast('Mensagem desarquivada com sucesso', 'success');
                this.loadReceivedMessages(this.currentPage);
            } else {
                this.showToast(result.message || 'Erro ao desarquivar mensagem', 'error');
            }
        } catch (error) {
            console.error('Error unarchiving message:', error);
            this.showToast('Erro ao desarquivar mensagem', 'error');
        }
    }

    replyToMessage(message) {
        // Preencher o formulário de mensagem com o contato do remetente
        const messageContent = document.getElementById('message-content');
        const contactSelection = document.getElementById('contact-selection');
        
        if (!messageContent || !contactSelection) return;
        
        // Focar na seção de envio de mensagem
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // Selecionar o contato do remetente no select
        if (typeof $ !== 'undefined' && $.fn.select2) {
            $(contactSelection).val(message.sender ? message.sender._id : '').trigger('change');
        } else {
            // Fallback para select nativo
            Array.from(contactSelection.options).forEach(option => {
                option.selected = message.sender && option.value === message.sender._id;
            });
        }
        
        // Focar no campo de mensagem
        setTimeout(() => {
            messageContent.focus();
        }, 500);
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

// Initialize message received manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check if dashboard manager exists
    if (window.dashboardManager) {
        window.messageReceivedManager = new MessageReceivedManager(window.dashboardManager);
    } else {
        window.messageReceivedManager = new MessageReceivedManager();
    }
});

// Contacts Section JavaScript
class ContactsManager {
    constructor(dashboardManager) {
        this.dashboard = dashboardManager;
        this.contacts = [];
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.totalContacts = 0;
        this.filters = {
            search: '',
            tag: '',
            group: ''
        };
        
        this.initializeContactsSection();
    }

    initializeContactsSection() {
        this.createContactsHTML();
        this.bindContactsEvents();
    }

    createContactsHTML() {
        const contactsContent = document.getElementById('contactsContent');
        contactsContent.innerHTML = `
            <!-- Contacts Toolbar -->
            <div class="row mb-4">
                <div class="col-md-6">
                    <div class="input-group">
                        <span class="input-group-text">
                            <i class="bi bi-search"></i>
                        </span>
                        <input type="text" class="form-control" id="contactsSearch" placeholder="Buscar contatos...">
                    </div>
                </div>
                <div class="col-md-3">
                    <select class="form-select" id="contactsTagFilter">
                        <option value="">Todas as tags</option>
                    </select>
                </div>
                <div class="col-md-3">
                    <select class="form-select" id="contactsGroupFilter">
                        <option value="">Todos os grupos</option>
                    </select>
                </div>
            </div>

            <!-- Action Buttons -->
            <div class="row mb-4">
                <div class="col-12">
                    <div class="btn-group me-2" role="group">
                        <button type="button" class="btn btn-success" id="syncWhatsAppContacts">
                            <i class="bi bi-arrow-repeat me-2"></i>
                            Sincronizar WhatsApp
                        </button>
                        <button type="button" class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#importContactsModal">
                            <i class="bi bi-upload me-2"></i>
                            Importar CSV
                        </button>
                        <button type="button" class="btn btn-outline-primary" id="exportContacts">
                            <i class="bi bi-download me-2"></i>
                            Exportar CSV
                        </button>
                    </div>
                    <button type="button" class="btn btn-danger ms-2" id="deleteSelectedContacts" disabled>
                        <i class="bi bi-trash me-2"></i>
                        Excluir Selecionados
                    </button>
                </div>
            </div>

            <!-- Contacts Table -->
            <div class="card">
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th width="50">
                                        <div class="form-check">
                                            <input class="form-check-input" type="checkbox" id="selectAllContacts">
                                        </div>
                                    </th>
                                    <th>Nome</th>
                                    <th>Telefone</th>
                                    <th>Email</th>
                                    <th>Tags</th>
                                    <th>Grupos</th>
                                    <th>Mensagens Enviadas</th>
                                    <th width="120">Ações</th>
                                </tr>
                            </thead>
                            <tbody id="contactsTableBody">
                                <!-- Contacts will be loaded here -->
                            </tbody>
                        </table>
                    </div>
                    
                    <!-- Pagination -->
                    <nav aria-label="Contacts pagination" class="mt-3">
                        <ul class="pagination justify-content-center" id="contactsPagination">
                            <!-- Pagination will be generated here -->
                        </ul>
                    </nav>
                </div>
            </div>
        `;

        // Add modals
        this.createContactModals();
    }

    createContactModals() {
        const modalsHTML = `
            <!-- Add/Edit Contact Modal -->
            <div class="modal fade" id="addContactModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="bi bi-person-plus me-2"></i>
                                <span id="contactModalTitle">Adicionar Contato</span>
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <form id="contactForm">
                            <div class="modal-body">
                                <input type="hidden" id="contactId">
                                <div class="mb-3">
                                    <label for="contactName" class="form-label">Nome *</label>
                                    <input type="text" class="form-control" id="contactName" required>
                                </div>
                                <div class="mb-3">
                                    <label for="contactPhone" class="form-label">Telefone *</label>
                                    <input type="tel" class="form-control" id="contactPhone" required>
                                </div>
                                <div class="mb-3">
                                    <label for="contactEmail" class="form-label">Email</label>
                                    <input type="email" class="form-control" id="contactEmail">
                                </div>
                                <div class="mb-3">
                                    <label for="contactTags" class="form-label">Tags (separadas por vírgula)</label>
                                    <input type="text" class="form-control" id="contactTags" placeholder="cliente, vip, promocao">
                                </div>
                                <div class="mb-3">
                                    <label for="contactGroups" class="form-label">Grupos (separados por vírgula)</label>
                                    <input type="text" class="form-control" id="contactGroups" placeholder="clientes, newsletter">
                                </div>
                                <div class="mb-3">
                                    <label for="contactNotes" class="form-label">Observações</label>
                                    <textarea class="form-control" id="contactNotes" rows="3"></textarea>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                                <button type="submit" class="btn btn-primary">
                                    <i class="bi bi-save me-2"></i>
                                    Salvar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <!-- Import Contacts Modal -->
            <div class="modal fade" id="importContactsModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="bi bi-upload me-2"></i>
                                Importar Contatos
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <form id="importContactsForm">
                            <div class="modal-body">
                                <div class="mb-3">
                                    <label for="csvFile" class="form-label">Arquivo CSV</label>
                                    <input type="file" class="form-control" id="csvFile" accept=".csv" required>
                                    <div class="form-text">
                                        O arquivo deve conter as colunas: nome, telefone, email, tags, grupos
                                    </div>
                                </div>
                                <div class="alert alert-info">
                                    <h6><i class="bi bi-info-circle me-2"></i>Formato do CSV:</h6>
                                    <code>nome,telefone,email,tags,grupos</code><br>
                                    <code>João Silva,11999999999,joao@email.com,"cliente,vip","clientes,newsletter"</code>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                                <button type="submit" class="btn btn-primary">
                                    <i class="bi bi-upload me-2"></i>
                                    Importar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalsHTML);
    }

    bindContactsEvents() {
        // Search and filters
        document.getElementById('contactsSearch').addEventListener('input', () => {
            this.filters.search = document.getElementById('contactsSearch').value;
            this.currentPage = 1;
            this.loadContacts();
        });

        document.getElementById('contactsTagFilter').addEventListener('change', () => {
            this.filters.tag = document.getElementById('contactsTagFilter').value;
            this.currentPage = 1;
            this.loadContacts();
        });

        document.getElementById('contactsGroupFilter').addEventListener('change', () => {
            this.filters.group = document.getElementById('contactsGroupFilter').value;
            this.currentPage = 1;
            this.loadContacts();
        });

        // Action buttons
        document.getElementById('syncWhatsAppContacts').addEventListener('click', () => {
            this.syncWhatsAppContacts();
        });

        document.getElementById('exportContacts').addEventListener('click', () => {
            this.exportContacts();
        });

        document.getElementById('deleteSelectedContacts').addEventListener('click', () => {
            this.deleteSelectedContacts();
        });

        // Select all checkbox
        document.getElementById('selectAllContacts').addEventListener('change', (e) => {
            this.toggleSelectAll(e.target.checked);
        });

        // Forms
        document.getElementById('contactForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveContact();
        });

        document.getElementById('importContactsForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.importContacts();
        });
    }

    async loadContacts() {
        // Only show loading for initial load or when there are many contacts
        const shouldShowLoading = this.contacts.length === 0 || this.totalContacts > 1000;
        
        if (shouldShowLoading) {
            this.dashboard.showLoading('Carregando contatos...', 'Aguarde um momento');
        }
        
        try {
            const params = new URLSearchParams({
                page: this.currentPage,
                limit: this.itemsPerPage,
                search: this.filters.search,
                tag: this.filters.tag,
                group: this.filters.group
            });

            const response = await fetch(`/api/contacts?${params}`);
            const result = await response.json();

            if (result.success) {
                this.contacts = result.data.contacts;
                this.totalContacts = result.data.pagination.total;
                this.renderContactsTable();
                this.renderPagination(result.data.pagination);
                this.updateFilters(result.data.filters);
            } else {
                this.dashboard.showToast('Erro ao carregar contatos', 'error');
            }
        } catch (error) {
            console.error('Load contacts error:', error);
            this.dashboard.showToast('Erro ao carregar contatos', 'error');
        } finally {
            if (shouldShowLoading) {
                this.dashboard.elements.loadingModal.hide();
            }
        }
    }

    renderContactsTable() {
        const tbody = document.getElementById('contactsTableBody');
        
        if (this.contacts.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-muted py-4">
                        <i class="bi bi-people fs-1"></i>
                        <p class="mt-2 mb-0">Nenhum contato encontrado</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.contacts.map(contact => `
            <tr>
                <td>
                    <div class="form-check">
                        <input class="form-check-input contact-checkbox" type="checkbox" value="${contact._id}">
                    </div>
                </td>
                <td>
                    <div class="fw-medium">${contact.name}</div>
                    ${contact.notes ? `<small class="text-muted">${contact.notes.substring(0, 50)}${contact.notes.length > 50 ? '...' : ''}</small>` : ''}
                </td>
                <td>
                    <span class="font-monospace">${contact.phone}</span>
                </td>
                <td>${contact.email || '-'}</td>
                <td>
                    ${contact.tags.map(tag => `<span class="badge bg-secondary me-1">${tag}</span>`).join('')}
                </td>
                <td>
                    ${contact.groups.map(group => `<span class="badge bg-info me-1">${group}</span>`).join('')}
                </td>
                <td>
                    <span class="badge bg-primary">${contact.totalMessagesSent || 0}</span>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="contactsManager.editContact('${contact._id}')" title="Editar">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="contactsManager.deleteContact('${contact._id}')" title="Excluir">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Bind checkbox events
        document.querySelectorAll('.contact-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateDeleteButton();
            });
        });
    }

    renderPagination(pagination) {
        const paginationEl = document.getElementById('contactsPagination');
        const { page, pages, total } = pagination;

        if (pages <= 1) {
            paginationEl.innerHTML = '';
            return;
        }

        let paginationHTML = '';

        // Previous button
        paginationHTML += `
            <li class="page-item ${page === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="contactsManager.goToPage(${page - 1})">Anterior</a>
            </li>
        `;

        // Page numbers
        for (let i = Math.max(1, page - 2); i <= Math.min(pages, page + 2); i++) {
            paginationHTML += `
                <li class="page-item ${i === page ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="contactsManager.goToPage(${i})">${i}</a>
                </li>
            `;
        }

        // Next button
        paginationHTML += `
            <li class="page-item ${page === pages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="contactsManager.goToPage(${page + 1})">Próximo</a>
            </li>
        `;

        paginationEl.innerHTML = paginationHTML;
    }

    updateFilters(filters) {
        if (!filters) return;

        // Update tag filter
        const tagFilter = document.getElementById('contactsTagFilter');
        tagFilter.innerHTML = '<option value="">Todas as tags</option>';
        filters.tags.forEach(tag => {
            const option = document.createElement('option');
            option.value = tag;
            option.textContent = tag;
            if (tag === this.filters.tag) option.selected = true;
            tagFilter.appendChild(option);
        });

        // Update group filter
        const groupFilter = document.getElementById('contactsGroupFilter');
        groupFilter.innerHTML = '<option value="">Todos os grupos</option>';
        filters.groups.forEach(group => {
            const option = document.createElement('option');
            option.value = group;
            option.textContent = group;
            if (group === this.filters.group) option.selected = true;
            groupFilter.appendChild(option);
        });
    }

    goToPage(page) {
        this.currentPage = page;
        this.loadContacts();
    }

    editContact(contactId) {
        const contact = this.contacts.find(c => c._id === contactId);
        if (!contact) return;

        document.getElementById('contactModalTitle').textContent = 'Editar Contato';
        document.getElementById('contactId').value = contact._id;
        document.getElementById('contactName').value = contact.name;
        document.getElementById('contactPhone').value = contact.phone;
        document.getElementById('contactEmail').value = contact.email || '';
        document.getElementById('contactTags').value = contact.tags.join(', ');
        document.getElementById('contactGroups').value = contact.groups.join(', ');
        document.getElementById('contactNotes').value = contact.notes || '';

        const modal = new bootstrap.Modal(document.getElementById('addContactModal'));
        modal.show();
    }

    async saveContact() {
        const contactId = document.getElementById('contactId').value;
        const isEdit = !!contactId;

        const contactData = {
            name: document.getElementById('contactName').value.trim(),
            phone: document.getElementById('contactPhone').value.trim(),
            email: document.getElementById('contactEmail').value.trim(),
            tags: document.getElementById('contactTags').value.split(',').map(t => t.trim()).filter(t => t),
            groups: document.getElementById('contactGroups').value.split(',').map(g => g.trim()).filter(g => g),
            notes: document.getElementById('contactNotes').value.trim()
        };

        try {
            const url = isEdit ? `/api/contacts/${contactId}` : '/api/contacts';
            const method = isEdit ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(contactData)
            });

            const result = await response.json();

            if (result.success) {
                this.dashboard.showToast(
                    isEdit ? 'Contato atualizado com sucesso!' : 'Contato criado com sucesso!',
                    'success'
                );
                bootstrap.Modal.getInstance(document.getElementById('addContactModal')).hide();
                document.getElementById('contactForm').reset();
                this.loadContacts();
            } else {
                this.dashboard.showToast(result.message || 'Erro ao salvar contato', 'error');
            }
        } catch (error) {
            console.error('Save contact error:', error);
            this.dashboard.showToast('Erro ao salvar contato', 'error');
        }
    }

    async deleteContact(contactId) {
        if (!confirm('Tem certeza que deseja excluir este contato?')) {
            return;
        }

        try {
            const response = await fetch(`/api/contacts/${contactId}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (result.success) {
                this.dashboard.showToast('Contato excluído com sucesso!', 'success');
                this.loadContacts();
            } else {
                this.dashboard.showToast(result.message || 'Erro ao excluir contato', 'error');
            }
        } catch (error) {
            console.error('Delete contact error:', error);
            this.dashboard.showToast('Erro ao excluir contato', 'error');
        }
    }

    async syncWhatsAppContacts() {
        this.dashboard.showLoading('Sincronizando contatos do WhatsApp...', 'Isso pode levar alguns minutos');

        try {
            const response = await fetch('/api/contacts/sync', {
                method: 'POST'
            });

            const result = await response.json();

            if (result.success) {
                this.dashboard.showToast(
                    `Sincronização concluída! ${result.data.synced} contatos adicionados, ${result.data.skipped} ignorados.`,
                    'success'
                );
                this.loadContacts();
            } else {
                this.dashboard.showToast(result.message || 'Erro na sincronização', 'error');
            }
        } catch (error) {
            console.error('Sync contacts error:', error);
            this.dashboard.showToast('Erro na sincronização', 'error');
        } finally {
            this.dashboard.elements.loadingModal.hide();
        }
    }

    async importContacts() {
        const fileInput = document.getElementById('csvFile');
        const file = fileInput.files[0];

        if (!file) {
            this.dashboard.showToast('Selecione um arquivo CSV', 'warning');
            return;
        }

        this.dashboard.showLoading('Importando contatos...', 'Processando arquivo CSV');

        try {
            const formData = new FormData();
            formData.append('csvFile', file);

            const response = await fetch('/api/contacts/import', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                this.dashboard.showToast(
                    `Importação concluída! ${result.data.imported} contatos importados, ${result.data.skipped} ignorados.`,
                    'success'
                );
                bootstrap.Modal.getInstance(document.getElementById('importContactsModal')).hide();
                document.getElementById('importContactsForm').reset();
                this.loadContacts();
            } else {
                this.dashboard.showToast(result.message || 'Erro na importação', 'error');
            }
        } catch (error) {
            console.error('Import contacts error:', error);
            this.dashboard.showToast('Erro na importação', 'error');
        } finally {
            this.dashboard.elements.loadingModal.hide();
        }
    }

    async exportContacts() {
        try {
            const response = await fetch('/api/contacts/export/csv');
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `contatos-${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                this.dashboard.showToast('Contatos exportados com sucesso!', 'success');
            } else {
                this.dashboard.showToast('Erro ao exportar contatos', 'error');
            }
        } catch (error) {
            console.error('Export contacts error:', error);
            this.dashboard.showToast('Erro ao exportar contatos', 'error');
        }
    }

    toggleSelectAll(checked) {
        document.querySelectorAll('.contact-checkbox').forEach(checkbox => {
            checkbox.checked = checked;
        });
        this.updateDeleteButton();
    }

    updateDeleteButton() {
        const selectedCount = document.querySelectorAll('.contact-checkbox:checked').length;
        const deleteButton = document.getElementById('deleteSelectedContacts');
        deleteButton.disabled = selectedCount === 0;
        deleteButton.innerHTML = `
            <i class="bi bi-trash me-2"></i>
            Excluir Selecionados ${selectedCount > 0 ? `(${selectedCount})` : ''}
        `;
    }

    async deleteSelectedContacts() {
        const selectedCheckboxes = document.querySelectorAll('.contact-checkbox:checked');
        const selectedIds = Array.from(selectedCheckboxes).map(cb => cb.value);

        if (selectedIds.length === 0) return;

        if (!confirm(`Tem certeza que deseja excluir ${selectedIds.length} contato(s) selecionado(s)?`)) {
            return;
        }

        this.dashboard.showLoading('Excluindo contatos...', 'Processando exclusão');

        try {
            const promises = selectedIds.map(id => 
                fetch(`/api/contacts/${id}`, { method: 'DELETE' })
            );

            await Promise.all(promises);
            
            this.dashboard.showToast(`${selectedIds.length} contato(s) excluído(s) com sucesso!`, 'success');
            this.loadContacts();
        } catch (error) {
            console.error('Delete selected contacts error:', error);
            this.dashboard.showToast('Erro ao excluir contatos selecionados', 'error');
        } finally {
            this.dashboard.elements.loadingModal.hide();
        }
    }
}

// Global instance for onclick handlers
let contactsManager;

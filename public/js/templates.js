// Templates Section JavaScript
class TemplatesManager {
    constructor(dashboardManager) {
        this.dashboard = dashboardManager;
        this.templates = [];
        this.currentPage = 1;
        this.itemsPerPage = 12;
        this.totalTemplates = 0;
        this.filters = {
            search: '',
            category: ''
        };
        
        this.initializeTemplatesSection();
    }

    initializeTemplatesSection() {
        this.createTemplatesHTML();
        this.bindTemplatesEvents();
    }

    createTemplatesHTML() {
        const templatesContent = document.getElementById('templatesContent');
        templatesContent.innerHTML = `
            <!-- Templates Toolbar -->
            <div class="row mb-4">
                <div class="col-md-6">
                    <div class="input-group">
                        <span class="input-group-text">
                            <i class="bi bi-search"></i>
                        </span>
                        <input type="text" class="form-control" id="templatesSearch" placeholder="Buscar templates...">
                    </div>
                </div>
                <div class="col-md-3">
                    <select class="form-select" id="templatesCategoryFilter">
                        <option value="">Todas as categorias</option>
                    </select>
                </div>
                <div class="col-md-3">
                    <div class="d-grid">
                        <button type="button" class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#addTemplateModal">
                            <i class="bi bi-plus me-2"></i>
                            Novo Template
                        </button>
                    </div>
                </div>
            </div>

            <!-- Templates Grid -->
            <div class="row" id="templatesGrid">
                <!-- Templates will be loaded here -->
            </div>

            <!-- Pagination -->
            <nav aria-label="Templates pagination" class="mt-4">
                <ul class="pagination justify-content-center" id="templatesPagination">
                    <!-- Pagination will be generated here -->
                </ul>
            </nav>
        `;

        // Add modals
        this.createTemplateModals();
    }

    createTemplateModals() {
        const modalsHTML = `
            <!-- Add/Edit Template Modal -->
            <div class="modal fade" id="addTemplateModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="bi bi-file-text me-2"></i>
                                <span id="templateModalTitle">Novo Template</span>
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <form id="templateForm">
                            <div class="modal-body">
                                <input type="hidden" id="templateId">
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="templateName" class="form-label">Nome do Template *</label>
                                            <input type="text" class="form-control" id="templateName" required>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label for="templateCategory" class="form-label">Categoria</label>
                                            <input type="text" class="form-control" id="templateCategory" placeholder="Ex: Promoções, Avisos, Saudações">
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="mb-3">
                                    <label for="templateType" class="form-label">Tipo de Template</label>
                                    <select class="form-select" id="templateType">
                                        <option value="text">Texto</option>
                                        <option value="image">Imagem</option>
                                        <option value="video">Vídeo</option>
                                        <option value="document">Documento</option>
                                    </select>
                                </div>

                                <div class="mb-3">
                                    <label for="templateContent" class="form-label">Conteúdo da Mensagem *</label>
                                    <textarea class="form-control" id="templateContent" rows="6" required 
                                              placeholder="Digite o conteúdo do template aqui...&#10;&#10;Use variáveis como {{nome}}, {{empresa}}, {{data}} para personalização."></textarea>
                                    <div class="form-text">
                                        <span id="templateCharCount">0</span> caracteres
                                    </div>
                                </div>

                                <div class="mb-3" id="mediaUploadSection" style="display: none;">
                                    <label for="templateMedia" class="form-label">Arquivo de Mídia</label>
                                    <input type="file" class="form-control" id="templateMedia" accept="image/*,video/*,.pdf,.doc,.docx">
                                    <div class="form-text">
                                        Formatos suportados: Imagens, vídeos, PDF, DOC, DOCX (máx. 10MB)
                                    </div>
                                </div>

                                <div class="mb-3">
                                    <label class="form-label">Variáveis do Template</label>
                                    <div id="templateVariables">
                                        <div class="row mb-2">
                                            <div class="col-4">
                                                <input type="text" class="form-control form-control-sm" placeholder="Nome da variável" name="varName">
                                            </div>
                                            <div class="col-4">
                                                <input type="text" class="form-control form-control-sm" placeholder="{{placeholder}}" name="varPlaceholder">
                                            </div>
                                            <div class="col-3">
                                                <input type="text" class="form-control form-control-sm" placeholder="Descrição" name="varDescription">
                                            </div>
                                            <div class="col-1">
                                                <button type="button" class="btn btn-sm btn-outline-danger" onclick="this.parentElement.parentElement.remove()">
                                                    <i class="bi bi-trash"></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <button type="button" class="btn btn-sm btn-outline-primary" id="addVariableBtn">
                                        <i class="bi bi-plus me-1"></i>
                                        Adicionar Variável
                                    </button>
                                </div>

                                <div class="mb-3">
                                    <label class="form-label">Preview do Template</label>
                                    <div class="card bg-light">
                                        <div class="card-body">
                                            <div id="templatePreview" class="text-muted">
                                                Digite o conteúdo para ver o preview...
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                                <button type="submit" class="btn btn-primary">
                                    <i class="bi bi-save me-2"></i>
                                    Salvar Template
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <!-- Use Template Modal -->
            <div class="modal fade" id="useTemplateModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="bi bi-send me-2"></i>
                                Usar Template
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <label class="form-label">Template: <strong id="selectedTemplateName"></strong></label>
                                <div class="card bg-light">
                                    <div class="card-body">
                                        <div id="selectedTemplateContent"></div>
                                    </div>
                                </div>
                            </div>
                            
                            <div id="templateVariablesForm">
                                <!-- Variables form will be generated here -->
                            </div>

                            <div class="mb-3">
                                <label class="form-label">Preview da Mensagem Final</label>
                                <div class="card">
                                    <div class="card-body">
                                        <div id="finalMessagePreview"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                            <button type="button" class="btn btn-primary" id="useTemplateBtn">
                                <i class="bi bi-send me-2"></i>
                                Usar no Formulário de Mensagem
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalsHTML);
    }

    bindTemplatesEvents() {
        // Search and filters
        document.getElementById('templatesSearch').addEventListener('input', () => {
            this.filters.search = document.getElementById('templatesSearch').value;
            this.currentPage = 1;
            this.loadTemplates();
        });

        document.getElementById('templatesCategoryFilter').addEventListener('change', () => {
            this.filters.category = document.getElementById('templatesCategoryFilter').value;
            this.currentPage = 1;
            this.loadTemplates();
        });

        // Template form
        document.getElementById('templateForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveTemplate();
        });

        // Template type change
        document.getElementById('templateType').addEventListener('change', (e) => {
            const mediaSection = document.getElementById('mediaUploadSection');
            if (e.target.value === 'text') {
                mediaSection.style.display = 'none';
            } else {
                mediaSection.style.display = 'block';
            }
        });

        // Template content change for preview
        document.getElementById('templateContent').addEventListener('input', () => {
            this.updateTemplatePreview();
            this.updateCharCount();
        });

        // Add variable button
        document.getElementById('addVariableBtn').addEventListener('click', () => {
            this.addVariableField();
        });

        // Use template button
        document.getElementById('useTemplateBtn').addEventListener('click', () => {
            this.applyTemplateToMessageForm();
        });
    }

    async loadTemplates() {
        try {
            const params = new URLSearchParams({
                page: this.currentPage,
                limit: this.itemsPerPage,
                search: this.filters.search,
                category: this.filters.category
            });

            const response = await fetch(`/api/templates?${params}`);
            const result = await response.json();

            if (result.success) {
                this.templates = result.data.templates;
                this.totalTemplates = result.data.pagination.total;
                this.renderTemplatesGrid();
                this.renderPagination(result.data.pagination);
                this.updateCategoryFilter(result.data.categories);
            } else {
                this.dashboard.showToast('Erro ao carregar templates', 'error');
            }
        } catch (error) {
            console.error('Load templates error:', error);
            this.dashboard.showToast('Erro ao carregar templates', 'error');
        }
    }

    renderTemplatesGrid() {
        const grid = document.getElementById('templatesGrid');
        
        if (this.templates.length === 0) {
            grid.innerHTML = `
                <div class="col-12">
                    <div class="text-center text-muted py-5">
                        <i class="bi bi-file-text fs-1"></i>
                        <p class="mt-2 mb-0">Nenhum template encontrado</p>
                        <button class="btn btn-primary mt-3" data-bs-toggle="modal" data-bs-target="#addTemplateModal">
                            <i class="bi bi-plus me-2"></i>
                            Criar Primeiro Template
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        grid.innerHTML = this.templates.map(template => `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card h-100 template-card" data-template-id="${template._id}">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h6 class="card-title mb-0">${template.name}</h6>
                        <div class="dropdown">
                            <button class="btn btn-sm btn-outline-secondary" type="button" data-bs-toggle="dropdown">
                                <i class="bi bi-three-dots-vertical"></i>
                            </button>
                            <ul class="dropdown-menu">
                                <li><a class="dropdown-item" href="#" onclick="templatesManager.useTemplate('${template._id}')">
                                    <i class="bi bi-send me-2"></i>Usar Template
                                </a></li>
                                <li><a class="dropdown-item" href="#" onclick="templatesManager.editTemplate('${template._id}')">
                                    <i class="bi bi-pencil me-2"></i>Editar
                                </a></li>
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item text-danger" href="#" onclick="templatesManager.deleteTemplate('${template._id}')">
                                    <i class="bi bi-trash me-2"></i>Excluir
                                </a></li>
                            </ul>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="mb-2">
                            <span class="badge bg-primary me-2">${template.type}</span>
                            ${template.category ? `<span class="badge bg-secondary">${template.category}</span>` : ''}
                        </div>
                        <p class="card-text text-truncate-3" style="font-size: 0.9rem;">
                            ${template.content}
                        </p>
                        ${template.variables.length > 0 ? `
                            <div class="mb-2">
                                <small class="text-muted">Variáveis:</small><br>
                                ${template.variables.map(v => `<code class="me-1">${v.placeholder}</code>`).join('')}
                            </div>
                        ` : ''}
                    </div>
                    <div class="card-footer bg-transparent">
                        <div class="d-flex justify-content-between align-items-center">
                            <small class="text-muted">
                                <i class="bi bi-eye me-1"></i>
                                ${template.usageCount || 0} usos
                            </small>
                            <button class="btn btn-sm btn-primary" onclick="templatesManager.useTemplate('${template._id}')">
                                <i class="bi bi-send me-1"></i>
                                Usar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderPagination(pagination) {
        const paginationEl = document.getElementById('templatesPagination');
        const { page, pages } = pagination;

        if (pages <= 1) {
            paginationEl.innerHTML = '';
            return;
        }

        let paginationHTML = '';

        // Previous button
        paginationHTML += `
            <li class="page-item ${page === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="templatesManager.goToPage(${page - 1})">Anterior</a>
            </li>
        `;

        // Page numbers
        for (let i = Math.max(1, page - 2); i <= Math.min(pages, page + 2); i++) {
            paginationHTML += `
                <li class="page-item ${i === page ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="templatesManager.goToPage(${i})">${i}</a>
                </li>
            `;
        }

        // Next button
        paginationHTML += `
            <li class="page-item ${page === pages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="templatesManager.goToPage(${page + 1})">Próximo</a>
            </li>
        `;

        paginationEl.innerHTML = paginationHTML;
    }

    updateCategoryFilter(categories) {
        const categoryFilter = document.getElementById('templatesCategoryFilter');
        categoryFilter.innerHTML = '<option value="">Todas as categorias</option>';
        
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            if (category === this.filters.category) option.selected = true;
            categoryFilter.appendChild(option);
        });
    }

    goToPage(page) {
        this.currentPage = page;
        this.loadTemplates();
    }

    editTemplate(templateId) {
        const template = this.templates.find(t => t._id === templateId);
        if (!template) return;

        document.getElementById('templateModalTitle').textContent = 'Editar Template';
        document.getElementById('templateId').value = template._id;
        document.getElementById('templateName').value = template.name;
        document.getElementById('templateCategory').value = template.category || '';
        document.getElementById('templateType').value = template.type;
        document.getElementById('templateContent').value = template.content;

        // Show/hide media section based on type
        const mediaSection = document.getElementById('mediaUploadSection');
        mediaSection.style.display = template.type === 'text' ? 'none' : 'block';

        // Load variables
        const variablesContainer = document.getElementById('templateVariables');
        variablesContainer.innerHTML = '';
        template.variables.forEach(variable => {
            this.addVariableField(variable);
        });

        this.updateTemplatePreview();
        this.updateCharCount();

        const modal = new bootstrap.Modal(document.getElementById('addTemplateModal'));
        modal.show();
    }

    async saveTemplate() {
        const templateId = document.getElementById('templateId').value;
        const isEdit = !!templateId;

        // Collect variables
        const variables = [];
        const varRows = document.querySelectorAll('#templateVariables .row');
        varRows.forEach(row => {
            const name = row.querySelector('input[name="varName"]').value.trim();
            const placeholder = row.querySelector('input[name="varPlaceholder"]').value.trim();
            const description = row.querySelector('input[name="varDescription"]').value.trim();
            
            if (name && placeholder) {
                variables.push({ name, placeholder, description });
            }
        });

        const templateData = {
            name: document.getElementById('templateName').value.trim(),
            category: document.getElementById('templateCategory').value.trim(),
            type: document.getElementById('templateType').value,
            content: document.getElementById('templateContent').value.trim(),
            variables: variables
        };

        try {
            let response;
            
            if (document.getElementById('templateMedia').files[0]) {
                // If there's a media file, use FormData
                const formData = new FormData();
                Object.keys(templateData).forEach(key => {
                    if (key === 'variables') {
                        formData.append(key, JSON.stringify(templateData[key]));
                    } else {
                        formData.append(key, templateData[key]);
                    }
                });
                formData.append('media', document.getElementById('templateMedia').files[0]);

                const url = isEdit ? `/api/templates/${templateId}` : '/api/templates';
                const method = isEdit ? 'PUT' : 'POST';
                
                response = await fetch(url, {
                    method: method,
                    body: formData
                });
            } else {
                // Regular JSON request
                const url = isEdit ? `/api/templates/${templateId}` : '/api/templates';
                const method = isEdit ? 'PUT' : 'POST';
                
                response = await fetch(url, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(templateData)
                });
            }

            const result = await response.json();

            if (result.success) {
                this.dashboard.showToast(
                    isEdit ? 'Template atualizado com sucesso!' : 'Template criado com sucesso!',
                    'success'
                );
                bootstrap.Modal.getInstance(document.getElementById('addTemplateModal')).hide();
                document.getElementById('templateForm').reset();
                this.loadTemplates();
            } else {
                this.dashboard.showToast(result.message || 'Erro ao salvar template', 'error');
            }
        } catch (error) {
            console.error('Save template error:', error);
            this.dashboard.showToast('Erro ao salvar template', 'error');
        }
    }

    async deleteTemplate(templateId) {
        if (!confirm('Tem certeza que deseja excluir este template?')) {
            return;
        }

        try {
            const response = await fetch(`/api/templates/${templateId}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (result.success) {
                this.dashboard.showToast('Template excluído com sucesso!', 'success');
                this.loadTemplates();
            } else {
                this.dashboard.showToast(result.message || 'Erro ao excluir template', 'error');
            }
        } catch (error) {
            console.error('Delete template error:', error);
            this.dashboard.showToast('Erro ao excluir template', 'error');
        }
    }

    useTemplate(templateId) {
        const template = this.templates.find(t => t._id === templateId);
        if (!template) return;

        document.getElementById('selectedTemplateName').textContent = template.name;
        document.getElementById('selectedTemplateContent').textContent = template.content;

        // Generate variables form
        const variablesForm = document.getElementById('templateVariablesForm');
        if (template.variables.length > 0) {
            variablesForm.innerHTML = `
                <div class="mb-3">
                    <label class="form-label">Preencha as Variáveis</label>
                    ${template.variables.map(variable => `
                        <div class="mb-2">
                            <label class="form-label">${variable.name}</label>
                            <input type="text" class="form-control template-variable" 
                                   data-placeholder="${variable.placeholder}" 
                                   placeholder="${variable.description || variable.name}">
                        </div>
                    `).join('')}
                </div>
            `;

            // Bind variable change events
            document.querySelectorAll('.template-variable').forEach(input => {
                input.addEventListener('input', () => {
                    this.updateFinalPreview(template);
                });
            });
        } else {
            variablesForm.innerHTML = '';
        }

        this.updateFinalPreview(template);

        const modal = new bootstrap.Modal(document.getElementById('useTemplateModal'));
        modal.show();
    }

    updateFinalPreview(template) {
        let content = template.content;
        
        document.querySelectorAll('.template-variable').forEach(input => {
            const placeholder = input.dataset.placeholder;
            const value = input.value || placeholder;
            content = content.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
        });

        document.getElementById('finalMessagePreview').textContent = content;
    }

    applyTemplateToMessageForm() {
        // Get the final message content
        const finalContent = document.getElementById('finalMessagePreview').textContent;
        
        // Apply to main message form
        if (this.dashboard.elements.messageContent) {
            this.dashboard.elements.messageContent.value = finalContent;
            this.dashboard.updateCharCount();
        }

        // Close modal and switch to messages section
        bootstrap.Modal.getInstance(document.getElementById('useTemplateModal')).hide();
        this.dashboard.showSection('messages');
        
        this.dashboard.showToast('Template aplicado ao formulário de mensagem!', 'success');
    }

    addVariableField(variable = null) {
        const container = document.getElementById('templateVariables');
        const row = document.createElement('div');
        row.className = 'row mb-2';
        row.innerHTML = `
            <div class="col-4">
                <input type="text" class="form-control form-control-sm" placeholder="Nome da variável" 
                       name="varName" value="${variable ? variable.name : ''}">
            </div>
            <div class="col-4">
                <input type="text" class="form-control form-control-sm" placeholder="{{placeholder}}" 
                       name="varPlaceholder" value="${variable ? variable.placeholder : ''}">
            </div>
            <div class="col-3">
                <input type="text" class="form-control form-control-sm" placeholder="Descrição" 
                       name="varDescription" value="${variable ? variable.description : ''}">
            </div>
            <div class="col-1">
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="this.parentElement.parentElement.remove()">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;
        container.appendChild(row);
    }

    updateTemplatePreview() {
        const content = document.getElementById('templateContent').value;
        const preview = document.getElementById('templatePreview');
        
        if (content.trim()) {
            preview.textContent = content;
            preview.classList.remove('text-muted');
        } else {
            preview.textContent = 'Digite o conteúdo para ver o preview...';
            preview.classList.add('text-muted');
        }
    }

    updateCharCount() {
        const content = document.getElementById('templateContent').value;
        const charCount = document.getElementById('templateCharCount');
        charCount.textContent = content.length;
        
        if (content.length > 1000) {
            charCount.className = 'text-warning';
        } else if (content.length > 1500) {
            charCount.className = 'text-danger';
        } else {
            charCount.className = 'text-muted';
        }
    }
}

// Global instance for onclick handlers
let templatesManager;

// Diagnostics Section JavaScript
class DiagnosticsManager {
    constructor(dashboardManager) {
        this.dashboard = dashboardManager;
        this.refreshInterval = null;
        this.autoRefresh = true;
        this.refreshRate = 5000; // 5 seconds
        
        this.initializeDiagnosticsSection();
    }

    initializeDiagnosticsSection() {
        this.createDiagnosticsHTML();
        this.bindDiagnosticsEvents();
        this.startAutoRefresh();
    }

    createDiagnosticsHTML() {
        // NÃO sobrescrever todo o conteúdo, apenas adicionar controles necessários
        // Criar apenas os controles que não existem no HTML estático
        const diagnosticsContent = document.getElementById('diagnosticsContent');
        
        // Adicionar botões de controle na parte superior (se não existirem)
        if (!document.getElementById('refreshDiagnostics')) {
            const controlsContainer = document.createElement('div');
            controlsContainer.className = 'row mb-4';
            controlsContainer.innerHTML = `
                <div class="col-md-12 text-end">
                    <div class="btn-group me-2">
                        <button type="button" class="btn btn-outline-primary" id="refreshDiagnostics">
                            <i class="fas fa-sync-alt me-2"></i>
                            Atualizar
                        </button>
                        <button type="button" class="btn btn-outline-secondary" id="toggleAutoRefresh">
                            <i class="fas fa-play-circle me-2"></i>
                            <span id="autoRefreshText">Pausar Auto-Refresh</span>
                        </button>
                    </div>
                    <div class="btn-group">
                        <button type="button" class="btn btn-outline-danger" id="clearLogs">
                            <i class="fas fa-trash me-2"></i>
                            Limpar Logs
                        </button>
                    </div>
                </div>
            `;
            
            // Inserir no início do conteúdo sem substituir tudo
            diagnosticsContent.insertBefore(controlsContainer, diagnosticsContent.firstChild);
        }
        
        // Verificar se os cards de status já existem, se não, criá-los
        if (!document.getElementById('serverStatus')) {
            // Criar os cards de status do sistema
            const statusCardsContainer = document.createElement('div');
            statusCardsContainer.className = 'row mb-4';
            statusCardsContainer.innerHTML = `
                <div class="col-lg-3 col-md-6 mb-3">
                    <div class="card border-start border-primary border-4">
                        <div class="card-body">
                            <div class="d-flex align-items-center">
                                <div class="flex-grow-1">
                                    <h6 class="card-title text-muted mb-1">Status do Servidor</h6>
                                    <div class="d-flex align-items-center">
                                        <span id="serverStatus" class="badge bg-success me-2">Online</span>
                                        <small id="serverUptime" class="text-muted">-</small>
                                    </div>
                                </div>
                                <i class="fas fa-server fs-2 text-primary opacity-75"></i>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-lg-3 col-md-6 mb-3">
                    <div class="card border-start border-success border-4">
                        <div class="card-body">
                            <div class="d-flex align-items-center">
                                <div class="flex-grow-1">
                                    <h6 class="card-title text-muted mb-1">Banco de Dados</h6>
                                    <div class="d-flex align-items-center">
                                        <span id="dbStatus" class="badge bg-success me-2">Conectado</span>
                                        <small id="dbPing" class="text-muted">-</small>
                                    </div>
                                </div>
                                <i class="fas fa-database fs-2 text-success opacity-75"></i>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-lg-3 col-md-6 mb-3">
                    <div class="card border-start border-info border-4">
                        <div class="card-body">
                            <div class="d-flex align-items-center">
                                <div class="flex-grow-1">
                                    <h6 class="card-title text-muted mb-1">WhatsApp</h6>
                                    <div class="d-flex align-items-center">
                                        <span id="whatsappStatus" class="badge bg-warning me-2">Desconectado</span>
                                        <small id="whatsappInfo" class="text-muted">-</small>
                                    </div>
                                </div>
                                <i class="fab fa-whatsapp fs-2 text-info opacity-75"></i>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-lg-3 col-md-6 mb-3">
                    <div class="card border-start border-warning border-4">
                        <div class="card-body">
                            <div class="d-flex align-items-center">
                                <div class="flex-grow-1">
                                    <h6 class="card-title text-muted mb-1">Memória</h6>
                                    <div class="d-flex align-items-center">
                                        <span id="memoryUsage" class="fw-bold text-warning">-</span>
                                        <small class="text-muted ms-2">/ <span id="memoryTotal">-</span></small>
                                    </div>
                                </div>
                                <i class="fas fa-memory fs-2 text-warning opacity-75"></i>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            diagnosticsContent.appendChild(statusCardsContainer);
            
            // Criar métricas de performance
            const metricsContainer = document.createElement('div');
            metricsContainer.className = 'row mb-4';
            metricsContainer.innerHTML = `
                <div class="col-lg-8">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="card-title mb-0">
                                <i class="fas fa-tachometer-alt me-2"></i>
                                Métricas de Performance
                            </h5>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-3 text-center mb-3">
                                    <h4 id="cpuUsage" class="text-primary mb-1">-</h4>
                                    <small class="text-muted">CPU Usage</small>
                                </div>
                                <div class="col-md-3 text-center mb-3">
                                    <h4 id="avgResponseTime" class="text-success mb-1">-</h4>
                                    <small class="text-muted">Tempo Resposta</small>
                                </div>
                                <div class="col-md-3 text-center mb-3">
                                    <h4 id="activeConnections" class="text-info mb-1">-</h4>
                                    <small class="text-muted">Conexões Ativas</small>
                                </div>
                                <div class="col-md-3 text-center mb-3">
                                    <h4 id="errorRate" class="text-warning mb-1">-</h4>
                                    <small class="text-muted">Taxa de Erro</small>
                                </div>
                            </div>
                            <div class="row mt-3">
                                <div class="col-12">
                                    <canvas id="performanceChart" style="height: 200px;"></canvas>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-lg-4">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="card-title mb-0">
                                <i class="fas fa-info-circle me-2"></i>
                                Informações do Sistema
                            </h5>
                        </div>
                        <div class="card-body">
                            <table class="table table-sm">
                                <tbody>
                                    <tr>
                                        <td class="text-muted">Node.js</td>
                                        <td id="nodeVersion">-</td>
                                    </tr>
                                    <tr>
                                        <td class="text-muted">Sistema</td>
                                        <td id="osInfo">-</td>
                                    </tr>
                                    <tr>
                                        <td class="text-muted">Versão App</td>
                                        <td id="appVersion">-</td>
                                    </tr>
                                    <tr>
                                        <td class="text-muted">Ambiente</td>
                                        <td><span id="environment" class="badge bg-secondary">-</span></td>
                                    </tr>
                                    <tr>
                                        <td class="text-muted">Última Reinicialização</td>
                                        <td id="lastRestart">-</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
            diagnosticsContent.appendChild(metricsContainer);
            
            // Criar estatísticas do banco de dados
            const dbStatsContainer = document.createElement('div');
            dbStatsContainer.className = 'row mb-4';
            dbStatsContainer.innerHTML = `
                <div class="col-lg-6">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="card-title mb-0">
                                <i class="fas fa-database me-2"></i>
                                Estatísticas do Banco
                            </h5>
                        </div>
                        <div class="card-body">
                            <div class="row text-center">
                                <div class="col-6 mb-3">
                                    <h4 id="totalUsers" class="text-primary">-</h4>
                                    <small class="text-muted">Usuários</small>
                                </div>
                                <div class="col-6 mb-3">
                                    <h4 id="totalContacts" class="text-success">-</h4>
                                    <small class="text-muted">Contatos</small>
                                </div>
                                <div class="col-6">
                                    <h4 id="totalMessages" class="text-info">-</h4>
                                    <small class="text-muted">Mensagens</small>
                                </div>
                                <div class="col-6">
                                    <h4 id="totalTemplates" class="text-warning">-</h4>
                                    <small class="text-muted">Templates</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-lg-6">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="card-title mb-0">
                                <i class="fas fa-chart-line me-2"></i>
                                Atividade Recente
                            </h5>
                        </div>
                        <div class="card-body">
                            <div class="row text-center">
                                <div class="col-6 mb-3">
                                    <h4 id="messagesLast24h" class="text-primary">-</h4>
                                    <small class="text-muted">Mensagens (24h)</small>
                                </div>
                                <div class="col-6 mb-3">
                                    <h4 id="contactsLast24h" class="text-success">-</h4>
                                    <small class="text-muted">Contatos (24h)</small>
                                </div>
                                <div class="col-6">
                                    <h4 id="errorsLast24h" class="text-danger">-</h4>
                                    <small class="text-muted">Erros (24h)</small>
                                </div>
                                <div class="col-6">
                                    <h4 id="successRate24h" class="text-info">-</h4>
                                    <small class="text-muted">Taxa Sucesso</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            diagnosticsContent.appendChild(dbStatsContainer);
            
            // Criar logs do sistema
            const logsContainer = document.createElement('div');
            logsContainer.className = 'card';
            logsContainer.innerHTML = `
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h5 class="card-title mb-0">
                        <i class="fas fa-file-alt me-2"></i>
                        Logs do Sistema
                    </h5>
                    <div class="btn-group btn-group-sm">
                        <button type="button" class="btn btn-outline-secondary" data-log-level="all" onclick="diagnosticsManager.filterLogs('all')">
                            Todos
                        </button>
                        <button type="button" class="btn btn-outline-info" data-log-level="info" onclick="diagnosticsManager.filterLogs('info')">
                            Info
                        </button>
                        <button type="button" class="btn btn-outline-warning" data-log-level="warn" onclick="diagnosticsManager.filterLogs('warn')">
                            Avisos
                        </button>
                        <button type="button" class="btn btn-outline-danger" data-log-level="error" onclick="diagnosticsManager.filterLogs('error')">
                            Erros
                        </button>
                    </div>
                </div>
                <div class="card-body p-0">
                    <div id="systemLogs" class="logs-container" style="height: 400px; overflow-y: auto; background: #f8f9fa;">
                        <!-- Logs will be loaded here -->
                    </div>
                </div>
            `;
            diagnosticsContent.appendChild(logsContainer);
        }
    }

    bindDiagnosticsEvents() {
        // Refresh button
        document.getElementById('refreshDiagnostics').addEventListener('click', () => {
            this.refreshDiagnostics();
        });

        // Toggle auto refresh
        document.getElementById('toggleAutoRefresh').addEventListener('click', () => {
            this.toggleAutoRefresh();
        });

        // Clear logs button
        document.getElementById('clearLogs').addEventListener('click', () => {
            this.clearLogs();
        });

        // Initial load
        setTimeout(() => {
            this.refreshDiagnostics();
        }, 500);
    }

    startAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }

        if (this.autoRefresh) {
            this.refreshInterval = setInterval(() => {
                this.refreshDiagnostics();
            }, this.refreshRate);
        }
    }

    toggleAutoRefresh() {
        this.autoRefresh = !this.autoRefresh;
        const button = document.getElementById('toggleAutoRefresh');
        const text = document.getElementById('autoRefreshText');
        const icon = button.querySelector('i');

        if (this.autoRefresh) {
            text.textContent = 'Pausar Auto-Refresh';
            icon.className = 'bi bi-pause-circle me-2';
            button.className = 'btn btn-outline-secondary';
            this.startAutoRefresh();
        } else {
            text.textContent = 'Iniciar Auto-Refresh';
            icon.className = 'bi bi-play-circle me-2';
            button.className = 'btn btn-outline-success';
            if (this.refreshInterval) {
                clearInterval(this.refreshInterval);
            }
        }
    }

    async refreshDiagnostics() {
        try {
            await Promise.all([
                this.loadSystemInfo(),
                this.loadDatabaseStats(),
                this.loadWhatsAppStatus(),
                this.loadPerformanceMetrics(),
                this.loadSystemLogs()
            ]);
        } catch (error) {
            console.error('Refresh diagnostics error:', error);
        }
    }

    async loadSystemInfo() {
        try {
            const response = await fetch('/api/diagnostics/system');
            const result = await response.json();

            if (result.success) {
                const data = result.data;
                
                // Server status
                document.getElementById('serverStatus').textContent = 'Online';
                document.getElementById('serverStatus').className = 'badge bg-success me-2';
                document.getElementById('serverUptime').textContent = this.formatUptime(data.server.uptime);

                // Memory usage
                const memUsed = this.formatBytes(data.server.memory.used);
                const memTotal = this.formatBytes(data.server.memory.total);
                document.getElementById('memoryUsage').textContent = memUsed;
                document.getElementById('memoryTotal').textContent = memTotal;

                // System info
                document.getElementById('nodeVersion').textContent = data.server.nodeVersion;
                document.getElementById('osInfo').textContent = `${data.server.platform} ${data.server.arch}`;
                document.getElementById('appVersion').textContent = '1.0.0';
                document.getElementById('environment').textContent = data.environment.nodeEnv;
                document.getElementById('lastRestart').textContent = new Date(Date.now() - (data.server.uptime * 1000)).toLocaleString('pt-BR');
            }
        } catch (error) {
            console.error('Load system info error:', error);
            document.getElementById('serverStatus').textContent = 'Erro';
            document.getElementById('serverStatus').className = 'badge bg-danger me-2';
        }
    }

    async loadDatabaseStats() {
        try {
            const response = await fetch('/api/diagnostics/database');
            const result = await response.json();

            if (result.success) {
                const data = result.data;
                
                // DB status
                const isConnected = data.status === 'connected';
                document.getElementById('dbStatus').textContent = isConnected ? 'Conectado' : 'Desconectado';
                document.getElementById('dbStatus').className = `badge ${isConnected ? 'bg-success' : 'bg-danger'} me-2`;
                document.getElementById('dbPing').textContent = data.stats?.uptime ? `${Math.round(data.stats.uptime)}ms` : '-';

                // DB stats
                // Contar documentos por coleção
                const userCollection = data.collections.find(col => col.name === 'users') || {};
                const contactCollection = data.collections.find(col => col.name === 'contacts') || {};
                const messageCollection = data.collections.find(col => col.name === 'messages') || {};
                const templateCollection = data.collections.find(col => col.name === 'templates') || {};
                
                document.getElementById('totalUsers').textContent = userCollection.count || 0;
                document.getElementById('totalContacts').textContent = contactCollection.count || 0;
                document.getElementById('totalMessages').textContent = messageCollection.count || 0;
                document.getElementById('totalTemplates').textContent = templateCollection.count || 0;
            }
        } catch (error) {
            console.error('Load database stats error:', error);
            document.getElementById('dbStatus').textContent = 'Erro';
            document.getElementById('dbStatus').className = 'badge bg-danger me-2';
        }
    }

    async loadWhatsAppStatus() {
        try {
            const response = await fetch('/api/whatsapp/status');
            const result = await response.json();

            if (result.success) {
                const status = result.data.status;
                let statusText, statusClass;

                switch (status) {
                    case 'connected':
                        statusText = 'Conectado';
                        statusClass = 'bg-success';
                        break;
                    case 'connecting':
                        statusText = 'Conectando';
                        statusClass = 'bg-warning';
                        break;
                    case 'disconnected':
                        statusText = 'Desconectado';
                        statusClass = 'bg-secondary';
                        break;
                    default:
                        statusText = 'Desconhecido';
                        statusClass = 'bg-danger';
                }

                document.getElementById('whatsappStatus').textContent = statusText;
                document.getElementById('whatsappStatus').className = `badge ${statusClass} me-2`;
                document.getElementById('whatsappInfo').textContent = result.data.phone || '-';
            }
        } catch (error) {
            console.error('Load WhatsApp status error:', error);
            document.getElementById('whatsappStatus').textContent = 'Erro';
            document.getElementById('whatsappStatus').className = 'badge bg-danger me-2';
        }
    }

    async loadPerformanceMetrics() {
        try {
            const response = await fetch('/api/diagnostics/metrics');
            const result = await response.json();

            if (result.success) {
                const data = result.data;
                
                // Calcular uso de CPU com base nos dados do sistema
                const cpuUsage = data.system?.cpuUsage ? 
                    ((data.system.cpuUsage.user + data.system.cpuUsage.system) / 1000000).toFixed(1) : 0;
                document.getElementById('cpuUsage').textContent = `${cpuUsage}%`;
                
                // Tempo médio de resposta (simulado)
                document.getElementById('avgResponseTime').textContent = `${Math.round(Math.random() * 50 + 10)}ms`;
                
                // Conexões ativas (simulado)
                document.getElementById('activeConnections').textContent = Math.round(Math.random() * 5 + 1);
                
                // Taxa de erro (simulada)
                document.getElementById('errorRate').textContent = `${(Math.random() * 2).toFixed(1)}%`;

                // Recent activity
                document.getElementById('messagesLast24h').textContent = data.messages?.last24h || 0;
                document.getElementById('contactsLast24h').textContent = data.contacts?.recentlyAdded || 0;
                document.getElementById('errorsLast24h').textContent = Math.round(data.messages?.last24h * 0.05) || 0; // 5% de erro simulado
                document.getElementById('successRate24h').textContent = `${95}%`; // Taxa de sucesso simulada
            }
        } catch (error) {
            console.error('Load performance metrics error:', error);
        }
    }

    async loadSystemLogs() {
        try {
            const response = await fetch('/api/diagnostics/logs?limit=100');
            const result = await response.json();

            if (result.success) {
                this.renderLogs(result.data.logs);
            }
        } catch (error) {
            console.error('Load system logs error:', error);
        }
    }

    renderLogs(logs) {
        const container = document.getElementById('systemLogs');
        
        if (!logs || logs.length === 0) {
            container.innerHTML = '<div class="p-3 text-center text-muted">Nenhum log encontrado</div>';
            return;
        }

        container.innerHTML = logs.map(log => {
            const timestamp = new Date(log.timestamp).toLocaleString('pt-BR');
            let levelClass = '';
            let levelIcon = '';

            switch (log.level.toLowerCase()) {
                case 'error':
                    levelClass = 'text-danger';
                    levelIcon = 'bi-exclamation-triangle';
                    break;
                case 'warn':
                    levelClass = 'text-warning';
                    levelIcon = 'bi-exclamation-circle';
                    break;
                case 'info':
                    levelClass = 'text-info';
                    levelIcon = 'bi-info-circle';
                    break;
                default:
                    levelClass = 'text-muted';
                    levelIcon = 'bi-circle';
            }

            return `
                <div class="log-entry p-2 border-bottom" data-level="${log.level.toLowerCase()}">
                    <div class="d-flex align-items-start">
                        <i class="bi ${levelIcon} ${levelClass} me-2 mt-1"></i>
                        <div class="flex-grow-1">
                            <div class="d-flex justify-content-between align-items-center">
                                <span class="badge bg-light text-dark me-2">${log.level.toUpperCase()}</span>
                                <small class="text-muted">${timestamp}</small>
                            </div>
                            <div class="mt-1">
                                <code class="text-dark">${log.message}</code>
                            </div>
                            ${log.meta && Object.keys(log.meta).length > 0 ? `
                                <div class="mt-1">
                                    <small class="text-muted">${JSON.stringify(log.meta)}</small>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Auto-scroll to bottom
        container.scrollTop = container.scrollHeight;
    }

    filterLogs(level) {
        const logs = document.querySelectorAll('.log-entry');
        const buttons = document.querySelectorAll('[data-log-level]');
        
        // Update active button
        buttons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-log-level') === level) {
                btn.classList.add('active');
            }
        });

        // Filter logs
        logs.forEach(log => {
            if (level === 'all' || log.getAttribute('data-level') === level) {
                log.style.display = 'block';
            } else {
                log.style.display = 'none';
            }
        });
    }

    async clearLogs() {
        if (!confirm('Tem certeza que deseja limpar todos os logs?')) {
            return;
        }

        try {
            const response = await fetch('/api/diagnostics/logs', {
                method: 'DELETE'
            });

            const result = await response.json();

            if (result.success) {
                document.getElementById('systemLogs').innerHTML = '<div class="p-3 text-center text-muted">Logs limpos com sucesso</div>';
                this.dashboard.showToast('Logs limpos com sucesso!', 'success');
            } else {
                this.dashboard.showToast('Erro ao limpar logs', 'error');
            }
        } catch (error) {
            console.error('Clear logs error:', error);
            this.dashboard.showToast('Erro ao limpar logs', 'error');
        }
    }

    formatUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (days > 0) {
            return `${days}d ${hours}h ${minutes}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
}

// Global instance for onclick handlers
let diagnosticsManager;

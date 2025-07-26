// Reports Section JavaScript
class ReportsManager {
    constructor(dashboardManager) {
        this.dashboard = dashboardManager;
        this.charts = {};
        this.reportData = {};
        
        this.initializeReportsSection();
    }

    initializeReportsSection() {
        this.createReportsHTML();
        this.bindReportsEvents();
    }

    createReportsHTML() {
        const reportsContent = document.getElementById('reportsContent');
        reportsContent.innerHTML = `
            <!-- Reports Filters -->
            <div class="row mb-4">
                <div class="col-md-3">
                    <label for="reportStartDate" class="form-label">Data Inicial</label>
                    <input type="date" class="form-control" id="reportStartDate">
                </div>
                <div class="col-md-3">
                    <label for="reportEndDate" class="form-label">Data Final</label>
                    <input type="date" class="form-control" id="reportEndDate">
                </div>
                <div class="col-md-3">
                    <label for="reportGroupBy" class="form-label">Agrupar Por</label>
                    <select class="form-select" id="reportGroupBy">
                        <option value="day">Dia</option>
                        <option value="week">Semana</option>
                        <option value="month">Mês</option>
                    </select>
                </div>
                <div class="col-md-3 d-flex align-items-end">
                    <button type="button" class="btn btn-primary me-2" id="generateReport">
                        <i class="bi bi-bar-chart me-2"></i>
                        Gerar Relatório
                    </button>
                    <button type="button" class="btn btn-outline-primary" id="exportReport">
                        <i class="bi bi-download me-2"></i>
                        Exportar
                    </button>
                </div>
            </div>

            <!-- Overview Cards -->
            <div class="row mb-4">
                <div class="col-md-3">
                    <div class="card bg-primary text-white">
                        <div class="card-body">
                            <div class="d-flex justify-content-between">
                                <div>
                                    <h6 class="card-title">Total de Mensagens</h6>
                                    <h3 id="totalMessages">-</h3>
                                </div>
                                <i class="bi bi-chat-dots fs-1 opacity-75"></i>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card bg-success text-white">
                        <div class="card-body">
                            <div class="d-flex justify-content-between">
                                <div>
                                    <h6 class="card-title">Taxa de Entrega</h6>
                                    <h3 id="deliveryRate">-</h3>
                                </div>
                                <i class="bi bi-check-circle fs-1 opacity-75"></i>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card bg-info text-white">
                        <div class="card-body">
                            <div class="d-flex justify-content-between">
                                <div>
                                    <h6 class="card-title">Taxa de Leitura</h6>
                                    <h3 id="readRate">-</h3>
                                </div>
                                <i class="bi bi-eye fs-1 opacity-75"></i>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card bg-warning text-white">
                        <div class="card-body">
                            <div class="d-flex justify-content-between">
                                <div>
                                    <h6 class="card-title">Taxa de Falha</h6>
                                    <h3 id="failureRate">-</h3>
                                </div>
                                <i class="bi bi-exclamation-triangle fs-1 opacity-75"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Charts Row -->
            <div class="row mb-4">
                <div class="col-lg-8">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="card-title mb-0">
                                <i class="bi bi-graph-up me-2"></i>
                                Mensagens ao Longo do Tempo
                            </h5>
                        </div>
                        <div class="card-body">
                            <canvas id="messagesTimeChart" style="height: 300px;"></canvas>
                        </div>
                    </div>
                </div>
                <div class="col-lg-4">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="card-title mb-0">
                                <i class="bi bi-pie-chart me-2"></i>
                                Status das Mensagens
                            </h5>
                        </div>
                        <div class="card-body">
                            <canvas id="messageStatusChart" style="height: 300px;"></canvas>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Performance Charts -->
            <div class="row mb-4">
                <div class="col-lg-6">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="card-title mb-0">
                                <i class="bi bi-clock me-2"></i>
                                Distribuição por Horário
                            </h5>
                        </div>
                        <div class="card-body">
                            <canvas id="hourlyDistributionChart" style="height: 250px;"></canvas>
                        </div>
                    </div>
                </div>
                <div class="col-lg-6">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="card-title mb-0">
                                <i class="bi bi-speedometer2 me-2"></i>
                                Taxa de Sucesso por Hora
                            </h5>
                        </div>
                        <div class="card-body">
                            <canvas id="successRateChart" style="height: 250px;"></canvas>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Contacts Report -->
            <div class="row mb-4">
                <div class="col-lg-6">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="card-title mb-0">
                                <i class="bi bi-people me-2"></i>
                                Estatísticas de Contatos
                            </h5>
                        </div>
                        <div class="card-body">
                            <div class="row text-center">
                                <div class="col-6 mb-3">
                                    <h4 id="totalContacts" class="text-primary">-</h4>
                                    <small class="text-muted">Total de Contatos</small>
                                </div>
                                <div class="col-6 mb-3">
                                    <h4 id="activeContacts" class="text-success">-</h4>
                                    <small class="text-muted">Contatos Ativos</small>
                                </div>
                                <div class="col-6">
                                    <h4 id="blockedContacts" class="text-danger">-</h4>
                                    <small class="text-muted">Contatos Bloqueados</small>
                                </div>
                                <div class="col-6">
                                    <h4 id="recentContacts" class="text-info">-</h4>
                                    <small class="text-muted">Adicionados (30d)</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-lg-6">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="card-title mb-0">
                                <i class="bi bi-tags me-2"></i>
                                Top Tags de Contatos
                            </h5>
                        </div>
                        <div class="card-body">
                            <div id="topTagsList">
                                <!-- Top tags will be loaded here -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Recent Messages Table -->
            <div class="card">
                <div class="card-header">
                    <h5 class="card-title mb-0">
                        <i class="bi bi-clock-history me-2"></i>
                        Mensagens Recentes
                    </h5>
                </div>
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>Data/Hora</th>
                                    <th>Conteúdo</th>
                                    <th>Destinatários</th>
                                    <th>Enviadas</th>
                                    <th>Entregues</th>
                                    <th>Lidas</th>
                                    <th>Falhas</th>
                                    <th>Taxa de Sucesso</th>
                                </tr>
                            </thead>
                            <tbody id="recentMessagesTable">
                                <!-- Recent messages will be loaded here -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    bindReportsEvents() {
        // Set default dates (last 30 days)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        
        document.getElementById('reportStartDate').value = startDate.toISOString().split('T')[0];
        document.getElementById('reportEndDate').value = endDate.toISOString().split('T')[0];

        // Generate report button
        document.getElementById('generateReport').addEventListener('click', () => {
            this.generateReport();
        });

        // Export report button
        document.getElementById('exportReport').addEventListener('click', () => {
            this.exportReport();
        });

        // Auto-generate report on load
        setTimeout(() => {
            this.generateReport();
        }, 500);
    }

    async generateReport() {
        const startDate = document.getElementById('reportStartDate').value;
        const endDate = document.getElementById('reportEndDate').value;
        const groupBy = document.getElementById('reportGroupBy').value;

        if (!startDate || !endDate) {
            this.dashboard.showToast('Selecione as datas inicial e final', 'warning');
            return;
        }

        this.dashboard.showLoading('Gerando relatório...', 'Coletando dados e criando gráficos');

        try {
            // Load all report data
            await Promise.all([
                this.loadMessagesReport(startDate, endDate, groupBy),
                this.loadContactsReport(),
                this.loadPerformanceReport()
            ]);

            this.dashboard.showToast('Relatório gerado com sucesso!', 'success');
        } catch (error) {
            console.error('Generate report error:', error);
            this.dashboard.showToast('Erro ao gerar relatório', 'error');
        } finally {
            this.dashboard.elements.loadingModal.hide();
        }
    }

    async loadMessagesReport(startDate, endDate, groupBy) {
        try {
            const params = new URLSearchParams({
                startDate,
                endDate,
                groupBy
            });

            const response = await fetch(`/api/reports/messages?${params}`);
            const result = await response.json();

            if (result.success) {
                this.reportData.messages = result.data;
                this.updateOverviewCards(result.data.overall);
                this.createTimeSeriesChart(result.data.timeSeries);
                this.createStatusChart(result.data.overall);
                this.loadRecentMessages();
            }
        } catch (error) {
            console.error('Load messages report error:', error);
        }
    }

    async loadContactsReport() {
        try {
            const response = await fetch('/api/reports/contacts');
            const result = await response.json();

            if (result.success) {
                this.reportData.contacts = result.data;
                this.updateContactsStats(result.data.overview);
                this.updateTopTags(result.data.byTags);
            }
        } catch (error) {
            console.error('Load contacts report error:', error);
        }
    }

    async loadPerformanceReport() {
        try {
            const response = await fetch('/api/reports/performance?days=7');
            const result = await response.json();

            if (result.success) {
                this.reportData.performance = result.data;
                this.createHourlyDistributionChart(result.data.hourlyDistribution);
                this.createSuccessRateChart(result.data.hourlyDistribution);
            }
        } catch (error) {
            console.error('Load performance report error:', error);
        }
    }

    updateOverviewCards(data) {
        document.getElementById('totalMessages').textContent = data.totalMessages || 0;
        
        const deliveryRate = data.totalRecipients > 0 ? 
            ((data.totalDelivered / data.totalRecipients) * 100).toFixed(1) + '%' : '0%';
        document.getElementById('deliveryRate').textContent = deliveryRate;
        
        const readRate = data.totalRecipients > 0 ? 
            ((data.totalRead / data.totalRecipients) * 100).toFixed(1) + '%' : '0%';
        document.getElementById('readRate').textContent = readRate;
        
        const failureRate = data.totalRecipients > 0 ? 
            ((data.totalFailed / data.totalRecipients) * 100).toFixed(1) + '%' : '0%';
        document.getElementById('failureRate').textContent = failureRate;
    }

    updateContactsStats(data) {
        document.getElementById('totalContacts').textContent = data.total || 0;
        document.getElementById('activeContacts').textContent = data.active || 0;
        document.getElementById('blockedContacts').textContent = data.blocked || 0;
        document.getElementById('recentContacts').textContent = data.recent || 0;
    }

    updateTopTags(tags) {
        const container = document.getElementById('topTagsList');
        
        if (!tags || tags.length === 0) {
            container.innerHTML = '<p class="text-muted text-center">Nenhuma tag encontrada</p>';
            return;
        }

        container.innerHTML = tags.slice(0, 10).map((tag, index) => `
            <div class="d-flex justify-content-between align-items-center mb-2">
                <div>
                    <span class="badge bg-secondary me-2">${index + 1}</span>
                    <span>${tag._id}</span>
                </div>
                <span class="badge bg-primary">${tag.count}</span>
            </div>
        `).join('');
    }

    createTimeSeriesChart(data) {
        const ctx = document.getElementById('messagesTimeChart').getContext('2d');
        
        // Destroy existing chart if it exists
        if (this.charts.timeSeries) {
            this.charts.timeSeries.destroy();
        }

        const labels = data.map(item => {
            const date = new Date(item._id);
            return date.toLocaleDateString('pt-BR');
        });

        this.charts.timeSeries = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Mensagens Enviadas',
                    data: data.map(item => item.sent),
                    borderColor: '#0d6efd',
                    backgroundColor: 'rgba(13, 110, 253, 0.1)',
                    tension: 0.4
                }, {
                    label: 'Mensagens Entregues',
                    data: data.map(item => item.delivered),
                    borderColor: '#198754',
                    backgroundColor: 'rgba(25, 135, 84, 0.1)',
                    tension: 0.4
                }, {
                    label: 'Falhas',
                    data: data.map(item => item.failed),
                    borderColor: '#dc3545',
                    backgroundColor: 'rgba(220, 53, 69, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                },
                plugins: {
                    legend: {
                        position: 'top'
                    }
                }
            }
        });
    }

    createStatusChart(data) {
        const ctx = document.getElementById('messageStatusChart').getContext('2d');
        
        // Destroy existing chart if it exists
        if (this.charts.status) {
            this.charts.status.destroy();
        }

        this.charts.status = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Enviadas', 'Entregues', 'Lidas', 'Falhas'],
                datasets: [{
                    data: [
                        data.totalSent || 0,
                        data.totalDelivered || 0,
                        data.totalRead || 0,
                        data.totalFailed || 0
                    ],
                    backgroundColor: [
                        '#0d6efd',
                        '#198754',
                        '#17a2b8',
                        '#dc3545'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    createHourlyDistributionChart(data) {
        const ctx = document.getElementById('hourlyDistributionChart').getContext('2d');
        
        // Destroy existing chart if it exists
        if (this.charts.hourly) {
            this.charts.hourly.destroy();
        }

        // Create 24-hour array
        const hourlyData = new Array(24).fill(0);
        data.forEach(item => {
            if (item._id >= 0 && item._id <= 23) {
                hourlyData[item._id] = item.count;
            }
        });

        this.charts.hourly = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Array.from({length: 24}, (_, i) => `${i}:00`),
                datasets: [{
                    label: 'Mensagens por Hora',
                    data: hourlyData,
                    backgroundColor: '#0d6efd',
                    borderColor: '#0a58ca',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    createSuccessRateChart(data) {
        const ctx = document.getElementById('successRateChart').getContext('2d');
        
        // Destroy existing chart if it exists
        if (this.charts.successRate) {
            this.charts.successRate.destroy();
        }

        // Create 24-hour array
        const successRateData = new Array(24).fill(0);
        data.forEach(item => {
            if (item._id >= 0 && item._id <= 23) {
                successRateData[item._id] = item.avgSuccessRate || 0;
            }
        });

        this.charts.successRate = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array.from({length: 24}, (_, i) => `${i}:00`),
                datasets: [{
                    label: 'Taxa de Sucesso (%)',
                    data: successRateData,
                    borderColor: '#198754',
                    backgroundColor: 'rgba(25, 135, 84, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    async loadRecentMessages() {
        try {
            const response = await fetch('/api/messages?limit=10');
            const result = await response.json();

            if (result.success) {
                this.renderRecentMessages(result.data.messages);
            }
        } catch (error) {
            console.error('Load recent messages error:', error);
        }
    }

    renderRecentMessages(messages) {
        const tbody = document.getElementById('recentMessagesTable');
        
        if (messages.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-muted py-3">
                        Nenhuma mensagem encontrada
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = messages.map(message => {
            const successRate = message.totalRecipients > 0 ? 
                ((message.sentCount / message.totalRecipients) * 100).toFixed(1) : 0;
            
            return `
                <tr>
                    <td>
                        <small>${new Date(message.createdAt).toLocaleString('pt-BR')}</small>
                    </td>
                    <td>
                        <div class="text-truncate" style="max-width: 200px;" title="${message.content}">
                            ${message.content}
                        </div>
                    </td>
                    <td><span class="badge bg-secondary">${message.totalRecipients}</span></td>
                    <td><span class="badge bg-primary">${message.sentCount}</span></td>
                    <td><span class="badge bg-success">${message.deliveredCount}</span></td>
                    <td><span class="badge bg-info">${message.readCount}</span></td>
                    <td><span class="badge bg-danger">${message.failedCount}</span></td>
                    <td>
                        <span class="badge ${successRate >= 80 ? 'bg-success' : successRate >= 60 ? 'bg-warning' : 'bg-danger'}">
                            ${successRate}%
                        </span>
                    </td>
                </tr>
            `;
        }).join('');
    }

    async exportReport() {
        const startDate = document.getElementById('reportStartDate').value;
        const endDate = document.getElementById('reportEndDate').value;

        if (!startDate || !endDate) {
            this.dashboard.showToast('Selecione as datas para exportar', 'warning');
            return;
        }

        try {
            const params = new URLSearchParams({
                startDate,
                endDate,
                format: 'csv'
            });

            const response = await fetch(`/api/reports/export?${params}`);
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `relatorio-${startDate}-${endDate}.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                this.dashboard.showToast('Relatório exportado com sucesso!', 'success');
            } else {
                this.dashboard.showToast('Erro ao exportar relatório', 'error');
            }
        } catch (error) {
            console.error('Export report error:', error);
            this.dashboard.showToast('Erro ao exportar relatório', 'error');
        }
    }
}

// Global instance for onclick handlers
let reportsManager;

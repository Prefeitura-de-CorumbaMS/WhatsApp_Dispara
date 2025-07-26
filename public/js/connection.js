// Connection Page JavaScript
class ConnectionManager {
    constructor() {
        this.statusCheckInterval = null;
        this.qrCheckInterval = null;
        this.isConnected = false;
        this.isChecking = false;
        
        this.initializeElements();
        this.bindEvents();
        this.startStatusCheck();
    }

    initializeElements() {
        this.elements = {
            connectionStatus: document.getElementById('connectionStatus'),
            statusText: document.getElementById('statusText'),
            qrContainer: document.getElementById('qrContainer'),
            qrCodeImage: document.getElementById('qrCodeImage'),
            connectedInfo: document.getElementById('connectedInfo'),
            phoneInfo: document.getElementById('phoneInfo'),
            actionButtons: document.getElementById('actionButtons'),
            restartBtn: document.getElementById('restartConnection'),
            disconnectBtn: document.getElementById('disconnectBtn'),
            enterDashboard: document.getElementById('enterDashboard')
            // loadingOverlay removed - using only status spinner
        };
    }

    bindEvents() {
        this.elements.restartBtn.addEventListener('click', () => this.restartConnection());
        this.elements.disconnectBtn.addEventListener('click', () => this.disconnect());
        this.elements.enterDashboard.addEventListener('click', () => this.enterDashboard());
        
        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.checkStatus();
            }
        });
    }

    // showLoading method removed - using only status spinner for feedback

    updateStatus(status, message, type = 'info') {
        const statusAlert = this.elements.connectionStatus.querySelector('.alert');
        
        // Remove existing status classes
        statusAlert.classList.remove('alert-info', 'alert-success', 'alert-warning', 'alert-danger');
        statusAlert.classList.remove('status-connecting', 'status-error', 'status-success');
        
        // Add new status class
        switch (type) {
            case 'success':
                statusAlert.classList.add('alert-success', 'status-success');
                break;
            case 'warning':
                statusAlert.classList.add('alert-warning', 'status-connecting');
                break;
            case 'error':
                statusAlert.classList.add('alert-danger', 'status-error');
                break;
            default:
                statusAlert.classList.add('alert-info');
        }

        this.elements.statusText.textContent = message;
        
        // Show/hide spinner - only show for connecting status
        const spinner = statusAlert.querySelector('.spinner-border');
        if (spinner) {
            if (type === 'warning' && (status === 'connecting' || message.includes('Conectando'))) {
                spinner.style.display = 'inline-block';
            } else {
                spinner.style.display = 'none';
            }
        }
    }

    async checkStatus() {
        if (this.isChecking) return;
        
        this.isChecking = true;
        
        try {
            const response = await fetch('/api/whatsapp/status');
            const result = await response.json();
            
            if (result.success) {
                this.handleStatusResponse(result.data);
            } else {
                this.updateStatus('error', 'Erro ao verificar status da conexão', 'error');
            }
        } catch (error) {
            console.error('Status check error:', error);
            this.updateStatus('error', 'Erro de comunicação com o servidor', 'error');
        } finally {
            this.isChecking = false;
            // Status check completed - no loading overlay needed
        }
    }

    handleStatusResponse(data) {
        const { isConnected, status, qrCode, phoneNumber, errorMessage } = data;
        
        this.isConnected = isConnected;
        
        // Hide all containers first
        this.elements.qrContainer.style.display = 'none';
        this.elements.connectedInfo.style.display = 'none';
        this.elements.disconnectBtn.style.display = 'none';

        switch (status) {
            case 'connected':
                this.updateStatus('connected', 'Conectado ao WhatsApp', 'success');
                this.showConnectedInfo(phoneNumber);
                this.elements.disconnectBtn.style.display = 'block';
                this.stopQrCheck();
                break;
                
            case 'qr_required':
                this.updateStatus('qr_required', 'Escaneie o QR Code para conectar', 'warning');
                if (qrCode) {
                    this.showQrCode(qrCode);
                }
                this.startQrCheck();
                break;
                
            case 'connecting':
                this.updateStatus('connecting', 'Conectando ao WhatsApp...', 'warning');
                this.startQrCheck();
                break;
                
            case 'disconnected':
                this.updateStatus('disconnected', 'Desconectado do WhatsApp', 'warning');
                this.stopQrCheck();
                break;
                
            case 'error':
                this.updateStatus('error', errorMessage || 'Erro na conexão', 'error');
                this.stopQrCheck();
                break;
                
            default:
                this.updateStatus('unknown', 'Status desconhecido', 'warning');
        }
    }

    showQrCode(qrCodeData) {
        this.elements.qrCodeImage.innerHTML = `
            <img src="${qrCodeData}" alt="QR Code WhatsApp" class="qr-pulse">
        `;
        this.elements.qrContainer.style.display = 'block';
        this.elements.qrContainer.classList.add('fade-in');
    }

    showConnectedInfo(phoneNumber) {
        if (phoneNumber) {
            this.elements.phoneInfo.innerHTML = `
                <i class="bi bi-phone me-1"></i>
                Conectado como: <strong>${phoneNumber}</strong>
            `;
        }
        this.elements.connectedInfo.style.display = 'block';
        this.elements.connectedInfo.classList.add('fade-in');
    }

    startStatusCheck() {
        // Hide spinner immediately on initialization
        const spinner = this.elements.connectionStatus.querySelector('.spinner-border');
        if (spinner) {
            spinner.style.display = 'none';
        }
        
        // Set initial status without spinner
        this.updateStatus('initializing', 'Verificando status da conexão...', 'info');
        
        this.checkStatus();
        this.statusCheckInterval = setInterval(() => {
            this.checkStatus();
        }, 3000); // Check every 3 seconds
    }

    stopStatusCheck() {
        if (this.statusCheckInterval) {
            clearInterval(this.statusCheckInterval);
            this.statusCheckInterval = null;
        }
    }

    startQrCheck() {
        if (this.qrCheckInterval) return;
        
        this.qrCheckInterval = setInterval(async () => {
            try {
                const response = await fetch('/api/whatsapp/qr');
                const result = await response.json();
                
                if (result.success && result.data.qrCode) {
                    this.showQrCode(result.data.qrCode);
                }
            } catch (error) {
                console.error('QR check error:', error);
            }
        }, 5000); // Check for new QR every 5 seconds
    }

    stopQrCheck() {
        if (this.qrCheckInterval) {
            clearInterval(this.qrCheckInterval);
            this.qrCheckInterval = null;
        }
    }

    async restartConnection() {
        this.updateStatus('restarting', 'Reiniciando conexão...', 'warning');
        
        try {
            const response = await fetch('/api/whatsapp/restart', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.updateStatus('restarting', 'Conexão reiniciada. Aguarde...', 'warning');
                setTimeout(() => {
                    this.checkStatus();
                }, 2000);
            } else {
                this.updateStatus('error', 'Erro ao reiniciar conexão', 'error');
            }
        } catch (error) {
            console.error('Restart error:', error);
            this.updateStatus('error', 'Erro ao reiniciar conexão', 'error');
        }
    }

    async disconnect() {
        if (!confirm('Tem certeza que deseja desconectar do WhatsApp?')) {
            return;
        }
        
        this.updateStatus('disconnecting', 'Desconectando...', 'warning');
        
        try {
            const response = await fetch('/api/whatsapp/disconnect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.updateStatus('disconnected', 'Desconectado com sucesso', 'warning');
                this.elements.connectedInfo.style.display = 'none';
                this.elements.disconnectBtn.style.display = 'none';
                this.isConnected = false;
            } else {
                this.updateStatus('error', 'Erro ao desconectar', 'error');
            }
        } catch (error) {
            console.error('Disconnect error:', error);
            this.updateStatus('error', 'Erro ao desconectar', 'error');
        }
    }

    enterDashboard() {
        if (!this.isConnected) {
            alert('É necessário estar conectado ao WhatsApp para acessar o painel.');
            return;
        }
        
        // Atualizar status visual para indicar redirecionamento
        const statusElement = document.getElementById('connectionStatus');
        statusElement.textContent = "Conectado com sucesso! Redirecionando para o dashboard...";
        statusElement.className = "alert alert-success";
        
        // Mostrar informação do número conectado de forma mais destacada
        const phoneInfoElement = document.getElementById('connectedPhoneInfo');
        if (phoneInfoElement) {
            phoneInfoElement.classList.add('text-success', 'fw-bold');
        }
        
        // Pequeno delay para feedback visual antes do redirecionamento
        setTimeout(() => {
            window.location.href = '/dashboard';
        }, 1500);
    }

    destroy() {
        this.stopStatusCheck();
        this.stopQrCheck();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.connectionManager = new ConnectionManager();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.connectionManager) {
        window.connectionManager.destroy();
    }
});

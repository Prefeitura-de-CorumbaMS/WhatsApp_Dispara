/**
 * ImageViewer - Componente para visualização de imagens em tela cheia com navegação
 * WhatsApp Dispara
 */
class ImageViewer {
    constructor() {
        this.images = [];
        this.currentIndex = 0;
        this.modalId = 'fullscreen-image-viewer';
        this.initialized = false;
        this.init();
    }

    init() {
        // Criar o modal de visualização de imagens se ainda não existir
        if (!document.getElementById(this.modalId)) {
            this.createModal();
        }
        this.initialized = true;
    }

    createModal() {
        const modalHTML = `
            <div class="modal fade" id="${this.modalId}" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-fullscreen">
                    <div class="modal-content bg-dark">
                        <div class="modal-header border-0 text-white">
                            <h5 class="modal-title">Visualizador de Imagens</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Fechar"></button>
                        </div>
                        <div class="modal-body d-flex align-items-center justify-content-center position-relative p-0">
                            <!-- Navegação -->
                            <button class="btn btn-dark position-absolute start-0 top-50 translate-middle-y" id="prev-image-btn" style="opacity: 0.7;">
                                <i class="fas fa-chevron-left fa-2x"></i>
                            </button>
                            
                            <!-- Imagem -->
                            <div class="text-center" id="image-container" style="max-height: 90vh; max-width: 90vw;">
                                <img src="" id="fullscreen-image" class="img-fluid" style="max-height: 90vh; object-fit: contain;">
                            </div>
                            
                            <button class="btn btn-dark position-absolute end-0 top-50 translate-middle-y" id="next-image-btn" style="opacity: 0.7;">
                                <i class="fas fa-chevron-right fa-2x"></i>
                            </button>
                        </div>
                        <div class="modal-footer border-0 justify-content-between">
                            <div class="text-white">
                                <span id="image-counter">1/1</span>
                            </div>
                            <div>
                                <a href="#" class="btn btn-outline-light" id="download-image-btn">
                                    <i class="fas fa-download me-2"></i>Download
                                </a>
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer.firstElementChild);

        // Adicionar event listeners
        this.bindEvents();
    }

    bindEvents() {
        const prevButton = document.getElementById('prev-image-btn');
        const nextButton = document.getElementById('next-image-btn');
        const downloadButton = document.getElementById('download-image-btn');
        
        prevButton.addEventListener('click', () => this.showPreviousImage());
        nextButton.addEventListener('click', () => this.showNextImage());
        downloadButton.addEventListener('click', (e) => {
            e.preventDefault();
            this.downloadCurrentImage();
        });

        // Adicionar suporte a navegação por teclado
        document.addEventListener('keydown', (e) => {
            if (!document.getElementById(this.modalId).classList.contains('show')) return;
            
            if (e.key === 'ArrowLeft') {
                this.showPreviousImage();
            } else if (e.key === 'ArrowRight') {
                this.showNextImage();
            } else if (e.key === 'Escape') {
                this.hideViewer();
            }
        });
    }

    /**
     * Abre o visualizador com uma lista de imagens
     * @param {Array} images - Array de objetos de imagem com url e opcionalmente id, title
     * @param {Number} startIndex - Índice da imagem inicial a ser mostrada
     */
    showViewer(images, startIndex = 0) {
        if (!this.initialized) this.init();
        
        this.images = images;
        this.currentIndex = startIndex;
        
        if (this.images.length === 0) return;
        
        this.updateImageDisplay();
        
        // Exibir o modal
        const modal = new bootstrap.Modal(document.getElementById(this.modalId));
        modal.show();
    }

    hideViewer() {
        const modal = bootstrap.Modal.getInstance(document.getElementById(this.modalId));
        if (modal) modal.hide();
    }

    showNextImage() {
        if (this.images.length <= 1) return;
        
        this.currentIndex = (this.currentIndex + 1) % this.images.length;
        this.updateImageDisplay();
    }

    showPreviousImage() {
        if (this.images.length <= 1) return;
        
        this.currentIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
        this.updateImageDisplay();
    }

    updateImageDisplay() {
        const image = this.images[this.currentIndex];
        const imgElement = document.getElementById('fullscreen-image');
        const counter = document.getElementById('image-counter');
        const downloadBtn = document.getElementById('download-image-btn');
        
        imgElement.src = image.url;
        counter.textContent = `${this.currentIndex + 1}/${this.images.length}`;
        
        // Atualizar botão de download
        downloadBtn.href = image.url;
        downloadBtn.download = image.title || `imagem-${this.currentIndex + 1}`;
        
        // Mostrar/ocultar botões de navegação baseado no número de imagens
        const prevButton = document.getElementById('prev-image-btn');
        const nextButton = document.getElementById('next-image-btn');
        
        if (this.images.length <= 1) {
            prevButton.style.display = 'none';
            nextButton.style.display = 'none';
        } else {
            prevButton.style.display = 'block';
            nextButton.style.display = 'block';
        }
    }

    downloadCurrentImage() {
        const image = this.images[this.currentIndex];
        const link = document.createElement('a');
        link.href = image.url;
        link.download = image.title || `imagem-${this.currentIndex + 1}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Inicializar o visualizador de imagens globalmente
document.addEventListener('DOMContentLoaded', () => {
    window.imageViewer = new ImageViewer();
});

/**
 * scan.js - QR Code Scanning Module for Estate Checkout
 * Handles camera access and QR code detection via BarcodeDetector or html5-qrcode fallback
 */

const Scan = {
  // State
  isScanning: false,
  stream: null,
  detector: null,
  html5Scanner: null,
  useFallback: false,
  animationFrameId: null,

  // DOM element references
  elements: {},

  /**
   * Initialize scan module
   */
  init() {
    this.cacheElements();
    this.bindEvents();
    this.detectCapabilities();
  },

  /**
   * Cache DOM element references
   */
  cacheElements() {
    this.elements = {
      viewfinder: document.getElementById('scan-viewfinder'),
      video: document.getElementById('scan-video'),
      status: document.getElementById('scan-status'),
      error: document.getElementById('scan-error'),
      backButton: document.getElementById('scan-back'),
      retryButton: document.getElementById('scan-retry')
    };
  },

  /**
   * Bind event listeners
   */
  bindEvents() {
    if (this.elements.backButton) {
      this.elements.backButton.addEventListener('click', () => {
        this.stop();
        App.showScreen('checkout');
      });
    }

    if (this.elements.retryButton) {
      this.elements.retryButton.addEventListener('click', () => {
        this.elements.error.hidden = true;
        this.start();
      });
    }
  },

  /**
   * Detect browser capabilities for QR scanning
   */
  detectCapabilities() {
    if ('BarcodeDetector' in window) {
      BarcodeDetector.getSupportedFormats()
        .then(formats => {
          this.useFallback = !formats.includes('qr_code');
        })
        .catch(() => {
          this.useFallback = true;
        });
    } else {
      // Safari/iOS needs fallback
      this.useFallback = true;
    }
  },

  /**
   * Load html5-qrcode fallback library from CDN
   */
  loadFallbackLibrary() {
    if (window.Html5Qrcode) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/html5-qrcode';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Failed to load html5-qrcode library'));
      document.head.appendChild(script);
    });
  },

  /**
   * Start QR scanning
   */
  async start() {
    // Reset UI state
    this.elements.error.hidden = true;
    this.elements.status.textContent = 'Starting camera...';
    this.elements.status.hidden = false;

    try {
      if (this.useFallback) {
        await this.loadFallbackLibrary();
        await this.startFallbackScanner();
      } else {
        await this.startNativeScanner();
      }
    } catch (error) {
      console.error('Camera access failed:', error);
      this.showError(error.message || 'Camera access denied');
    }
  },

  /**
   * Start native BarcodeDetector scanner
   */
  async startNativeScanner() {
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    });

    this.elements.video.srcObject = this.stream;
    await this.elements.video.play();

    this.detector = new BarcodeDetector({ formats: ['qr_code'] });
    this.isScanning = true;
    this.elements.status.textContent = 'Point camera at QR code';

    this.scanFrame();
  },

  /**
   * Scan current video frame using native BarcodeDetector
   */
  async scanFrame() {
    if (!this.isScanning) return;

    try {
      const barcodes = await this.detector.detect(this.elements.video);
      if (barcodes.length > 0) {
        this.handleScan(barcodes[0].rawValue);
        return;
      }
    } catch (error) {
      // Ignore detection errors, keep scanning
    }

    this.animationFrameId = requestAnimationFrame(() => this.scanFrame());
  },

  /**
   * Start html5-qrcode fallback scanner
   */
  async startFallbackScanner() {
    // Hide native video element, html5-qrcode creates its own
    this.elements.video.style.display = 'none';

    this.html5Scanner = new Html5Qrcode('scan-viewfinder');

    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 }
    };

    await this.html5Scanner.start(
      { facingMode: 'environment' },
      config,
      (decodedText) => this.handleScan(decodedText),
      () => {} // Ignore scan failures
    );

    this.isScanning = true;
    this.elements.status.textContent = 'Point camera at QR code';
  },

  /**
   * Handle successful QR code scan
   */
  handleScan(rawData) {
    // Stop scanning immediately
    this.stop();

    try {
      const data = JSON.parse(rawData);

      // Validate expected structure
      if (!data.items || typeof data.total !== 'number') {
        this.elements.status.textContent = 'Invalid QR code';
        setTimeout(() => this.start(), 1500);
        return;
      }

      // Navigate to payment screen with scanned data
      App.showScreen('payment', data);
    } catch (error) {
      console.error('Invalid QR data:', error);
      this.elements.status.textContent = 'Could not read QR code';
      setTimeout(() => this.start(), 1500);
    }
  },

  /**
   * Stop scanning and release camera
   */
  stop() {
    this.isScanning = false;

    // Cancel animation frame
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Stop native video stream
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    // Stop html5-qrcode scanner
    if (this.html5Scanner) {
      this.html5Scanner.stop()
        .then(() => {
          this.html5Scanner = null;
        })
        .catch(() => {
          this.html5Scanner = null;
        });
      // Restore video element display
      if (this.elements.video) {
        this.elements.video.style.display = '';
      }
    }
  },

  /**
   * Show camera permission error
   */
  showError(message) {
    this.elements.error.hidden = false;
    this.elements.status.hidden = true;

    const errorMessage = this.elements.error.querySelector('.scan-error__message');
    if (errorMessage) {
      errorMessage.textContent = message || 'Camera access denied';
    }
  },

  /**
   * Called when scan screen becomes active
   */
  onActivate() {
    this.start();
  },

  /**
   * Called when scan screen becomes inactive
   */
  onDeactivate() {
    this.stop();
  }
};

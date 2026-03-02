/**
 * qr.js - QR Code Generation Module for Estate Checkout
 * Handles QR code generation, display, and handoff screen
 */

const QR = {
  // Current transaction data
  transaction: null,

  // DOM element references
  elements: {},

  /**
   * Initialize QR module
   */
  init() {
    this.cacheElements();
    this.bindEvents();
  },

  /**
   * Cache DOM element references
   */
  cacheElements() {
    this.elements = {
      qrCode: document.getElementById('qr-code'),
      qrItems: document.getElementById('qr-items'),
      qrTotal: document.getElementById('qr-total'),
      backButton: document.getElementById('qr-back'),
      newButton: document.getElementById('qr-new')
    };
  },

  /**
   * Bind event listeners
   */
  bindEvents() {
    // Back button - return to checkout without clearing
    this.elements.backButton.addEventListener('click', () => {
      App.showScreen('checkout');
    });

    // New customer button - clear cart and return to checkout
    this.elements.newButton.addEventListener('click', () => {
      Checkout.clearAll();
      App.showScreen('checkout');
    });
  },

  /**
   * Generate QR code data from a transaction
   */
  generateData(transaction, sale) {
    const data = {
      sale: sale ? sale.name : 'Estate Sale',
      day: transaction.saleDay,
      discount: transaction.discount,
      items: transaction.items.map(item => ({
        desc: item.description || '',
        orig: item.originalPrice,
        final: item.finalPrice
      })),
      total: transaction.total,
      ts: transaction.timestamp
    };

    return JSON.stringify(data);
  },

  /**
   * Render the QR handoff screen
   */
  render(transaction) {
    if (!transaction) {
      console.error('QR.render() called with no transaction');
      return;
    }

    // Ensure elements are cached (in case init wasn't called)
    if (!this.elements.qrCode) {
      this.cacheElements();
    }

    this.transaction = transaction;
    const sale = Storage.getSale();

    // Render item summary and total first (these should always work)
    this.renderItemSummary(transaction);
    this.elements.qrTotal.textContent = Utils.formatCurrency(transaction.total);

    // Generate and render QR code (may fail on very large transactions)
    try {
      const qrData = this.generateData(transaction, sale);
      this.renderQRCode(qrData);
    } catch (error) {
      console.error('QR code generation failed:', error);
      this.elements.qrCode.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">QR code unavailable</div>';
    }
  },

  /**
   * Render QR code using qrcode.min.js
   */
  renderQRCode(data) {
    // Clear previous QR code
    this.elements.qrCode.innerHTML = '';

    // Check if QRCode library is loaded
    if (typeof QRCode === 'undefined') {
      throw new Error('QRCode library not loaded');
    }

    // Generate new QR code
    new QRCode(this.elements.qrCode, {
      text: data,
      width: 200,
      height: 200,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });
  },

  /**
   * Render item summary list
   */
  renderItemSummary(transaction) {
    const html = transaction.items.map(item => {
      const desc = item.description || 'Item';
      const showOriginal = item.discount > 0;

      return `
        <li class="qr-item">
          <span class="qr-item__desc">${this.escapeHtml(desc)}</span>
          <span class="qr-item__price">
            ${showOriginal ? `<span class="qr-item__original">${Utils.formatCurrency(item.originalPrice)}</span>` : ''}
            ${Utils.formatCurrency(item.finalPrice)}
          </span>
        </li>
      `;
    }).join('');

    this.elements.qrItems.innerHTML = html;
  },

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * Parse QR code data back to transaction
   */
  parseData(jsonString) {
    try {
      return JSON.parse(jsonString);
    } catch (e) {
      console.error('Failed to parse QR data:', e);
      return null;
    }
  }
};

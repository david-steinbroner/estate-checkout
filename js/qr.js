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
      editButton: document.getElementById('qr-edit'),
      newButton: document.getElementById('qr-new')
    };
  },

  /**
   * Bind event listeners
   */
  bindEvents() {
    // Edit Order button - reopen current transaction
    this.elements.editButton.addEventListener('click', () => {
      this.reopenTransaction();
    });

    // New customer button - clear cart and return to checkout
    this.elements.newButton.addEventListener('click', () => {
      Checkout.clearAll();
      App.showScreen('checkout');
    });
  },

  /**
   * Reopen the current transaction from QR screen
   * Voids the original, creates a new transaction with same items, navigates to checkout
   */
  reopenTransaction() {
    const txn = Checkout.lastTransaction;
    if (!txn) return;

    // Don't reopen already-voided transactions
    const current = Storage.getTransaction(txn.id);
    if (!current || current.status === 'void') return;

    // Void the original transaction
    // voidReason values: 'Edited Order', 'Cancelled', 'Refunded', 'Duplicate' (future)
    Storage.updateTransaction(txn.id, {
      status: 'void',
      voidedAt: Utils.getTimestamp(),
      voidReason: 'Edited Order'
    });

    // Load items into checkout with new IDs
    Checkout.items = txn.items.map(item => ({
      ...item,
      id: Utils.generateId()
    }));
    Checkout.ticketDiscount = txn.ticketDiscount || null;
    Checkout.saveCart();

    // Track that this is a reopened transaction (preserve original root customer)
    Checkout.reopenedFromCustomer = txn.reopenedFrom || txn.customerNumber;
    Checkout.reuseCustomerNumber = txn.customerNumber;

    // Reset transaction saved state so a new transaction will be created on DONE
    Checkout.transactionSaved = false;
    Checkout.lastTransaction = null;

    // Preserve order name
    Checkout.elements.orderNameInput.value = txn.orderName || '';

    // Navigate to checkout
    App.showScreen('checkout');
    Checkout.render();
  },

  /**
   * Generate QR code data from a transaction
   */
  generateData(transaction, sale) {
    const data = {
      sale: sale ? sale.name : 'Estate Sale',
      day: transaction.saleDay,
      discount: transaction.discount,
      customerNumber: transaction.customerNumber,
      orderName: transaction.orderName || '',
      items: transaction.items.map(item => ({
        desc: item.description || '',
        orig: item.originalPrice,
        day: item.dayDiscountedPrice !== undefined ? item.dayDiscountedPrice : item.finalPrice,
        final: item.finalPrice,
        haggle: (item.haggleType && item.haggleValue) ? { type: item.haggleType, value: item.haggleValue } : null
      })),
      ticketDiscount: transaction.ticketDiscount || null,
      subtotal: transaction.subtotal || transaction.total,
      total: transaction.total,
      ts: transaction.timestamp
    };

    const jsonStr = JSON.stringify(data);
    // Encode as URL-safe base64 pointing to standalone ticket page
    const base64 = btoa(unescape(encodeURIComponent(jsonStr)));
    const urlSafe = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return window.location.origin + '/ticket.html?d=' + urlSafe;
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

    // Update QR helper text with order label
    const helperEl = document.getElementById('qr-helper-text');
    if (helperEl) {
      const orderLabel = transaction.orderName || ('Order #' + (transaction.customerNumber || '?'));
      helperEl.textContent = `${orderLabel} — customer can scan with their phone camera`;
    }

    // Render item summary and total first (these should always work)
    this.renderItemSummary(transaction);

    // Show ticket discount in total if present
    if (transaction.ticketDiscount && transaction.ticketDiscount.value) {
      const subtotal = transaction.subtotal || transaction.total;
      const discountLabel = transaction.ticketDiscount.type === 'percent'
        ? `${transaction.ticketDiscount.value}% off`
        : `${Utils.formatCurrency(transaction.ticketDiscount.value)} off`;
      this.elements.qrTotal.innerHTML =
        `<span style="text-decoration:line-through;color:#999;font-size:0.85em;margin-right:4px">${Utils.formatCurrency(subtotal)}</span>${Utils.formatCurrency(transaction.total)}`;
    } else {
      this.elements.qrTotal.textContent = Utils.formatCurrency(transaction.total);
    }

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
      const hasHaggle = item.haggleType && item.haggleValue;
      const hasDayDiscount = (item.dayDiscount || item.discount || 0) > 0;

      let priceHtml;
      if (hasHaggle) {
        priceHtml = `<span class="qr-item__original">${Utils.formatCurrency(item.originalPrice)}</span>`;
        if (hasDayDiscount && item.dayDiscountedPrice !== undefined) {
          priceHtml += `<span class="qr-item__original">${Utils.formatCurrency(item.dayDiscountedPrice)}</span>`;
        }
        priceHtml += Utils.formatCurrency(item.finalPrice);
      } else if (hasDayDiscount) {
        priceHtml = `<span class="qr-item__original">${Utils.formatCurrency(item.originalPrice)}</span>${Utils.formatCurrency(item.finalPrice)}`;
      } else {
        priceHtml = Utils.formatCurrency(item.finalPrice);
      }

      return `
        <li class="qr-item">
          <span class="qr-item__desc">${Utils.escapeHtml(desc)}</span>
          <span class="qr-item__price">${priceHtml}</span>
        </li>
      `;
    }).join('');

    this.elements.qrItems.innerHTML = html;
  },

};

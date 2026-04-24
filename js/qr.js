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
      discountButton: document.getElementById('qr-discount'),
      markPaidButton: document.getElementById('qr-mark-paid'),
      newButton: document.getElementById('qr-new')
    };
  },

  /**
   * Bind event listeners
   */
  bindEvents() {
    // Edit Invoice button - enter edit mode and return to checkout
    if (this.elements.editButton) {
      this.elements.editButton.addEventListener('click', () => {
        if (this.transaction) {
          Checkout.editingInvoiceId = this.transaction.id;
          Checkout.editingInvoiceDirty = false;
          // Items are already in checkout cart, just navigate back
          Checkout.transactionSaved = false;
          Checkout.lastTransaction = null;
        }
        App.showScreen('checkout');
        Checkout.render();
      });
    }

    // Discount button - apply/edit invoice discount in-place
    if (this.elements.discountButton) {
      this.elements.discountButton.addEventListener('click', () => {
        this.applyTicketDiscountFromQR();
      });
    }

    // Mark Paid button - mark transaction as paid and go to dashboard
    if (this.elements.markPaidButton) {
      this.elements.markPaidButton.addEventListener('click', () => {
        const txn = this.transaction;
        if (!txn) return;

        // Update transaction status to paid
        Storage.updateTransaction(txn.id, {
          status: 'paid',
          paidAt: Utils.getTimestamp()
        });

        // Clear checkout state
        Checkout.clearAll();

        // Navigate to dashboard so they see the paid tag
        App.showScreen('dashboard');
      });
    }

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
      customerNumber: transaction.customerNumber,
      orderName: transaction.orderName || '',
      items: transaction.items.map(item => ({
        desc: item.description || '',
        qty: item.quantity || 1,
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
    // Encode as URL-safe base64 pointing to standalone invoice page
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

    // Update QR helper text
    const helperEl = document.getElementById('qr-helper-text');
    if (helperEl) {
      helperEl.textContent = 'Hand this phone to your payment worker';
    }

    // Render item summary and total first (these should always work)
    this.renderItemSummary(transaction);

    // Show invoice discount in total if present
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
      width: 240,
      height: 240,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });
  },

  /**
   * Apply or edit invoice discount from QR screen without reopening the transaction
   * Opens the invoice discount sheet, then updates the transaction in-place
   */
  applyTicketDiscountFromQR() {
    const txn = this.transaction;
    if (!txn) return;

    // Sync Checkout items/ticketDiscount so the sheet has correct state
    Checkout.items = txn.items.map(item => ({ ...item }));
    Checkout.ticketDiscount = txn.ticketDiscount || null;

    // Stash original callbacks so we can intercept apply/remove
    const origApply = Checkout.applyTicketDiscount.bind(Checkout);
    const origRemove = Checkout.removeTicketDiscount.bind(Checkout);

    const afterUpdate = () => {
      // Recalculate transaction totals
      const subtotal = Checkout.items.reduce((sum, item) => sum + item.finalPrice, 0);
      const total = Utils.applyTicketDiscount(subtotal, Checkout.ticketDiscount);

      txn.ticketDiscount = Checkout.ticketDiscount;
      txn.subtotal = subtotal;
      txn.total = total;

      // Update in storage
      Storage.updateTransaction(txn.id, {
        ticketDiscount: txn.ticketDiscount,
        subtotal: txn.subtotal,
        total: txn.total
      });

      // Update lastTransaction reference
      Checkout.lastTransaction = txn;

      // Re-render QR screen with updated data
      this.render(txn);

      // Restore original methods
      Checkout.applyTicketDiscount = origApply;
      Checkout.removeTicketDiscount = origRemove;
    };

    // Monkey-patch apply/remove to intercept and update QR
    Checkout.applyTicketDiscount = function() {
      const type = document.querySelector('input[name="ticket-discount-type"]:checked')?.value;
      const rawValue = parseFloat(Checkout.elements.ticketDiscountInput.value) || 0;
      if (!rawValue) { Checkout.showFlash('error', 'Enter a value'); return; }

      Checkout.ticketDiscount = { type, value: rawValue };
      Checkout.closeTicketDiscountSheet();
      Checkout.showFlash('success', 'Invoice discount applied!');
      afterUpdate();
    };

    Checkout.removeTicketDiscount = function() {
      Checkout.ticketDiscount = null;
      Checkout.closeTicketDiscountSheet();
      Checkout.showFlash('success', 'Invoice discount removed');
      afterUpdate();
    };

    // Open the sheet
    Checkout.openTicketDiscountSheet();
  },

  /**
   * Render item summary list
   */
  renderItemSummary(transaction) {
    const html = transaction.items.map(item => {
      const qty = item.quantity || 1;
      let desc = item.description || 'Item';
      if (qty > 1) {
        const unitPrice = item.finalPrice / qty;
        desc += ` x${qty} @${Utils.formatCurrency(unitPrice)}`;
      }
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

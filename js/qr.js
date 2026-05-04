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
        const paidAt = Utils.getTimestamp();
        Storage.updateTransaction(txn.id, {
          status: 'paid',
          paidAt: paidAt
        });

        // Push to backend
        const sale = Storage.getSale();
        if (typeof Sync !== 'undefined' && Sync.isSynced(sale)) {
          Sync.patchInvoice(sale.id, sale.shareCode, txn.id, {
            status: 'paid',
            paidAt: paidAt
          }).catch(err => console.warn('[sync] mark-paid failed:', err.message));
        }

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
   * Build a pointer URL for a synced invoice — just the invoice id.
   * The ticket page will fetch the full invoice from the backend.
   * Yields a tiny QR that scans reliably and shows live data (status
   * updates if the invoice is marked paid after the customer scans).
   */
  generatePointerUrl(transaction) {
    return window.location.origin + '/ticket.html?id=' + encodeURIComponent(transaction.id);
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

    // v161: Order # title (canonical identifier — customer + worker reference it)
    const titleEl = document.getElementById('qr-order-title');
    if (titleEl) {
      const num = transaction.customerNumber || '?';
      titleEl.textContent = transaction.orderName
        ? transaction.orderName
        : `Order #${num}`;
    }

    // v161: customer-focused instruction (workers use dashboard, not scanning)
    const helperEl = document.getElementById('qr-helper-text');
    if (helperEl) {
      helperEl.textContent = 'Customer scans to keep their ticket';
    }

    // Render item summary and total first (these should always work)
    this.renderItemSummary(transaction);

    // v214: caption pattern. Final total stays the hero; the adjustment
    // label sits underneath as caption-weight text. No strikethrough on
    // the total — Apple Wallet / Venmo / Cash App show one number, not a
    // before/after. Original subtotal is still discoverable in the QR
    // payload and on the customer's saved ticket detail view.
    const adjLabel = Utils.formatTicketDiscountLabel(transaction.ticketDiscount);
    if (adjLabel) {
      this.elements.qrTotal.innerHTML =
        `<span class="qr-total__amount-value">${Utils.formatCurrency(transaction.total)}</span>` +
        `<span class="qr-total__caption">${Utils.escapeHtml(adjLabel.long)}</span>`;
    } else {
      this.elements.qrTotal.textContent = Utils.formatCurrency(transaction.total);
    }

    // Generate and render QR code.
    // For synced sales, encode a pointer URL (tiny, always live). For
    // local-only sales (legacy / offline), fall back to the base64 payload.
    try {
      const isSynced = typeof Sync !== 'undefined' && Sync.isSynced(sale);
      const qrData = isSynced
        ? this.generatePointerUrl(transaction)
        : this.generateData(transaction, sale);
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
   * Apply or edit invoice discount from QR screen without reopening the
   * transaction. Opens the canonical adjustment sheet, then re-syncs the
   * transaction once Checkout commits the change via its onAdjustmentChanged
   * hook.
   *
   * v214: this used to monkey-patch Checkout.applyTicketDiscount/remove and
   * read the wrong radio-button names (`ticket-discount-type` predates the
   * v206 sheet refactor that renamed them to `ticket-adj-type`/`ticket-adj-mode`).
   * The patch silently saved `{type: undefined, value: N}`, which then bypassed
   * Utils.applyTicketDiscount's type check — so the discount displayed but
   * never applied. Replaced with a one-shot callback hook so there's exactly
   * one apply/remove implementation in the codebase.
   */
  applyTicketDiscountFromQR() {
    const txn = this.transaction;
    if (!txn) return;

    // Sync Checkout items/ticketDiscount so the sheet has correct state
    Checkout.items = txn.items.map(item => ({ ...item }));
    Checkout.ticketDiscount = txn.ticketDiscount || null;

    Checkout.onAdjustmentChanged = () => {
      Checkout.onAdjustmentChanged = null;

      const subtotal = Checkout.items.reduce((sum, item) => sum + item.finalPrice, 0);
      const total = Utils.applyTicketDiscount(subtotal, Checkout.ticketDiscount);

      txn.ticketDiscount = Checkout.ticketDiscount;
      txn.subtotal = subtotal;
      txn.total = total;

      Storage.updateTransaction(txn.id, {
        ticketDiscount: txn.ticketDiscount,
        subtotal: txn.subtotal,
        total: txn.total
      });

      // Push to backend if synced
      const sale = Storage.getSale();
      if (typeof Sync !== 'undefined' && Sync.isSynced(sale)) {
        Sync.patchInvoice(sale.id, sale.shareCode, txn.id, {
          ticketDiscount: txn.ticketDiscount,
          subtotal: txn.subtotal,
          total: txn.total
        }).catch(err => console.warn('[sync] adjustment patch failed:', err.message));
      }

      Checkout.lastTransaction = txn;
      this.render(txn);
    };

    Checkout.openTicketDiscountSheet();
  },

  /**
   * Render item summary list
   *
   * v214: caption pattern. Final per-line price is the hero on the right;
   * a smaller caption underneath shows per-unit and "was $X" when
   * applicable. No inline strikethrough — see Utils.formatItemPriceCaption.
   */
  renderItemSummary(transaction) {
    const html = transaction.items.map(item => {
      const qty = item.quantity || 1;
      const desc = (item.description || 'Item') + (qty > 1 ? ` × ${qty}` : '');
      const caption = Utils.formatItemPriceCaption(item);
      const captionHtml = caption ? `<span class="qr-item__caption">${Utils.escapeHtml(caption)}</span>` : '';
      const priceHtml = Utils.formatCurrency(item.finalPrice);

      return `
        <li class="qr-item">
          <span class="qr-item__desc">${Utils.escapeHtml(desc)}</span>
          <span class="qr-item__price">${priceHtml}</span>
          ${captionHtml}
        </li>
      `;
    }).join('');

    this.elements.qrItems.innerHTML = html;
  },

};

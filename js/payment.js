/**
 * payment.js - Payment Receive Module for Estate Checkout
 * Handles displaying scanned cart data and marking payments as paid
 */

const Payment = {
  // Current cart data from QR scan
  cartData: null,

  // DOM element references
  elements: {},

  /**
   * Initialize payment module
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
      title: document.getElementById('payment-title'),
      items: document.getElementById('payment-items'),
      total: document.getElementById('payment-total'),
      markPaidButton: document.getElementById('payment-mark-paid'),
      newCustomerButton: document.getElementById('payment-new-customer'),
      successOverlay: document.getElementById('payment-success')
    };
  },

  /**
   * Bind event listeners
   */
  bindEvents() {
    if (this.elements.markPaidButton) {
      this.elements.markPaidButton.addEventListener('click', () => {
        this.markPaid();
      });
    }

    // New Customer button - clear cart and navigate to checkout
    if (this.elements.newCustomerButton) {
      this.elements.newCustomerButton.addEventListener('click', () => {
        Checkout.clearAll();
        App.showScreen('checkout');
      });
    }
  },

  /**
   * Render payment screen with scanned cart data
   */
  render(data) {
    if (!data) {
      console.error('Payment.render() called with no data');
      return;
    }

    this.cartData = data;

    // Format invoice header: "Sarah — 10:42 AM" or "Invoice #3 — 10:42 AM"
    const orderLabel = data.orderName || ('Invoice #' + (data.customerNumber || '?'));
    const time = Utils.formatTime(data.ts);
    this.elements.title.textContent = `${orderLabel} — ${time}`;

    // Render items
    this.renderItems(data.items);

    // v214: caption pattern matches QR + cart. Final total is the hero;
    // adjustment label sits underneath in caption weight. The previous
    // path read `data.ticketDiscount.type === 'percent'` which silently
    // mislabelled v206-shape adjustments (e.g. a 5% discount displayed as
    // "$5.00 off"). Now uses Utils.formatTicketDiscountLabel which handles
    // both shapes correctly.
    const adjLabel = Utils.formatTicketDiscountLabel(data.ticketDiscount);
    if (adjLabel) {
      this.elements.total.innerHTML =
        `<span class="payment-total__amount-value">${Utils.formatCurrency(data.total)}</span>` +
        `<span class="payment-total__caption">${Utils.escapeHtml(adjLabel.long)}</span>`;
    } else {
      this.elements.total.textContent = Utils.formatCurrency(data.total);
    }

    // Reset state
    this.elements.successOverlay.hidden = true;
    this.elements.markPaidButton.disabled = false;
  },

  /**
   * Render item list
   *
   * v214: caption pattern. The scanned-ticket item shape uses short keys
   * (qty/orig/day/final/haggle); Utils.formatItemPriceCaption reads both
   * that shape and the cart shape so the same helper drives every surface.
   */
  renderItems(items) {
    const html = items.map(item => {
      const qty = item.qty || 1;
      const desc = (item.desc || 'Item') + (qty > 1 ? ` × ${qty}` : '');
      const caption = Utils.formatItemPriceCaption(item);
      const captionHtml = caption ? `<span class="payment-item__caption">${Utils.escapeHtml(caption)}</span>` : '';
      const priceHtml = Utils.formatCurrency(item.final);

      return `
        <li class="payment-item">
          <span class="payment-item__desc">${Utils.escapeHtml(desc)}</span>
          <span class="payment-item__price">${priceHtml}</span>
          ${captionHtml}
        </li>
      `;
    }).join('');

    this.elements.items.innerHTML = html;
  },

  /**
   * Mark payment as paid and save transaction
   */
  markPaid() {
    if (!this.cartData) return;

    // Disable button to prevent double-tap
    this.elements.markPaidButton.disabled = true;

    // Find matching transaction in estate_transactions by customerNumber + timestamp
    const transactions = Storage.getTransactions();
    const matchingTxn = transactions.find(txn =>
      txn.customerNumber === this.cartData.customerNumber &&
      txn.timestamp === this.cartData.ts
    );

    if (matchingTxn) {
      // Update existing transaction to paid status
      Storage.updateTransaction(matchingTxn.id, {
        status: 'paid',
        paidAt: Utils.getTimestamp()
      });
    }

    // Show success overlay
    this.elements.successOverlay.hidden = false;

    // After brief delay, return to scan screen
    setTimeout(() => {
      this.elements.successOverlay.hidden = true;
      App.showScreen('scan');
    }, 800);
  },

};

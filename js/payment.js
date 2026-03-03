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

    // Format order header: "Sarah — 10:42 AM" or "Order #3 — 10:42 AM"
    const orderLabel = data.orderName || ('Order #' + (data.customerNumber || '?'));
    const time = Utils.formatTime(data.ts);
    this.elements.title.textContent = `${orderLabel} — ${time}`;

    // Render items
    this.renderItems(data.items);

    // Render total
    this.elements.total.textContent = Utils.formatCurrency(data.total);

    // Reset state
    this.elements.successOverlay.hidden = true;
    this.elements.markPaidButton.disabled = false;
  },

  /**
   * Render item list
   */
  renderItems(items) {
    const html = items.map(item => {
      const desc = item.desc || 'Item';
      const hasDiscount = item.orig !== item.final;

      return `
        <li class="payment-item">
          <span class="payment-item__desc">${Utils.escapeHtml(desc)}</span>
          <span class="payment-item__price">
            ${hasDiscount ? `<span class="payment-item__original">${Utils.formatCurrency(item.orig)}</span>` : ''}
            ${Utils.formatCurrency(item.final)}
          </span>
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

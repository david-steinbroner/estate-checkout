/**
 * dashboard.js - Sale Dashboard Module for Estate Checkout
 * Displays transaction stats, transaction list, and performance metrics
 */

const Dashboard = {
  // Track which screen the user came from for Back navigation
  originScreen: 'checkout',

  // Currently expanded transaction (for accordion behavior)
  expandedTransactionId: null,

  // DOM element references
  elements: {},

  /**
   * Initialize dashboard module
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
      customerCount: document.getElementById('dashboard-customers'),
      revenue: document.getElementById('dashboard-revenue'),
      avgTicket: document.getElementById('dashboard-avg'),
      transactionList: document.getElementById('dashboard-transactions'),
      emptyState: document.getElementById('dashboard-empty'),
      backButton: document.getElementById('dashboard-back')
    };
  },

  /**
   * Bind event listeners
   */
  bindEvents() {
    if (this.elements.backButton) {
      this.elements.backButton.addEventListener('click', () => {
        App.showScreen(this.originScreen);
      });
    }
  },

  /**
   * Render the dashboard with fresh data
   */
  render(originScreen) {
    // Remember where user came from
    if (originScreen) {
      this.originScreen = originScreen;
    }

    // Get transactions for current sale
    const transactions = this.getTransactionsForCurrentSale();

    // Render summary stats
    this.renderStats(transactions);

    // Render transaction list
    this.renderTransactionList(transactions);
  },

  /**
   * Get transactions filtered to current sale only
   */
  getTransactionsForCurrentSale() {
    const sale = Storage.getSale();
    const allTransactions = Storage.getTransactions();

    if (!sale) return [];

    // Filter transactions that belong to current sale
    // Match by sale createdAt timestamp (transactions after sale was created)
    const saleCreatedAt = new Date(sale.createdAt).getTime();

    return allTransactions.filter(txn => {
      const txnTime = new Date(txn.timestamp).getTime();
      return txnTime >= saleCreatedAt;
    });
  },

  /**
   * Render summary statistics (excluding voided transactions)
   */
  renderStats(transactions) {
    // Filter out voided transactions for stats
    const activeTransactions = transactions.filter(txn => txn.status !== 'void');

    const customerCount = activeTransactions.length;
    const totalRevenue = activeTransactions.reduce((sum, txn) => sum + txn.total, 0);
    const avgTicket = customerCount > 0 ? totalRevenue / customerCount : 0;

    this.elements.customerCount.textContent = customerCount.toString();
    this.elements.revenue.textContent = Utils.formatCurrency(totalRevenue);
    this.elements.avgTicket.textContent = Utils.formatCurrency(avgTicket);
  },

  /**
   * Render the transaction list
   */
  renderTransactionList(transactions) {
    // Reset expanded state
    this.expandedTransactionId = null;

    // Show empty state if no transactions
    if (transactions.length === 0) {
      this.elements.emptyState.hidden = false;
      this.elements.transactionList.innerHTML = '';
      return;
    }

    this.elements.emptyState.hidden = true;

    // Sort by timestamp, most recent first
    const sorted = [...transactions].sort((a, b) => {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    const html = sorted.map(txn => this.renderTransactionRow(txn)).join('');
    this.elements.transactionList.innerHTML = html;

    // Bind click events for expand/collapse
    this.elements.transactionList.querySelectorAll('.dashboard-txn').forEach(row => {
      row.addEventListener('click', (e) => {
        // Don't trigger if clicking inside the detail area
        if (e.target.closest('.dashboard-txn__detail')) return;
        this.toggleTransaction(row.dataset.id);
      });
    });

    // Bind action button events (using event delegation)
    this.elements.transactionList.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;

      e.stopPropagation();
      const action = btn.dataset.action;
      const txnId = btn.dataset.id;

      if (action === 'toggle-paid') {
        this.togglePaidStatus(txnId);
      } else if (action === 'reopen') {
        this.reopenTransaction(txnId);
      } else if (action === 'collect') {
        this.collectPayment(txnId);
      }
    });
  },

  /**
   * Render a single transaction row
   */
  renderTransactionRow(txn) {
    const customerNum = txn.customerNumber || '?';
    const time = this.formatTime(txn.timestamp);
    const itemCount = txn.items ? txn.items.length : 0;
    const total = Utils.formatCurrency(txn.total);
    const status = txn.status || 'unpaid';

    // Status badge HTML
    const statusBadge = this.renderStatusBadge(status);

    // Void styling
    const voidClass = status === 'void' ? ' dashboard-txn--void' : '';

    return `
      <li class="dashboard-txn${voidClass}" data-id="${txn.id}">
        <div class="dashboard-txn__summary">
          <div class="dashboard-txn__header">
            <span class="dashboard-txn__customer">Customer #${customerNum} — ${time}</span>
            ${statusBadge}
            <span class="dashboard-txn__total">${total}</span>
          </div>
          <div class="dashboard-txn__meta">
            <span class="dashboard-txn__items">${itemCount} item${itemCount !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div class="dashboard-txn__detail" hidden>
          ${this.renderTransactionDetail(txn)}
        </div>
      </li>
    `;
  },

  /**
   * Render status badge
   */
  renderStatusBadge(status) {
    const badges = {
      'paid': '<span class="dashboard-txn__status dashboard-txn__status--paid">Paid</span>',
      'unpaid': '<span class="dashboard-txn__status dashboard-txn__status--unpaid">Unpaid</span>',
      'void': '<span class="dashboard-txn__status dashboard-txn__status--void">Void</span>'
    };
    return badges[status] || badges['unpaid'];
  },

  /**
   * Render transaction detail (expanded view)
   */
  renderTransactionDetail(txn) {
    const discountLabel = txn.discount > 0
      ? `Day ${txn.saleDay} — ${txn.discount}% off`
      : 'No discount';

    const itemsHtml = (txn.items || []).map(item => {
      const desc = item.description || 'Item';
      const hasDiscount = item.originalPrice !== item.finalPrice;

      return `
        <li class="dashboard-detail__item">
          <span class="dashboard-detail__desc">${this.escapeHtml(desc)}</span>
          <span class="dashboard-detail__price">
            ${hasDiscount ? `<span class="dashboard-detail__original">${Utils.formatCurrency(item.originalPrice)}</span>` : ''}
            ${Utils.formatCurrency(item.finalPrice)}
          </span>
        </li>
      `;
    }).join('');

    // Action buttons (only show for non-void transactions)
    const status = txn.status || 'unpaid';
    const isVoid = status === 'void';

    const actionsHtml = isVoid ? '' : `
      <div class="dashboard-detail__actions">
        <button class="dashboard-detail__btn dashboard-detail__btn--toggle" data-action="toggle-paid" data-id="${txn.id}">
          ${status === 'paid' ? 'Mark Unpaid' : 'Mark Paid'}
        </button>
        <button class="dashboard-detail__btn dashboard-detail__btn--reopen" data-action="reopen" data-id="${txn.id}">
          Reopen
        </button>
        <button class="dashboard-detail__btn dashboard-detail__btn--collect" data-action="collect" data-id="${txn.id}">
          Collect Payment
        </button>
      </div>
    `;

    return `
      <div class="dashboard-detail__discount">${discountLabel}</div>
      <ul class="dashboard-detail__items">
        ${itemsHtml}
      </ul>
      ${actionsHtml}
    `;
  },

  /**
   * Toggle transaction expand/collapse (accordion behavior)
   */
  toggleTransaction(txnId) {
    const allRows = this.elements.transactionList.querySelectorAll('.dashboard-txn');

    allRows.forEach(row => {
      const detail = row.querySelector('.dashboard-txn__detail');
      if (row.dataset.id === txnId) {
        // Toggle this one
        if (this.expandedTransactionId === txnId) {
          // Collapse
          detail.hidden = true;
          row.classList.remove('expanded');
          this.expandedTransactionId = null;
        } else {
          // Expand
          detail.hidden = false;
          row.classList.add('expanded');
          this.expandedTransactionId = txnId;
        }
      } else {
        // Collapse all others
        detail.hidden = true;
        row.classList.remove('expanded');
      }
    });
  },

  /**
   * Format ISO timestamp to time string (e.g., "10:42 AM")
   */
  formatTime(isoTimestamp) {
    try {
      const date = new Date(isoTimestamp);
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return '--:--';
    }
  },

  /**
   * Toggle paid/unpaid status for a transaction
   */
  togglePaidStatus(txnId) {
    const txn = Storage.getTransaction(txnId);
    if (!txn) return;

    const newStatus = txn.status === 'paid' ? 'unpaid' : 'paid';
    const paidAt = newStatus === 'paid' ? Utils.getTimestamp() : null;

    Storage.updateTransaction(txnId, {
      status: newStatus,
      paidAt: paidAt
    });

    // Re-render to update UI
    this.render();
  },

  /**
   * Reopen a transaction (void original, load items to checkout)
   */
  reopenTransaction(txnId) {
    const txn = Storage.getTransaction(txnId);
    if (!txn || txn.status === 'void') return;

    // Mark original as void
    Storage.updateTransaction(txnId, {
      status: 'void',
      voidedAt: Utils.getTimestamp()
    });

    // Load items into checkout
    Checkout.items = txn.items.map(item => ({
      ...item,
      id: Utils.generateId() // New IDs for the reopened items
    }));
    Storage.saveCart(Checkout.items);

    // Track that this is a reopened transaction
    Checkout.reopenedFromCustomer = txn.customerNumber;

    // Navigate to checkout
    App.showScreen('checkout');
    Checkout.render();
  },

  /**
   * Navigate to QR screen for this transaction
   */
  collectPayment(txnId) {
    const txn = Storage.getTransaction(txnId);
    if (!txn) return;

    // Navigate to QR screen with this transaction
    App.showScreen('qr', txn);
  },

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

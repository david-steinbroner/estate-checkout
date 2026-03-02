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
   * Render summary statistics
   */
  renderStats(transactions) {
    const customerCount = transactions.length;
    const totalRevenue = transactions.reduce((sum, txn) => sum + txn.total, 0);
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
  },

  /**
   * Render a single transaction row
   */
  renderTransactionRow(txn) {
    const customerNum = txn.customerNumber || '?';
    const time = this.formatTime(txn.timestamp);
    const itemCount = txn.items ? txn.items.length : 0;
    const total = Utils.formatCurrency(txn.total);

    return `
      <li class="dashboard-txn" data-id="${txn.id}">
        <div class="dashboard-txn__summary">
          <div class="dashboard-txn__header">
            <span class="dashboard-txn__customer">Customer #${customerNum} — ${time}</span>
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

    return `
      <div class="dashboard-detail__discount">${discountLabel}</div>
      <ul class="dashboard-detail__items">
        ${itemsHtml}
      </ul>
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
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

/**
 * dashboard.js - Sale Dashboard Module for Estate Checkout
 * Displays transaction stats, transaction list, and performance metrics
 */

const Dashboard = {
  // Currently expanded transaction (for accordion behavior)
  expandedTransactionId: null,

  // Filter and sort state (reset on each Dashboard open)
  activeFilter: 'all',
  sortNewestFirst: true,

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
   * Reset filter and sort to defaults (called on each Dashboard navigation)
   */
  resetFilters() {
    this.activeFilter = 'all';
    this.sortNewestFirst = true;
  },

  /**
   * Cache DOM element references
   */
  cacheElements() {
    this.elements = {
      customerCount: document.getElementById('dashboard-customers'),
      revenue: document.getElementById('dashboard-revenue'),
      avgTicket: document.getElementById('dashboard-avg'),
      filtersContainer: document.getElementById('dashboard-filters'),
      sortButton: document.getElementById('dashboard-sort'),
      transactionList: document.getElementById('dashboard-transactions'),
      emptyState: document.getElementById('dashboard-empty'),
      newCustomerButton: document.getElementById('dashboard-new-customer')
    };
  },

  /**
   * Bind event listeners
   */
  bindEvents() {
    // NEW CUSTOMER button - clears cart and navigates to checkout
    if (this.elements.newCustomerButton) {
      this.elements.newCustomerButton.addEventListener('click', () => {
        Checkout.clearAll();
        App.showScreen('checkout');
      });
    }

    // Filter pill clicks (event delegation)
    if (this.elements.filtersContainer) {
      this.elements.filtersContainer.addEventListener('click', (e) => {
        const pill = e.target.closest('.dashboard-filter');
        if (!pill) return;
        this.activeFilter = pill.dataset.filter;
        this.render();
      });
    }

    // Sort toggle
    if (this.elements.sortButton) {
      this.elements.sortButton.addEventListener('click', () => {
        this.sortNewestFirst = !this.sortNewestFirst;
        this.render();
      });
    }

    // Action button events (using event delegation) - bound once here, not in render
    if (this.elements.transactionList) {
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
        } else if (action === 'continue-editing') {
          this.continueEditingOpen(txnId);
        } else if (action === 'cancel-invoice') {
          this.cancelInvoice(txnId);
        }
      });
    }
  },

  /**
   * Render the dashboard with fresh data
   */
  render() {
    // Get transactions for current sale
    const transactions = this.getTransactionsForCurrentSale();

    // Summary stats always reflect full sale data (unfiltered)
    this.renderStats(transactions);

    // Render filter pills with counts
    this.renderFilterPills(transactions);

    // Update sort toggle text
    this.renderSortToggle();

    // Apply filter then sort, render the resulting list
    const filtered = this.applyFilter(transactions);
    this.renderTransactionList(filtered, transactions.length);

    // Hide New Invoice button when sale is paused (checkout is locked)
    const sale = Storage.getSale();
    const isPaused = sale && (sale.status || 'active') === 'paused';
    if (this.elements.newCustomerButton) {
      this.elements.newCustomerButton.hidden = isPaused;
    }
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
    // Invoices = non-void (open + unpaid + paid)
    const activeTransactions = transactions.filter(txn => txn.status !== 'void');
    const paidTransactions = transactions.filter(txn => txn.status === 'paid');

    const customerCount = activeTransactions.length;
    const totalRevenue = paidTransactions.reduce((sum, txn) => sum + txn.total, 0);
    const avgTicket = paidTransactions.length > 0 ? totalRevenue / paidTransactions.length : 0;

    this.elements.customerCount.textContent = customerCount.toString();
    this.elements.revenue.textContent = Utils.formatCurrency(totalRevenue);
    this.elements.avgTicket.textContent = Utils.formatCurrency(avgTicket);
  },

  /**
   * Render filter pills with live counts
   */
  renderFilterPills(transactions) {
    if (!this.elements.filtersContainer) return;

    const counts = {
      all: transactions.length,
      open: transactions.filter(t => t.status === 'open').length,
      unpaid: transactions.filter(t => t.status === 'unpaid').length,
      paid: transactions.filter(t => t.status === 'paid').length,
      void: transactions.filter(t => t.status === 'void').length
    };

    const pills = [
      { key: 'all', label: 'All' },
      { key: 'open', label: 'Open' },
      { key: 'unpaid', label: 'Unpaid' },
      { key: 'paid', label: 'Paid' },
      { key: 'void', label: 'Void' }
    ];

    this.elements.filtersContainer.innerHTML = pills.map(pill => {
      const active = this.activeFilter === pill.key ? ' dashboard-filter--active' : '';
      return `<button class="dashboard-filter dashboard-filter--${pill.key}${active}" data-filter="${pill.key}" type="button">${pill.label} (${counts[pill.key]})</button>`;
    }).join('');
  },

  /**
   * Update sort toggle button text
   */
  renderSortToggle() {
    if (!this.elements.sortButton) return;
    this.elements.sortButton.textContent = this.sortNewestFirst
      ? 'Newest First \u2193'
      : 'Oldest First \u2191';
  },

  /**
   * Apply the active status filter to transactions
   */
  applyFilter(transactions) {
    if (this.activeFilter === 'all') return transactions;
    return transactions.filter(t => (t.status || 'unpaid') === this.activeFilter);
  },

  /**
   * Render the transaction list
   * @param {Array} transactions - Filtered transactions to display
   * @param {number} totalCount - Total unfiltered count (to distinguish empty filter vs empty sale)
   */
  renderTransactionList(transactions, totalCount) {
    // Reset expanded state
    this.expandedTransactionId = null;

    // Handle empty states
    if (transactions.length === 0) {
      this.elements.transactionList.innerHTML = '';
      if (totalCount === 0) {
        // No transactions at all — show generic empty state
        this.elements.emptyState.hidden = false;
      } else {
        // Transactions exist but none match filter — show filter-specific message
        this.elements.emptyState.hidden = true;
        const filterLabels = { open: 'open', unpaid: 'unpaid', paid: 'paid', void: 'void' };
        const label = filterLabels[this.activeFilter] || this.activeFilter;
        this.elements.transactionList.innerHTML =
          `<li class="dashboard-filter-empty">No ${label} invoices</li>`;
      }
      return;
    }

    this.elements.emptyState.hidden = true;

    // Sort by timestamp based on sort toggle
    const sorted = [...transactions].sort((a, b) => {
      const diff = new Date(b.timestamp) - new Date(a.timestamp);
      return this.sortNewestFirst ? diff : -diff;
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
    const orderLabel = Utils.escapeHtml(txn.orderName || ('Invoice #' + (txn.customerNumber || '?')));
    const time = Utils.formatTime(txn.timestamp);
    const itemCount = txn.items ? txn.items.length : 0;
    const total = Utils.formatCurrency(txn.total);
    const status = txn.status || 'unpaid';

    // Status badge HTML
    const statusBadge = this.renderStatusBadge(status, txn.voidReason);

    // Status styling
    let extraClass = '';
    if (status === 'void') extraClass = ' dashboard-txn--void';
    else if (status === 'open') extraClass = ' dashboard-txn--open';

    return `
      <li class="dashboard-txn${extraClass}" data-id="${txn.id}">
        <div class="dashboard-txn__summary">
          <div class="dashboard-txn__header">
            <span class="dashboard-txn__customer">${orderLabel} — Day ${txn.saleDay || 1} · ${time}</span>
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
   * @param {string} status - Transaction status
   * @param {string} [voidReason] - Reason for voiding (only used when status is 'void')
   */
  renderStatusBadge(status, voidReason) {
    if (status === 'void') {
      const isEdited = voidReason === 'Edited Invoice';
      const label = isEdited ? 'Edited' : 'Cancelled';
      const cssClass = isEdited ? 'edited' : 'cancelled';
      return `<span class="dashboard-txn__status dashboard-txn__status--${cssClass}">${label}</span>`;
    }

    const badges = {
      'open': '<span class="dashboard-txn__status dashboard-txn__status--open">Open</span>',
      'paid': '<span class="dashboard-txn__status dashboard-txn__status--paid">Paid</span>',
      'unpaid': '<span class="dashboard-txn__status dashboard-txn__status--unpaid">Unpaid</span>'
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
      const hasHaggle = item.haggleType && item.haggleValue;
      const hasDayDiscount = (item.dayDiscount || item.discount || 0) > 0;

      let priceHtml;
      if (hasHaggle) {
        priceHtml = `<span class="dashboard-detail__original">${Utils.formatCurrency(item.originalPrice)}</span>`;
        if (hasDayDiscount && item.dayDiscountedPrice !== undefined) {
          priceHtml += `<span class="dashboard-detail__original">${Utils.formatCurrency(item.dayDiscountedPrice)}</span>`;
        }
        priceHtml += Utils.formatCurrency(item.finalPrice);
      } else if (item.originalPrice !== item.finalPrice) {
        priceHtml = `<span class="dashboard-detail__original">${Utils.formatCurrency(item.originalPrice)}</span>${Utils.formatCurrency(item.finalPrice)}`;
      } else {
        priceHtml = Utils.formatCurrency(item.finalPrice);
      }

      return `
        <li class="dashboard-detail__item">
          <span class="dashboard-detail__desc">${Utils.escapeHtml(desc)}</span>
          <span class="dashboard-detail__price">${priceHtml}</span>
        </li>
      `;
    }).join('');

    // Action buttons vary by status
    const status = txn.status || 'unpaid';
    let actionsHtml = '';

    if (status === 'open') {
      actionsHtml = `
        <div class="dashboard-detail__actions">
          <button class="dashboard-detail__btn dashboard-detail__btn--toggle" data-action="continue-editing" data-id="${txn.id}">
            Continue Editing
          </button>
        </div>
      `;
    } else if (status === 'unpaid') {
      actionsHtml = `
        <div class="dashboard-detail__actions">
          <button class="dashboard-detail__btn dashboard-detail__btn--toggle" data-action="toggle-paid" data-id="${txn.id}">
            Mark as Paid
          </button>
          <button class="dashboard-detail__btn dashboard-detail__btn--reopen" data-action="reopen" data-id="${txn.id}">
            Edit Invoice
          </button>
          <button class="dashboard-detail__btn dashboard-detail__btn--collect" data-action="collect" data-id="${txn.id}">
            Generate Invoice
          </button>
          <button class="dashboard-detail__btn dashboard-detail__btn--cancel" data-action="cancel-invoice" data-id="${txn.id}">
            Cancel
          </button>
        </div>
      `;
    } else if (status === 'paid') {
      actionsHtml = `
        <div class="dashboard-detail__actions">
          <button class="dashboard-detail__btn dashboard-detail__btn--toggle" data-action="toggle-paid" data-id="${txn.id}">
            Mark as Unpaid
          </button>
          <button class="dashboard-detail__btn dashboard-detail__btn--collect" data-action="collect" data-id="${txn.id}">
            Generate Invoice
          </button>
        </div>
      `;
    }
    // void (edited/cancelled): no actions

    // Invoice discount line
    let ticketDiscountHtml = '';
    if (txn.ticketDiscount && txn.ticketDiscount.value) {
      const tdLabel = txn.ticketDiscount.type === 'percent'
        ? `${txn.ticketDiscount.value}% off`
        : `${Utils.formatCurrency(txn.ticketDiscount.value)} off`;
      ticketDiscountHtml = `<div class="dashboard-detail__discount">Invoice discount: ${tdLabel}</div>`;
    }

    return `
      <div class="dashboard-detail__discount">${discountLabel}</div>
      <ul class="dashboard-detail__items">
        ${itemsHtml}
      </ul>
      ${ticketDiscountHtml}
      ${actionsHtml}
    `;
  },

  /**
   * Toggle transaction expand/collapse (accordion behavior)
   */
  toggleTransaction(txnId) {
    // If open invoice, navigate to checkout instead of expanding
    const txn = Storage.getTransaction(txnId);
    if (txn && txn.status === 'open') {
      this.continueEditingOpen(txnId);
      return;
    }

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

    // Delete any existing draft first
    if (Checkout.draftTransactionId) {
      Storage.deleteTransaction(Checkout.draftTransactionId);
      Storage.clearDraftTxnId();
      Checkout.draftTransactionId = null;
    }

    // Mark original as void
    Storage.updateTransaction(txnId, {
      status: 'void',
      voidedAt: Utils.getTimestamp(),
      voidReason: 'Edited Invoice'
    });

    // Load items into checkout
    Checkout.items = txn.items.map(item => ({
      ...item,
      id: Utils.generateId() // New IDs for the reopened items
    }));
    Checkout.ticketDiscount = txn.ticketDiscount || null;
    Checkout.saveCart();

    // Track that this is a reopened transaction
    Checkout.reopenedFromCustomer = txn.customerNumber;
    Checkout.reuseCustomerNumber = txn.customerNumber;

    // Preserve invoice name
    Checkout.orderCustomName = txn.orderName || '';
    Checkout.transactionSaved = false;
    Checkout.lastTransaction = null;

    // Create new draft so the reopened invoice appears as "Open"
    Checkout.saveDraftTransaction();

    // Navigate to checkout
    App.showScreen('checkout');
    Checkout.render();
  },

  /**
   * Continue editing an open invoice — load items into checkout
   */
  continueEditingOpen(txnId) {
    const txn = Storage.getTransaction(txnId);
    if (!txn || txn.status !== 'open') return;

    // Load items into checkout
    Checkout.items = txn.items.map(item => ({ ...item }));
    Checkout.ticketDiscount = txn.ticketDiscount || null;
    Checkout.orderCustomName = txn.orderName || '';
    Checkout.reuseCustomerNumber = txn.customerNumber;
    Checkout.draftTransactionId = txnId;
    Storage.saveDraftTxnId(txnId);
    Checkout.saveCart();
    Checkout.transactionSaved = false;
    Checkout.lastTransaction = null;

    App.showScreen('checkout');
    Checkout.render();
  },

  /**
   * Cancel an invoice (set to void with 'Cancelled' reason)
   */
  cancelInvoice(txnId) {
    const txn = Storage.getTransaction(txnId);
    if (!txn || txn.status === 'void') return;

    Storage.updateTransaction(txnId, {
      status: 'void',
      voidedAt: Utils.getTimestamp(),
      voidReason: 'Cancelled'
    });

    this.render();
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

};

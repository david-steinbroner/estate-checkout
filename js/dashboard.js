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
      newCustomerButton: document.getElementById('dashboard-new-customer'),
      consignorRevenue: document.getElementById('consignor-revenue'),
      consignorRevenueList: document.getElementById('consignor-revenue-list'),
      consignorRevenueMore: document.getElementById('consignor-revenue-more'),
      endedBanner: document.getElementById('dashboard-ended-banner'),
      startNewSaleBtn: document.getElementById('dashboard-start-new-sale')
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

    // "View all" on Revenue by consignor card → open full Payouts page
    if (this.elements.consignorRevenueMore) {
      this.elements.consignorRevenueMore.addEventListener('click', () => {
        App.showScreen('payouts');
      });
    }

    // "Start New Sale" on the sale-ended banner
    if (this.elements.startNewSaleBtn) {
      this.elements.startNewSaleBtn.addEventListener('click', () => {
        SaleSetup.clearEndedSale();
        App.showScreen('setup');
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
        } else if (action === 'generate-open') {
          this.generateOpenInvoice(txnId);
        } else if (action === 'cancel-invoice') {
          this.cancelInvoice(txnId);
        }
      });
    }

    // Cancel confirmation sheet
    const cancelModal = document.getElementById('cancel-confirm-modal');
    if (cancelModal) {
      cancelModal.querySelector('#cancel-confirm-yes').addEventListener('click', () => this.confirmCancelInvoice());
      cancelModal.querySelector('#cancel-confirm-no').addEventListener('click', () => this.dismissCancelConfirm());
      cancelModal.addEventListener('click', (e) => {
        if (e.target === cancelModal) this.dismissCancelConfirm();
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

    // Revenue by consignor card (V2 §1.6)
    this.renderConsignorRevenue(transactions);

    // Render filter pills with counts
    this.renderFilterPills(transactions);

    // Update sort toggle text
    this.renderSortToggle();

    // Apply filter then sort, render the resulting list
    const filtered = this.applyFilter(transactions);
    this.renderTransactionList(filtered, transactions.length);

    // Hide New Invoice button when sale is paused (checkout is locked) or ended
    const sale = Storage.getSale();
    const status = sale ? (sale.status || 'active') : 'active';
    const isPaused = status === 'paused';
    const isEnded = status === 'ended';
    if (this.elements.newCustomerButton) {
      this.elements.newCustomerButton.hidden = isPaused || isEnded;
    }
    if (this.elements.endedBanner) {
      this.elements.endedBanner.hidden = !isEnded;
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
   * Render the "Revenue by consignor" card (V2 §1.6).
   * Shown only when the sale has ≥1 consignor AND at least one paid item
   * is attributed to a consignor. Caps at 4 rows; links to full Payouts
   * page when there are more.
   */
  renderConsignorRevenue(transactions) {
    const card = this.elements.consignorRevenue;
    const list = this.elements.consignorRevenueList;
    const more = this.elements.consignorRevenueMore;
    if (!card || !list) return;

    const sale = Storage.getSale();
    const consignors = sale ? (sale.consignors || []) : [];
    if (consignors.length === 0) {
      card.hidden = true;
      return;
    }

    // Group paid-item revenue by consignor
    const paidTxns = transactions.filter(t => t.status === 'paid');
    const totals = {}; // { id: { name, color, total, count } }
    let totalPaidRevenue = 0;

    paidTxns.forEach(txn => {
      (txn.items || []).forEach(item => {
        if (!item.consignorId) return;
        const c = consignors.find(x => x.id === item.consignorId);
        if (!c) return;
        if (!totals[c.id]) totals[c.id] = { name: c.name, color: c.color, total: 0, count: 0 };
        totals[c.id].total += item.finalPrice || 0;
        totals[c.id].count += item.quantity || 1;
        totalPaidRevenue += item.finalPrice || 0;
      });
    });

    const rows = Object.values(totals).sort((a, b) => b.total - a.total);
    if (rows.length === 0) {
      card.hidden = true;
      return;
    }

    const CAP = 4;
    const visible = rows.slice(0, CAP);
    const hiddenCount = rows.length - visible.length;

    list.innerHTML = visible.map(r => {
      const pct = totalPaidRevenue > 0 ? Math.round((r.total / totalPaidRevenue) * 100) : 0;
      const itemsLabel = `${r.count} item${r.count !== 1 ? 's' : ''}`;
      return `
        <li class="consignor-revenue__row">
          <span class="consignor-revenue__dot" style="background: ${r.color}"></span>
          <span class="consignor-revenue__name">${Utils.escapeHtml(r.name)}</span>
          <span class="consignor-revenue__meta">${itemsLabel} · ${pct}%</span>
          <span class="consignor-revenue__amount">${Utils.formatCurrency(r.total)}</span>
        </li>`;
    }).join('');

    if (more) {
      if (hiddenCount > 0) {
        more.textContent = `View all (${rows.length})`;
        more.hidden = false;
      } else {
        more.hidden = true;
      }
    }

    card.hidden = false;
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
        const label = this.activeFilter;
        const noun = label === 'open' ? 'orders' : 'invoices';
        this.elements.transactionList.innerHTML =
          `<li class="dashboard-filter-empty">No ${label} ${noun}</li>`;
      }
      return;
    }

    this.elements.emptyState.hidden = true;

    // Sort by timestamp based on sort toggle
    const sorted = [...transactions].sort((a, b) => {
      const diff = new Date(b.timestamp) - new Date(a.timestamp);
      return this.sortNewestFirst ? diff : -diff;
    });

    const html = sorted.map(txn => {
      try {
        return this.renderTransactionRow(txn);
      } catch (e) {
        console.error('Failed to render transaction row:', txn.id, e);
        return '';
      }
    }).join('');
    this.elements.transactionList.innerHTML = html;

    // Bind click events for expand/collapse
    this.elements.transactionList.querySelectorAll('.dashboard-txn').forEach(row => {
      row.addEventListener('click', (e) => {
        // Don't trigger if clicking inside the detail area
        if (e.target.closest('.dashboard-txn__detail')) return;
        this.toggleTransaction(row.dataset.id);
      });
    });

    // Bind retroactive consignor edit buttons on detail items
    this.elements.transactionList.querySelectorAll('[data-consignor-edit]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const txnId = btn.closest('.dashboard-txn').dataset.id;
        const itemId = btn.dataset.consignorEdit;
        this.editItemConsignor(txnId, itemId);
      });
    });
  },

  /**
   * Open the consignor picker to assign/change a consignor on an item
   * within a transaction — works on paid, unpaid, and open statuses
   * (V2 §1.6: consignor is a reporting field, editable post-payment)
   */
  editItemConsignor(txnId, itemId) {
    const transactions = Storage.getTransactions();
    const txn = transactions.find(t => t.id === txnId);
    if (!txn || txn.status === 'void') return;
    const item = (txn.items || []).find(i => i.id === itemId);
    if (!item) return;

    Checkout.openConsignorPicker(item.consignorId || null, (newId) => {
      const updatedItems = txn.items.map(i =>
        i.id === itemId ? { ...i, consignorId: newId || null } : i
      );
      Storage.updateTransaction(txnId, { items: updatedItems });
      // Preserve the expanded state by re-rendering
      const wasExpanded = this.expandedTransactionId === txnId;
      this.render();
      if (wasExpanded) this.toggleTransaction(txnId);
    });
  },

  /**
   * Render a single transaction row
   */
  renderTransactionRow(txn) {
    const status = txn.status || 'unpaid';
    const defaultLabel = status === 'open' ? 'Order #' : 'Invoice #';
    const orderLabel = Utils.escapeHtml(txn.orderName || (defaultLabel + (txn.customerNumber || '?')));
    const time = Utils.formatTime(txn.timestamp);
    const itemCount = txn.items ? txn.items.length : 0;
    const total = Utils.formatCurrency(txn.total);

    // Status badge HTML
    const statusBadge = this.renderStatusBadge(status, txn.voidReason);

    // Status styling
    let extraClass = '';
    if (status === 'void') extraClass = ' dashboard-txn--void';
    else if (status === 'open') extraClass = ' dashboard-txn--open';

    const itemsLabel = `${itemCount} item${itemCount !== 1 ? 's' : ''}`;

    return `
      <li class="dashboard-txn${extraClass}" data-id="${txn.id}">
        <div class="dashboard-txn__summary">
          <div class="dashboard-txn__body">
            <span class="dashboard-txn__title">${orderLabel}</span>
            <div class="dashboard-txn__subtitle">
              <span class="dashboard-txn__meta">Day ${txn.saleDay || 1} · ${time} · ${itemsLabel}</span>
              ${statusBadge}
            </div>
          </div>
          <span class="dashboard-txn__amount">${total}</span>
        </div>
        <div class="dashboard-txn__detail" hidden>
          ${(() => { try { return this.renderTransactionDetail(txn); } catch (e) { console.error('Failed to render transaction detail:', txn.id, e); return ''; } })()}
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
      const isEdited = voidReason === 'Edited Invoice' || voidReason === 'Edited';
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

    const consignors = Storage.getConsignors();
    const consignorTotals = {}; // { id: { name, color, count, total } }

    const itemsHtml = (txn.items || []).map(item => {
      const qty = item.quantity || 1;
      let desc = item.description || 'Item';
      if (qty > 1) {
        const unitPrice = item.finalPrice / qty;
        desc += ` x${qty} @${Utils.formatCurrency(unitPrice)}`;
      }

      // Consignor tag — tappable to reassign (even on paid invoices per V2 §1.6).
      // Voided transactions are read-only.
      const isVoid = (txn.status || 'unpaid') === 'void';
      const editable = !isVoid && consignors.length > 0;
      let consignorTag = '';
      if (item.consignorId) {
        const c = consignors.find(x => x.id === item.consignorId);
        if (c) {
          const tagInner = `<span class="dashboard-detail__consignor-dot" style="background: ${c.color}"></span>${Utils.escapeHtml(c.name)}`;
          consignorTag = editable
            ? ` <button class="dashboard-detail__consignor" data-consignor-edit="${item.id}" type="button" aria-label="Change consignor">${tagInner}</button>`
            : ` <span class="dashboard-detail__consignor">${tagInner}</span>`;
          // Accumulate totals
          if (!consignorTotals[c.id]) {
            consignorTotals[c.id] = { name: c.name, color: c.color, count: 0, total: 0 };
          }
          consignorTotals[c.id].count += qty;
          consignorTotals[c.id].total += item.finalPrice;
        }
      } else if (editable) {
        consignorTag = ` <button class="dashboard-detail__consignor dashboard-detail__consignor--empty" data-consignor-edit="${item.id}" type="button" aria-label="Assign consignor"><span class="dashboard-detail__consignor-dot dashboard-detail__consignor-dot--empty"></span>Assign</button>`;
      }

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
          <span class="dashboard-detail__desc">${Utils.escapeHtml(desc)}${consignorTag}</span>
          <span class="dashboard-detail__price">${priceHtml}</span>
        </li>
      `;
    }).join('');

    // Consignor summary (only if multiple consignors in this transaction)
    const consignorIds = Object.keys(consignorTotals);
    let consignorSummaryHtml = '';
    if (consignorIds.length > 0) {
      const lines = consignorIds.map(id => {
        const ct = consignorTotals[id];
        return `<div class="dashboard-detail__consignor-line">
          <span class="dashboard-detail__consignor-dot" style="background: ${ct.color}"></span>
          <span>${Utils.escapeHtml(ct.name)}: ${ct.count} item${ct.count !== 1 ? 's' : ''} · ${Utils.formatCurrency(ct.total)}</span>
        </div>`;
      }).join('');
      consignorSummaryHtml = `<div class="dashboard-detail__consignor-summary">${lines}</div>`;
    }

    // Action buttons vary by status
    const status = txn.status || 'unpaid';
    let actionsHtml = '';

    if (status === 'open') {
      actionsHtml = `
        <div class="dashboard-detail__actions">
          <button class="dashboard-detail__action" data-action="continue-editing" data-id="${txn.id}">Edit order</button>
          <button class="dashboard-detail__action" data-action="generate-open" data-id="${txn.id}">Create invoice</button>
          <button class="dashboard-detail__action dashboard-detail__action--danger" data-action="cancel-invoice" data-id="${txn.id}">Cancel order</button>
        </div>
      `;
    } else if (status === 'unpaid') {
      actionsHtml = `
        <div class="dashboard-detail__actions">
          <button class="dashboard-detail__action dashboard-detail__action--primary" data-action="toggle-paid" data-id="${txn.id}">Mark as paid</button>
          <button class="dashboard-detail__action" data-action="reopen" data-id="${txn.id}">Edit invoice</button>
          <button class="dashboard-detail__action" data-action="collect" data-id="${txn.id}">See invoice</button>
          <button class="dashboard-detail__action dashboard-detail__action--danger" data-action="cancel-invoice" data-id="${txn.id}">Cancel invoice</button>
        </div>
      `;
    } else if (status === 'paid') {
      actionsHtml = `
        <div class="dashboard-detail__actions">
          <button class="dashboard-detail__action" data-action="toggle-paid" data-id="${txn.id}">Mark as unpaid</button>
          <button class="dashboard-detail__action" data-action="collect" data-id="${txn.id}">See invoice</button>
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
      ${consignorSummaryHtml}
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

    // Push to backend
    const sale = Storage.getSale();
    if (typeof Sync !== 'undefined' && Sync.isSynced(sale)) {
      Sync.patchInvoice(sale.id, sale.shareCode, txnId, {
        status: newStatus,
        paidAt: paidAt
      }).catch(err => console.warn('[sync] toggle-paid failed:', err.message));
    }

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

    // Do NOT void immediately — use lazy voiding via checkEditDirty()
    Checkout.editingInvoiceId = txnId;
    Checkout.editingInvoiceDirty = false;

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
   * Finalize an open invoice — promote to unpaid and navigate to QR
   */
  generateOpenInvoice(txnId) {
    const txn = Storage.getTransaction(txnId);
    if (!txn || txn.status !== 'open') return;

    // Assign a customer number if needed
    const customerNumber = txn.customerNumber || Storage.getNextCustomerNumber();

    // Promote to unpaid
    Storage.updateTransaction(txnId, {
      status: 'unpaid',
      customerNumber: customerNumber
    });

    // Clear draft tracking since it's no longer open
    if (Checkout.draftTransactionId === txnId) {
      Storage.clearDraftTxnId();
      Checkout.draftTransactionId = null;
    }

    // Get updated transaction and navigate to QR
    const updated = Storage.getTransaction(txnId);
    App.showScreen('qr', updated);
  },

  /**
   * Show cancel confirmation sheet
   */
  cancelInvoice(txnId) {
    const txn = Storage.getTransaction(txnId);
    if (!txn || txn.status === 'void') return;

    this._pendingCancelId = txnId;
    const defaultLabel = txn.status === 'open' ? 'Order #' : 'Invoice #';
    const label = txn.orderName || (defaultLabel + (txn.customerNumber || '?'));

    const modal = document.getElementById('cancel-confirm-modal');
    modal.querySelector('.cancel-confirm__title').textContent = `Cancel ${label}?`;
    modal.classList.add('visible');
  },

  /**
   * Confirm the cancellation
   */
  confirmCancelInvoice() {
    if (!this._pendingCancelId) return;

    const voidedAt = Utils.getTimestamp();
    Storage.updateTransaction(this._pendingCancelId, {
      status: 'void',
      voidedAt: voidedAt,
      voidReason: 'Cancelled'
    });

    // Push to backend
    const sale = Storage.getSale();
    if (typeof Sync !== 'undefined' && Sync.isSynced(sale)) {
      Sync.patchInvoice(sale.id, sale.shareCode, this._pendingCancelId, {
        status: 'void',
        voidedAt: voidedAt,
        voidReason: 'Cancelled'
      }).catch(err => console.warn('[sync] cancelInvoice failed:', err.message));
    }

    // If cancelling the current draft, clear draft tracking
    if (Checkout.draftTransactionId === this._pendingCancelId) {
      Storage.clearDraftTxnId();
      Checkout.draftTransactionId = null;
      Checkout.items = [];
      Checkout.saveCart();
    }

    this._pendingCancelId = null;
    document.getElementById('cancel-confirm-modal').classList.remove('visible');
    this.render();
  },

  /**
   * Dismiss the cancel confirmation
   */
  dismissCancelConfirm() {
    this._pendingCancelId = null;
    document.getElementById('cancel-confirm-modal').classList.remove('visible');
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

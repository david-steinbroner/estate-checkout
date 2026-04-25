/**
 * payouts.js - Consignor Payouts Summary for Estate Checkout
 * Calculates and displays payout breakdown per consignor from paid transactions
 */

const Payouts = {
  // Track which consignor sections are expanded
  _expanded: {},

  /**
   * Render the payouts page
   */
  render() {
    const container = document.getElementById('payouts-content');
    if (!container) return;

    const sale = Storage.getSale();
    const consignors = sale ? (sale.consignors || []) : [];
    const allTxns = Storage.getTransactions();

    // Only paid transactions for this sale
    const saleCreatedAt = sale ? new Date(sale.createdAt).getTime() : 0;
    const paidTxns = allTxns.filter(txn => {
      if (txn.status !== 'paid') return false;
      return new Date(txn.timestamp).getTime() >= saleCreatedAt;
    });

    // Collect all paid items
    const allItems = [];
    paidTxns.forEach(txn => {
      (txn.items || []).forEach(item => {
        allItems.push(item);
      });
    });

    // Sale total from paid transactions
    const saleTotal = paidTxns.reduce((sum, txn) => sum + txn.total, 0);

    // Group items by consignor
    const grouped = {}; // { consignorId: { items, revenue, count } }
    const untagged = { items: [], revenue: 0, count: 0 };

    allItems.forEach(item => {
      const qty = item.quantity || 1;
      if (item.consignorId) {
        if (!grouped[item.consignorId]) {
          grouped[item.consignorId] = { items: [], revenue: 0, count: 0 };
        }
        grouped[item.consignorId].items.push(item);
        grouped[item.consignorId].revenue += item.finalPrice;
        grouped[item.consignorId].count += qty;
      } else {
        untagged.items.push(item);
        untagged.revenue += item.finalPrice;
        untagged.count += qty;
      }
    });

    // Calculate operator total
    let operatorTotal = untagged.revenue;
    consignors.forEach(c => {
      const g = grouped[c.id];
      if (!g) return;
      if (c.payoutType === 'percentage') {
        operatorTotal += g.revenue * ((100 - c.payoutValue) / 100);
      } else {
        operatorTotal += Math.min(g.count * c.payoutValue, g.revenue);
      }
    });

    const renderItemsList = (items) => items.map(item => {
      const qty = item.quantity || 1;
      let desc = item.description || 'Item';
      if (qty > 1) desc += ` × ${qty}`;
      return `<li class="payouts__item-row">
        <span class="payouts__item-desc">${Utils.escapeHtml(desc)}</span>
        <span class="payouts__item-price">${Utils.formatCurrency(item.finalPrice)}</span>
      </li>`;
    }).join('');

    const chevronSvg = (expanded) => `<svg class="payouts__chevron${expanded ? ' payouts__chevron--up' : ''}" viewBox="0 0 12 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 1l5 5 5-5"/></svg>`;

    // Top: title + subtitle
    let html = `<div class="payouts__topbar">
      <h1 class="payouts__title">Consignor Payouts</h1>
      <p class="payouts__subtitle">Based on paid invoices only</p>
    </div>`;

    // Totals card (Sale Total / Your Cut)
    html += `<div class="payouts__card">
      <div class="payouts__row">
        <span class="payouts__row-label">Sale Total</span>
        <span class="payouts__row-value">${Utils.formatCurrency(saleTotal)}</span>
      </div>
      <div class="payouts__row payouts__row--highlight">
        <span class="payouts__row-label">Your Cut</span>
        <span class="payouts__row-value payouts__row-value--success">${Utils.formatCurrency(operatorTotal)}</span>
      </div>
    </div>`;

    // Per-consignor cards
    consignors.forEach(c => {
      const g = grouped[c.id] || { items: [], revenue: 0, count: 0 };
      let consignorGets, operatorKeeps, arrangementLabel, warningHtml = '';

      if (c.payoutType === 'percentage') {
        consignorGets = g.revenue * (c.payoutValue / 100);
        operatorKeeps = g.revenue - consignorGets;
        arrangementLabel = `${c.payoutValue}% payout`;
      } else {
        const fee = g.count * c.payoutValue;
        operatorKeeps = Math.min(fee, g.revenue);
        consignorGets = g.revenue - operatorKeeps;
        arrangementLabel = `$${c.payoutValue} flat fee/item`;
        if (fee > g.revenue && g.revenue > 0) {
          warningHtml = `<div class="payouts__warning">Operator fee ($${fee.toFixed(2)}) exceeds revenue</div>`;
        }
      }

      const expanded = !!this._expanded[c.id];
      const itemsHtml = renderItemsList(g.items);
      const itemCountLabel = `${g.count} item${g.count !== 1 ? 's' : ''}`;

      html += `<div class="payouts__card">
        <div class="payouts__card-header">
          <span class="payouts__dot" style="background: ${c.color}"></span>
          <span class="payouts__name">${Utils.escapeHtml(c.name)}</span>
          <span class="payouts__arrangement">${arrangementLabel}</span>
        </div>
        ${warningHtml}
        <div class="payouts__row">
          <span class="payouts__row-label">Items sold</span>
          <span class="payouts__row-value">${g.count}</span>
        </div>
        <div class="payouts__row">
          <span class="payouts__row-label">Revenue</span>
          <span class="payouts__row-value">${Utils.formatCurrency(g.revenue)}</span>
        </div>
        <div class="payouts__row payouts__row--payout">
          <span class="payouts__row-label">${Utils.escapeHtml(c.name)} gets</span>
          <span class="payouts__row-value payouts__row-value--bold">${Utils.formatCurrency(consignorGets)}</span>
        </div>
        <div class="payouts__row payouts__row--operator">
          <span class="payouts__row-label">You keep</span>
          <span class="payouts__row-value payouts__row-value--bold payouts__row-value--success">${Utils.formatCurrency(operatorKeeps)}</span>
        </div>
        ${g.items.length > 0 ? `
          <button class="payouts__row payouts__row--toggle" data-toggle-consignor="${c.id}" type="button">
            <span class="payouts__row-label payouts__row-label--link">${expanded ? 'Hide' : 'View'} ${itemCountLabel}</span>
            ${chevronSvg(expanded)}
          </button>
          <ul class="payouts__items-list${expanded ? ' payouts__items-list--visible' : ''}">${itemsHtml}</ul>
        ` : ''}
      </div>`;
    });

    // Untagged section
    if (untagged.count > 0) {
      const expanded = !!this._expanded['_untagged'];
      const uItemsHtml = renderItemsList(untagged.items);
      const uItemCountLabel = `${untagged.count} item${untagged.count !== 1 ? 's' : ''}`;

      html += `<div class="payouts__card">
        <div class="payouts__card-header">
          <span class="payouts__dot payouts__dot--empty"></span>
          <span class="payouts__name">Untagged items</span>
          <span class="payouts__arrangement">No consignor</span>
        </div>
        <div class="payouts__row">
          <span class="payouts__row-label">Items sold</span>
          <span class="payouts__row-value">${untagged.count}</span>
        </div>
        <div class="payouts__row">
          <span class="payouts__row-label">Revenue</span>
          <span class="payouts__row-value">${Utils.formatCurrency(untagged.revenue)}</span>
        </div>
        <div class="payouts__row payouts__row--operator">
          <span class="payouts__row-label">All yours</span>
          <span class="payouts__row-value payouts__row-value--bold payouts__row-value--success">${Utils.formatCurrency(untagged.revenue)}</span>
        </div>
        ${untagged.items.length > 0 ? `
          <button class="payouts__row payouts__row--toggle" data-toggle-consignor="_untagged" type="button">
            <span class="payouts__row-label payouts__row-label--link">${expanded ? 'Hide' : 'View'} ${uItemCountLabel}</span>
            ${chevronSvg(expanded)}
          </button>
          <ul class="payouts__items-list${expanded ? ' payouts__items-list--visible' : ''}">${uItemsHtml}</ul>
        ` : ''}
      </div>`;
    }

    // Empty state — no paid items at all
    if (allItems.length === 0) {
      html += `<div class="payouts__empty">
        <span class="payouts__empty-heading">No paid invoices yet</span>
        <span class="payouts__empty-helper">Payouts will appear here as orders are paid.</span>
      </div>`;
    }

    container.innerHTML = html;

    // Bind expand/collapse
    container.querySelectorAll('[data-toggle-consignor]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.toggleConsignor;
        this._expanded[id] = !this._expanded[id];
        this.render();
      });
    });
  }
};

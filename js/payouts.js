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

    // Build HTML
    let html = `<h2 class="payouts__title">Consignor Payouts</h2>`;
    html += `<div class="payouts__totals">
      <div class="payouts__total-line">
        <span>Sale Total</span>
        <span class="payouts__total-value">${Utils.formatCurrency(saleTotal)}</span>
      </div>
      <div class="payouts__total-line payouts__total-line--highlight">
        <span>Your Cut</span>
        <span class="payouts__total-value">${Utils.formatCurrency(operatorTotal)}</span>
      </div>
    </div>`;
    html += `<p class="payouts__note">Based on paid invoices only</p>`;

    // Each consignor section
    consignors.forEach(c => {
      const g = grouped[c.id] || { items: [], revenue: 0, count: 0 };
      let consignorGets, operatorKeeps, arrangementLabel, warning = '';

      if (c.payoutType === 'percentage') {
        consignorGets = g.revenue * (c.payoutValue / 100);
        operatorKeeps = g.revenue - consignorGets;
        arrangementLabel = `Payout: ${c.payoutValue}%`;
      } else {
        const fee = g.count * c.payoutValue;
        operatorKeeps = Math.min(fee, g.revenue);
        consignorGets = g.revenue - operatorKeeps;
        arrangementLabel = `Payout: $${c.payoutValue} flat fee/item`;
        if (fee > g.revenue && g.revenue > 0) {
          warning = `<div class="payouts__warning">Operator fee ($${fee.toFixed(2)}) exceeds revenue</div>`;
        }
      }

      const expandedClass = this._expanded[c.id] ? ' payouts__items--visible' : '';
      const chevron = this._expanded[c.id] ? '▲' : '▼';

      const itemsHtml = g.items.map(item => {
        const qty = item.quantity || 1;
        let desc = item.description || 'Item';
        if (qty > 1) desc += ` x${qty}`;
        return `<li class="payouts__item-row">
          <span>${Utils.escapeHtml(desc)}</span>
          <span>${Utils.formatCurrency(item.finalPrice)}</span>
        </li>`;
      }).join('');

      html += `<div class="payouts__section">
        <div class="payouts__section-header">
          <span class="payouts__dot" style="background: ${c.color}"></span>
          <span class="payouts__name">${Utils.escapeHtml(c.name)}</span>
        </div>
        <div class="payouts__arrangement">${arrangementLabel}</div>
        ${warning}
        <div class="payouts__stats">
          <div class="payouts__stat-line"><span>Items sold</span><span>${g.count}</span></div>
          <div class="payouts__stat-line"><span>Revenue</span><span>${Utils.formatCurrency(g.revenue)}</span></div>
          <div class="payouts__stat-line payouts__stat-line--payout"><span>${Utils.escapeHtml(c.name)} gets</span><span>${Utils.formatCurrency(consignorGets)}</span></div>
          <div class="payouts__stat-line payouts__stat-line--operator"><span>You keep</span><span>${Utils.formatCurrency(operatorKeeps)}</span></div>
        </div>
        ${g.items.length > 0 ? `<button class="payouts__view-items" data-toggle-consignor="${c.id}">View Items ${chevron}</button>
        <ul class="payouts__items${expandedClass}">${itemsHtml}</ul>` : ''}
      </div>`;
    });

    // Untagged section
    if (untagged.count > 0 || allItems.length === 0) {
      const uExpandedClass = this._expanded['_untagged'] ? ' payouts__items--visible' : '';
      const uChevron = this._expanded['_untagged'] ? '▲' : '▼';

      const uItemsHtml = untagged.items.map(item => {
        const qty = item.quantity || 1;
        let desc = item.description || 'Item';
        if (qty > 1) desc += ` x${qty}`;
        return `<li class="payouts__item-row">
          <span>${Utils.escapeHtml(desc)}</span>
          <span>${Utils.formatCurrency(item.finalPrice)}</span>
        </li>`;
      }).join('');

      html += `<div class="payouts__section payouts__section--untagged">
        <div class="payouts__section-header">
          <span class="payouts__name">Untagged Items</span>
        </div>
        <div class="payouts__arrangement">Items with no consignor</div>
        <div class="payouts__stats">
          <div class="payouts__stat-line"><span>Items sold</span><span>${untagged.count}</span></div>
          <div class="payouts__stat-line"><span>Revenue</span><span>${Utils.formatCurrency(untagged.revenue)}</span></div>
          <div class="payouts__stat-line payouts__stat-line--operator"><span>All yours</span><span>${Utils.formatCurrency(untagged.revenue)}</span></div>
        </div>
        ${untagged.items.length > 0 ? `<button class="payouts__view-items" data-toggle-consignor="_untagged">View Items ${uChevron}</button>
        <ul class="payouts__items${uExpandedClass}">${uItemsHtml}</ul>` : ''}
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

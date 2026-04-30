/**
 * past-sales.js — Past Sales archive (v193)
 *
 * Two screens:
 *   #screen-past-sales         — list of archived sales (newest first)
 *   #screen-past-sale-detail   — read-only review of one archived sale
 *
 * Storage source is IndexedDB (ArchiveDB in storage.js). All data here is a
 * frozen snapshot taken at end-sale time — no mutations, no syncing.
 *
 * Cloud purge from the detail screen calls Sync.deleteSale and falls back to
 * the deferred queue when offline. Local archive removal is hard-failed on
 * cloud delete failure: the local entry is removed only after the cloud
 * delete succeeds OR is enqueued for later retry.
 */

const PastSales = {
  // The archive entry currently shown on the detail screen.
  currentEntry: null,

  // Expanded transaction id for accordion behavior on detail screen.
  expandedTransactionId: null,

  init() {
    // v203: in-screen back arrows defer to browser history when there's
    // something to pop (so back arrow + browser back / iOS swipe-back do the
    // same thing). Falls back to a hard-coded target on cold-load deep links
    // where there's no in-app history yet.
    const backList = document.getElementById('past-sales-back');
    if (backList) {
      backList.addEventListener('click', () => {
        if (window.history.length > 1) {
          window.history.back();
        } else {
          const sale = Storage.getSale();
          App.showScreen(sale ? 'dashboard' : 'setup');
        }
      });
    }

    const backDetail = document.getElementById('past-sale-detail-back');
    if (backDetail) {
      backDetail.addEventListener('click', () => {
        if (window.history.length > 1) {
          window.history.back();
        } else {
          App.showScreen('past-sales');
        }
      });
    }

    const exportBtn = document.getElementById('past-sale-export');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        if (!this.currentEntry) return;
        App.exportSaleData('past-sale-export-error', {
          sale: this.currentEntry.sale,
          transactions: this.currentEntry.transactions,
          consignors: this.currentEntry.consignors
        });
      });
    }

    const deleteBtn = document.getElementById('past-sale-delete');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => this._openDeleteConfirm());
    }

    // Delete-confirm sheet wiring
    const deleteConfirm = document.getElementById('delete-past-sale-confirm');
    const deleteCancel = document.getElementById('delete-past-sale-cancel');
    const deleteModal = document.getElementById('delete-past-sale-modal');
    const deleteInput = document.getElementById('delete-past-sale-input');

    if (deleteConfirm) {
      deleteConfirm.addEventListener('click', () => this._handleDeleteConfirm());
    }
    if (deleteCancel) {
      deleteCancel.addEventListener('click', () => this._closeDeleteConfirm());
    }
    if (deleteModal) {
      deleteModal.addEventListener('click', (e) => {
        if (e.target === deleteModal) this._closeDeleteConfirm();
      });
    }
    if (deleteInput) {
      // Clear inline error as the user starts typing again.
      deleteInput.addEventListener('input', () => {
        const err = document.getElementById('delete-past-sale-error');
        if (err && !err.hidden) {
          err.hidden = true;
          err.textContent = '';
        }
      });
    }

    // v199: clear-all-archives wiring. Type "DELETE" to confirm a wipe.
    const clearAllBtn = document.getElementById('past-sales-clear-all');
    const clearModal = document.getElementById('clear-past-sales-modal');
    const clearConfirm = document.getElementById('clear-past-sales-confirm');
    const clearCancel = document.getElementById('clear-past-sales-cancel');
    const clearInput = document.getElementById('clear-past-sales-input');

    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', () => this._openClearAllConfirm());
    }
    if (clearConfirm) {
      clearConfirm.addEventListener('click', () => this._handleClearAllConfirm());
    }
    if (clearCancel) {
      clearCancel.addEventListener('click', () => this._closeClearAllConfirm());
    }
    if (clearModal) {
      clearModal.addEventListener('click', (e) => {
        if (e.target === clearModal) this._closeClearAllConfirm();
      });
    }
    if (clearInput) {
      clearInput.addEventListener('input', () => {
        const err = document.getElementById('clear-past-sales-error');
        if (err && !err.hidden) {
          err.hidden = true;
          err.textContent = '';
        }
      });
    }
  },

  /** Render the list screen — called from App.showScreen('past-sales'). */
  async renderList() {
    const body = document.getElementById('past-sales-body');
    if (!body) return;

    let entries = [];
    try {
      entries = await ArchiveDB.getAll();
    } catch (err) {
      console.warn('[past-sales] getAll failed:', err.message);
    }

    // Toggle the bottom "Clear all past estate sales" footer based on count.
    const footer = document.getElementById('past-sales-footer');
    if (footer) footer.hidden = entries.length === 0;

    if (entries.length === 0) {
      body.innerHTML = `
        <div class="ec-empty-state past-sales-empty">
          <p class="ec-empty-state__heading">No past estate sales yet</p>
          <p class="ec-empty-state__helper">Estate sales you've ended permanently will appear here.</p>
        </div>
      `;
      return;
    }

    body.innerHTML = entries.map(entry => {
      const sale = entry.sale || {};
      const txns = entry.transactions || [];
      const dateRange = this._formatDateRange(sale);
      const dayCount = (sale.scheduleDays && sale.scheduleDays.length) || 1;
      const dayLabel = `${dayCount} day${dayCount === 1 ? '' : 's'}`;
      const invoices = txns.filter(t => t.status !== 'void');
      const paid = txns.filter(t => t.status === 'paid');
      const revenue = paid.reduce((sum, t) => sum + (t.total || 0), 0);
      const invoiceLabel = `${invoices.length} invoice${invoices.length === 1 ? '' : 's'}`;
      const revenueLabel = Utils.formatCurrency(revenue);

      return `
        <button class="ec-card past-sale-row" data-archive-id="${entry.archiveId}" type="button">
          <span class="past-sale-row__name">${Utils.escapeHtml(sale.name || 'Untitled Estate Sale')}</span>
          <span class="past-sale-row__meta">${dateRange} · ${dayLabel}</span>
          <span class="past-sale-row__meta">${invoiceLabel} · ${revenueLabel} revenue</span>
        </button>
      `;
    }).join('');

    body.querySelectorAll('[data-archive-id]').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.archiveId;
        App.showScreen('past-sale-detail', id);
      });
    });
  },

  /** Render the detail screen — called with the archiveId. */
  async renderDetail(archiveId) {
    let entry = null;
    try {
      entry = await ArchiveDB.get(archiveId);
    } catch (err) {
      console.warn('[past-sales] get failed:', err.message);
    }
    this.currentEntry = entry;
    this.expandedTransactionId = null;

    if (!entry) {
      // Race: archive entry no longer exists (e.g. deleted on another flow,
      // or cold-load on a stale deep link). Bounce back to list with replace
      // so the bogus hash isn't preserved in history.
      App.showScreen('past-sales', null, { replace: true });
      return;
    }

    const sale = entry.sale || {};
    const txns = entry.transactions || [];
    const consignors = entry.consignors || [];

    const titleEl = document.getElementById('past-sale-detail-title');
    if (titleEl) titleEl.textContent = sale.name || 'Untitled Estate Sale';

    const subtitleEl = document.getElementById('past-sale-detail-subtitle');
    if (subtitleEl) subtitleEl.textContent = this._formatDateRange(sale);

    // Stats
    const activeTxns = txns.filter(t => t.status !== 'void');
    const paidTxns = txns.filter(t => t.status === 'paid');
    const revenue = paidTxns.reduce((sum, t) => sum + (t.total || 0), 0);
    const avg = paidTxns.length > 0 ? revenue / paidTxns.length : 0;

    document.getElementById('past-sale-stat-invoices').textContent = activeTxns.length.toString();
    document.getElementById('past-sale-stat-revenue').textContent = Utils.formatCurrency(revenue);
    document.getElementById('past-sale-stat-avg').textContent = Utils.formatCurrency(avg);

    // Revenue by consignor
    this._renderConsignorRevenue(txns, consignors);

    // Transactions list (read-only via shared Dashboard helper)
    const list = document.getElementById('past-sale-transactions');
    const empty = document.getElementById('past-sale-empty');
    if (txns.length === 0) {
      list.innerHTML = '';
      empty.hidden = false;
    } else {
      empty.hidden = true;
      const sorted = [...txns].sort((a, b) =>
        new Date(b.timestamp) - new Date(a.timestamp)
      );
      list.innerHTML = sorted.map(txn => {
        try {
          return Dashboard.renderTransactionRow(txn, { readOnly: true, consignorsOverride: consignors });
        } catch (e) {
          console.error('Failed to render past-sale row:', txn.id, e);
          return '';
        }
      }).join('');

      list.querySelectorAll('.dashboard-txn').forEach(row => {
        row.addEventListener('click', (e) => {
          if (e.target.closest('.dashboard-txn__detail')) return;
          this._toggleTransaction(row.dataset.id);
        });
      });
    }
  },

  /** Read-only consignor revenue card mirroring Dashboard's renderConsignorRevenue. */
  _renderConsignorRevenue(transactions, consignors) {
    const card = document.getElementById('past-sale-consignor-revenue');
    const list = document.getElementById('past-sale-consignor-revenue-list');
    if (!card || !list) return;

    if (!consignors || consignors.length === 0) {
      card.hidden = true;
      return;
    }

    const paidTxns = transactions.filter(t => t.status === 'paid');
    const totals = {};
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

    list.innerHTML = rows.map(r => {
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

    card.hidden = false;
  },

  _toggleTransaction(txnId) {
    const list = document.getElementById('past-sale-transactions');
    if (!list) return;
    list.querySelectorAll('.dashboard-txn').forEach(row => {
      const detail = row.querySelector('.dashboard-txn__detail');
      if (row.dataset.id === txnId) {
        if (this.expandedTransactionId === txnId) {
          detail.hidden = true;
          row.classList.remove('expanded');
          this.expandedTransactionId = null;
        } else {
          detail.hidden = false;
          row.classList.add('expanded');
          this.expandedTransactionId = txnId;
        }
      } else {
        detail.hidden = true;
        row.classList.remove('expanded');
      }
    });
  },

  // ── Delete flow ──

  _openDeleteConfirm() {
    if (!this.currentEntry) return;
    const sale = this.currentEntry.sale || {};
    const name = sale.name || '';

    const inlineNameEl = document.getElementById('delete-past-sale-name-inline');
    const nameLabel = document.getElementById('delete-past-sale-name');
    const input = document.getElementById('delete-past-sale-input');
    const error = document.getElementById('delete-past-sale-error');
    const modal = document.getElementById('delete-past-sale-modal');

    if (inlineNameEl) inlineNameEl.textContent = name;
    if (nameLabel) nameLabel.textContent = name;
    if (input) {
      input.value = '';
      input.placeholder = name;
    }
    if (error) {
      error.hidden = true;
      error.textContent = '';
    }

    modal.classList.add('visible');
    setTimeout(() => { if (input) input.focus(); }, 100);
  },

  _closeDeleteConfirm() {
    document.getElementById('delete-past-sale-modal').classList.remove('visible');
  },

  _nameMatches() {
    if (!this.currentEntry) return false;
    const expected = (this.currentEntry.sale.name || '').trim().toLowerCase();
    const input = document.getElementById('delete-past-sale-input');
    const typed = input ? input.value.trim().toLowerCase() : '';
    return expected.length > 0 && typed === expected;
  },

  async _handleDeleteConfirm() {
    if (!this.currentEntry) return;

    if (!this._nameMatches()) {
      const error = document.getElementById('delete-past-sale-error');
      if (error) {
        error.textContent = `Doesn't match — type "${this.currentEntry.sale.name}" to confirm.`;
        error.hidden = false;
      }
      return;
    }

    const entry = this.currentEntry;
    const sale = entry.sale || {};

    // 1) Cloud delete (if the sale was synced). On network failure, enqueue
    //    for retry. Local archive is then removed regardless — the user said
    //    "delete," and the queue will eventually clean up the cloud copy.
    if (sale._synced && sale.shareCode && sale.id) {
      const ok = await Sync.deleteSale(sale.id, sale.shareCode);
      if (!ok) {
        Sync.enqueueDelete(sale.id, sale.shareCode);
      }
    }

    // 2) Local archive removal.
    try {
      await ArchiveDB.delete(entry.archiveId);
    } catch (err) {
      console.warn('[past-sales] local archive delete failed:', err.message);
    }

    this.currentEntry = null;
    this._closeDeleteConfirm();

    // 3) Bounce to wherever makes sense — list if other archives remain,
    //    otherwise back to setup/dashboard.
    let remaining = 0;
    try { remaining = await ArchiveDB.count(); } catch (_) {}

    // v203: replace, not push — we deleted the entry the current URL points
    // to, so we shouldn't leave a back-walks-to-deleted-detail entry in
    // history (which would 404 and bounce again, infinite loop risk).
    if (remaining > 0) {
      App.showScreen('past-sales', null, { replace: true });
    } else {
      const liveSale = Storage.getSale();
      App.showScreen(liveSale ? 'dashboard' : 'setup', null, { replace: true });
    }
  },

  // ── Clear-all-archives flow (v199) ──

  _openClearAllConfirm() {
    const input = document.getElementById('clear-past-sales-input');
    const error = document.getElementById('clear-past-sales-error');
    const modal = document.getElementById('clear-past-sales-modal');
    if (input) input.value = '';
    if (error) {
      error.hidden = true;
      error.textContent = '';
    }
    if (modal) modal.classList.add('visible');
    setTimeout(() => { if (input) input.focus(); }, 100);
  },

  _closeClearAllConfirm() {
    const modal = document.getElementById('clear-past-sales-modal');
    if (modal) modal.classList.remove('visible');
  },

  async _handleClearAllConfirm() {
    const input = document.getElementById('clear-past-sales-input');
    const typed = input ? input.value.trim().toUpperCase() : '';
    if (typed !== 'DELETE') {
      const error = document.getElementById('clear-past-sales-error');
      if (error) {
        error.textContent = 'Type DELETE (in caps) to confirm.';
        error.hidden = false;
      }
      return;
    }

    try {
      await ArchiveDB.deleteAll();
    } catch (err) {
      console.warn('[past-sales] clear-all failed:', err.message);
    }

    this._closeClearAllConfirm();

    // v203: replace — every archive entry's URL is now invalid; don't leave
    // them in the back-stack.
    const sale = Storage.getSale();
    App.showScreen(sale ? 'dashboard' : 'setup', null, { replace: true });
  },

  // ── Helpers ──

  /**
   * Format the date range for an archived sale based on its scheduleDays.
   * Single day: "Apr 28"
   * Same month: "Apr 28 – May 1"
   * Different month: "Apr 28 – May 5"
   * Different year: "Dec 28, 2025 – Jan 3, 2026"
   */
  _formatDateRange(sale) {
    const days = (sale && sale.scheduleDays) || [];
    if (days.length === 0) {
      return sale && sale.startDate ? Utils.formatShortDate(sale.startDate) : '';
    }
    const firstDate = days[0].date;
    const lastDate = days[days.length - 1].date;
    if (firstDate === lastDate) return Utils.formatShortDate(firstDate);

    const [fy, fm] = firstDate.split('-').map(Number);
    const [ly, lm] = lastDate.split('-').map(Number);
    if (fy !== ly) {
      return `${Utils.formatShortDate(firstDate)}, ${fy} – ${Utils.formatShortDate(lastDate)}, ${ly}`;
    }
    return `${Utils.formatShortDate(firstDate)} – ${Utils.formatShortDate(lastDate)}`;
  }
};

if (typeof window !== 'undefined') {
  window.PastSales = PastSales;
}

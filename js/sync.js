/**
 * sync.js — Cloudflare Worker sync layer
 *
 * Wraps the REST API at apiBase below. Storage stays as the single read path
 * for the UI (offline-first). Mutations write through to the backend; failed
 * sync calls log to console but don't block the UI (offline queue is v158+).
 *
 * See PROJECT_SYNC.md for the full design.
 */

const Sync = {
  apiBase: 'https://estate-checkout-api.davidsteinbroner.workers.dev',

  /** Device id, generated once per device. Sent on mutations for audit. */
  deviceId: null,

  /** Track per-sale "last successful poll" timestamp (ISO string) for delta sync. */
  _lastSyncBySale: {},

  init() {
    let id = localStorage.getItem('_device_id');
    if (!id) {
      id = (crypto.randomUUID && crypto.randomUUID()) || ('dev_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10));
      localStorage.setItem('_device_id', id);
    }
    this.deviceId = id;
  },

  /** Whether a sale is backed by the remote API. New sales are; legacy local-only sales aren't. */
  isSynced(sale) {
    return !!(sale && sale._synced && sale.shareCode);
  },

  // === Internal request helper ===

  async _request(method, path, body = null, shareCode = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (shareCode) headers['X-Share-Code'] = shareCode;

    const opts = { method, headers };
    if (body !== null) opts.body = JSON.stringify(body);

    const response = await fetch(this.apiBase + path, opts);
    if (!response.ok) {
      let detail = '';
      try { detail = await response.text(); } catch (_) {}
      throw new Error(`${method} ${path} → ${response.status} ${detail}`);
    }
    return await response.json();
  },

  // === Sales ===

  /**
   * Create a new sale on the backend. Returns {id, shareCode, ...} which the
   * client should save locally to mark this sale as synced.
   */
  async createSale(saleConfig) {
    return await this._request('POST', '/sales', saleConfig);
  },

  /** Look up a sale by its 6-char share code (used by the join flow). */
  async fetchSaleByCode(shareCode) {
    return await this._request('GET', '/sales/by-code/' + encodeURIComponent(shareCode));
  },

  /** Update sale config (consignors changed, discount edited, status flip, etc.). */
  async patchSale(saleId, shareCode, updates) {
    return await this._request('PATCH', '/sales/' + encodeURIComponent(saleId), updates, shareCode);
  },

  // === Invoices ===

  async createInvoice(saleId, shareCode, invoice) {
    const payload = { ...invoice, createdByDevice: this.deviceId };
    return await this._request(
      'POST',
      `/sales/${encodeURIComponent(saleId)}/invoices`,
      payload,
      shareCode
    );
  },

  /**
   * List invoices for a sale, optionally only those updated since `since` (ISO).
   * Returns { invoices: [...], syncedAt: '...' }
   */
  async listInvoicesSince(saleId, shareCode, since = null) {
    const path = `/sales/${encodeURIComponent(saleId)}/invoices`
               + (since ? `?since=${encodeURIComponent(since)}` : '');
    return await this._request('GET', path, null, shareCode);
  },

  /** Public — used by ticket.html to pull a single invoice without auth. */
  async fetchInvoice(invoiceId) {
    return await this._request('GET', '/invoices/' + encodeURIComponent(invoiceId));
  },

  /** Update invoice (mark paid, void, edit) — all sync via this. */
  async patchInvoice(saleId, shareCode, invoiceId, updates) {
    return await this._request(
      'PATCH',
      `/sales/${encodeURIComponent(saleId)}/invoices/${encodeURIComponent(invoiceId)}`,
      updates,
      shareCode
    );
  },

  // === Server ↔ client invoice shape mapping ===

  /** Map a server invoice payload into the local Storage transaction shape. */
  serverInvoiceToLocal(srv) {
    return {
      id: srv.id,
      customerNumber: srv.customerNumber,
      orderName: srv.orderName,
      items: srv.items || [],
      subtotal: srv.subtotal,
      total: srv.total,
      ticketDiscount: srv.ticketDiscount,
      saleDay: srv.saleDay,
      status: srv.status,
      paidAt: srv.paidAt,
      voidedAt: srv.voidedAt,
      voidReason: srv.voidReason,
      timestamp: srv.createdAt,
      _updatedAt: srv.updatedAt,
      _synced: true
    };
  },

  /** Map a local transaction into the server's expected POST/PATCH shape. */
  localInvoiceToServer(local) {
    return {
      id: local.id,
      customerNumber: local.customerNumber,
      orderName: local.orderName || null,
      items: local.items || [],
      subtotal: local.subtotal,
      total: local.total,
      ticketDiscount: local.ticketDiscount || null,
      saleDay: local.saleDay,
      status: local.status,
      paidAt: local.paidAt || null,
      voidedAt: local.voidedAt || null,
      voidReason: local.voidReason || null,
      createdAt: local.timestamp,
      createdByDevice: this.deviceId
    };
  },

  // === Polling ===

  /**
   * Pull any invoices updated on the backend since our last successful sync,
   * and merge them into local Storage. Safe to call repeatedly.
   * Returns the count of invoices pulled.
   */
  async pullInvoices(sale) {
    if (!this.isSynced(sale)) return 0;
    const lastSync = this._lastSyncBySale[sale.id] || null;
    let result;
    try {
      result = await this.listInvoicesSince(sale.id, sale.shareCode, lastSync);
    } catch (err) {
      console.warn('[sync] pullInvoices failed:', err.message);
      return 0;
    }

    const incoming = (result.invoices || []).map(srv => this.serverInvoiceToLocal(srv));
    if (incoming.length > 0) {
      const all = Storage.getTransactions();
      const byId = new Map(all.map(t => [t.id, t]));
      incoming.forEach(srv => byId.set(srv.id, srv));
      const merged = Array.from(byId.values());
      // Persist via direct localStorage set (Storage doesn't expose a bulk-set API)
      localStorage.setItem(Storage.KEYS.TRANSACTIONS, JSON.stringify(merged));
    }

    this._lastSyncBySale[sale.id] = result.syncedAt || new Date().toISOString();
    return incoming.length;
  },

  /**
   * Start polling for the given sale. Returns a stop function.
   * Polling pauses while the page/tab is hidden (visibilitychange listener).
   */
  startPolling(sale, intervalMs = 3000, onPull = null) {
    if (!this.isSynced(sale)) return () => {};

    let timerId = null;
    let stopped = false;

    const tick = async () => {
      if (stopped || document.visibilityState !== 'visible') return;
      const count = await this.pullInvoices(sale);
      if (count > 0 && typeof onPull === 'function') onPull(count);
    };

    const start = () => {
      if (timerId !== null) return;
      tick(); // immediate first pull
      timerId = setInterval(tick, intervalMs);
    };

    const stop = () => {
      if (timerId !== null) {
        clearInterval(timerId);
        timerId = null;
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') start();
      else stop();
    };

    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      stopped = true;
      stop();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }
};

if (typeof window !== 'undefined') {
  window.Sync = Sync;
}

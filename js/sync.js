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

  /** Cloud-deletes that couldn't reach the server when the user purged offline. */
  _PENDING_DELETES_KEY: 'estate_pending_cloud_deletes',

  init() {
    let id = localStorage.getItem('_device_id');
    if (!id) {
      id = (crypto.randomUUID && crypto.randomUUID()) || ('dev_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10));
      localStorage.setItem('_device_id', id);
    }
    this.deviceId = id;

    // Drain queued cloud-deletes silently. Any failures stay in the queue and
    // retry on the next init. The user is never notified — the local archive
    // entry is already gone, the cloud copy is the only thing left to clean.
    this._drainPendingDeletes();
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

  /**
   * Cascade-delete a sale and its invoices on the backend. v193.
   *
   * Returns true on success (incl. 204/404 — both mean the cloud copy is gone),
   * false on transport failure (queued for later retry).
   */
  async deleteSale(saleId, shareCode) {
    const headers = { 'Content-Type': 'application/json' };
    if (shareCode) headers['X-Share-Code'] = shareCode;
    try {
      const response = await fetch(this.apiBase + '/sales/' + encodeURIComponent(saleId), {
        method: 'DELETE',
        headers
      });
      // 204: deleted. 404: already gone. Both fine.
      if (response.status === 204 || response.status === 404) return true;
      // 401: bad share code — local copy is already removed, no point queuing.
      if (response.status === 401) {
        console.warn('[sync] deleteSale auth rejected for sale', saleId);
        return true;
      }
      console.warn('[sync] deleteSale unexpected status', response.status);
      return false;
    } catch (err) {
      console.warn('[sync] deleteSale network failure:', err.message);
      return false;
    }
  },

  /**
   * Read the pending-cloud-deletes queue from localStorage.
   * Shape: [{ saleId, shareCode, queuedAt }, ...]
   */
  _getPendingDeletes() {
    try {
      const raw = localStorage.getItem(this._PENDING_DELETES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  },

  _setPendingDeletes(queue) {
    localStorage.setItem(this._PENDING_DELETES_KEY, JSON.stringify(queue));
  },

  /** Append one entry to the deferred-delete queue. */
  enqueueDelete(saleId, shareCode) {
    if (!saleId) return;
    const queue = this._getPendingDeletes();
    if (queue.some(e => e.saleId === saleId)) return; // already queued
    queue.push({ saleId, shareCode: shareCode || null, queuedAt: new Date().toISOString() });
    this._setPendingDeletes(queue);
  },

  /**
   * Best-effort drain. Removes successful entries from the queue; leaves
   * transport-failed entries for the next init. Silent — no UI surface.
   */
  async _drainPendingDeletes() {
    const queue = this._getPendingDeletes();
    if (queue.length === 0) return;

    const remaining = [];
    for (const entry of queue) {
      const ok = await this.deleteSale(entry.saleId, entry.shareCode);
      if (!ok) remaining.push(entry);
    }
    this._setPendingDeletes(remaining);
    if (remaining.length < queue.length) {
      console.log(`[sync] drained ${queue.length - remaining.length} pending cloud-delete(s); ${remaining.length} still queued`);
    }
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
   * AND the sale's current state (status/consignors/discounts may have
   * changed on another device). Returns the result object so callers can
   * react to status changes:
   *   { count, saleStatusChanged, sale }
   */
  async pullInvoices(sale) {
    if (!this.isSynced(sale)) return { count: 0, saleStatusChanged: false, sale: null };
    const lastSync = this._lastSyncBySale[sale.id] || null;
    let result;
    try {
      result = await this.listInvoicesSince(sale.id, sale.shareCode, lastSync);
    } catch (err) {
      // 404 from listInvoices means the sale was deleted on another device.
      // Surface this as a remote status change so the app can react (alert
      // the user, stop polling). Other failures are transient — return quietly.
      if (/→\s*404\b/.test(err.message || '')) {
        console.warn('[sync] sale appears to have been purged remotely:', sale.id);
        return { count: 0, saleStatusChanged: true, sale: null, newStatus: 'purged', remoteDeleted: true };
      }
      console.warn('[sync] pullInvoices failed:', err.message);
      return { count: 0, saleStatusChanged: false, sale: null };
    }

    // Merge invoices
    const incoming = (result.invoices || []).map(srv => this.serverInvoiceToLocal(srv));
    if (incoming.length > 0) {
      const all = Storage.getTransactions();
      const byId = new Map(all.map(t => [t.id, t]));
      incoming.forEach(srv => byId.set(srv.id, srv));
      localStorage.setItem(Storage.KEYS.TRANSACTIONS, JSON.stringify(Array.from(byId.values())));
    }

    // Detect sale state changes — apply remote state to local, return whether
    // the status differs from what we had before.
    let saleStatusChanged = false;
    let mergedSale = null;
    if (result.sale) {
      const local = Storage.getSale();
      if (local && local.id === result.sale.id) {
        const prevStatus = local.status;
        // Apply remote state but keep local _synced flag and createdAt
        mergedSale = {
          ...local,
          name: result.sale.name,
          startDate: result.sale.startDate,
          endDate: result.sale.endDate,
          discounts: result.sale.discounts,
          consignors: result.sale.consignors,
          maxDiscountPercent: result.sale.maxDiscountPercent,
          status: result.sale.status,
          endedAt: result.sale.endedAt,
          shareCode: result.sale.shareCode
        };
        Storage.saveSale(mergedSale);
        saleStatusChanged = prevStatus !== result.sale.status;
      }
    }

    this._lastSyncBySale[sale.id] = result.syncedAt || new Date().toISOString();
    return {
      count: incoming.length,
      saleStatusChanged,
      sale: mergedSale,
      newStatus: mergedSale ? mergedSale.status : null
    };
  },

  /**
   * Start polling for the given sale. Returns a stop function.
   * Polling pauses while the page/tab is hidden (visibilitychange listener).
   *
   * onPull(result) is called after every successful poll with:
   *   { count, saleStatusChanged, sale, newStatus }
   * so the caller can re-render and react to remote status changes.
   */
  startPolling(sale, intervalMs = 3000, onPull = null) {
    if (!this.isSynced(sale)) return () => {};

    let timerId = null;
    let stopped = false;

    const tick = async () => {
      if (stopped || document.visibilityState !== 'visible') return;
      const result = await this.pullInvoices(sale);
      if (typeof onPull === 'function') onPull(result);
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

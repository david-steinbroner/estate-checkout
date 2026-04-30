/**
 * storage.js - localStorage abstraction for Estate Checkout
 * Handles all data persistence with JSON serialization
 */

const Storage = {
  KEYS: {
    SALE: 'estate_sale',
    CART: 'estate_cart',
    TRANSACTIONS: 'estate_transactions',
    CUSTOMER_COUNTER: 'estate_customer_counter',
    DRAFT_TXN_ID: 'estate_draft_txn_id'
  },

  /**
   * Save the current sale configuration
   */
  saveSale(sale) {
    localStorage.setItem(this.KEYS.SALE, JSON.stringify(sale));
  },

  /**
   * Get the current sale configuration
   * Returns null if no sale is active
   *
   * v190 migration: if the sale predates the scheduleDays field, derive
   * it from discounts + startDate (consecutive calendar days) and write
   * back. This means gap schedules created before v190 will be inaccurate
   * (the source dates were never persisted), but any sale created from
   * v190 onward gets correct per-day dates.
   */
  getSale() {
    const data = localStorage.getItem(this.KEYS.SALE);
    if (!data) return null;
    const sale = JSON.parse(data);
    if (!sale.scheduleDays && sale.discounts && sale.startDate) {
      const dayKeys = Object.keys(sale.discounts).map(Number).sort((a, b) => a - b);
      const [y, m, d] = sale.startDate.split('-').map(Number);
      const start = new Date(y, m - 1, d);
      sale.scheduleDays = dayKeys.map(dayNum => {
        const dt = new Date(start);
        dt.setDate(dt.getDate() + (dayNum - 1));
        const yyyy = dt.getFullYear();
        const mm = String(dt.getMonth() + 1).padStart(2, '0');
        const dd = String(dt.getDate()).padStart(2, '0');
        return { day: dayNum, date: `${yyyy}-${mm}-${dd}`, discount: sale.discounts[dayNum] || 0 };
      });
      this.saveSale(sale);
    }
    return sale;
  },

  /**
   * Clear the current sale
   */
  clearSale() {
    localStorage.removeItem(this.KEYS.SALE);
  },

  /**
   * Save the current cart (items + invoice discount)
   */
  saveCart(items, ticketDiscount) {
    localStorage.setItem(this.KEYS.CART, JSON.stringify({
      items: items,
      ticketDiscount: ticketDiscount || null
    }));
  },

  /**
   * Get the current cart
   * Returns { items: [], ticketDiscount: null }
   * Handles migration from old array format
   */
  getCart() {
    const data = localStorage.getItem(this.KEYS.CART);
    if (!data) return { items: [], ticketDiscount: null };

    const parsed = JSON.parse(data);

    // Migrate old format (plain array) to new wrapped format
    if (Array.isArray(parsed)) {
      return { items: parsed, ticketDiscount: null };
    }

    return {
      items: parsed.items || [],
      ticketDiscount: this._migrateTicketDiscount(parsed.ticketDiscount)
    };
  },

  /**
   * Clear the cart
   */
  clearCart() {
    localStorage.removeItem(this.KEYS.CART);
  },

  /**
   * Save a completed transaction
   * Appends to the transaction list
   */
  saveTransaction(transaction) {
    const transactions = this.getTransactions();
    transactions.push(transaction);
    localStorage.setItem(this.KEYS.TRANSACTIONS, JSON.stringify(transactions));
  },

  /**
   * Get all transactions (with migration for old data)
   */
  getTransactions() {
    const data = localStorage.getItem(this.KEYS.TRANSACTIONS);
    if (!data) return [];

    const transactions = JSON.parse(data);

    // Migrate old transactions that don't have new fields
    return transactions.map(txn => ({
      ...txn,
      status: txn.status === 'pending' ? 'unpaid' : (txn.status || 'unpaid'),
      paidAt: txn.paidAt || null,
      voidedAt: txn.voidedAt || null,
      reopenedFrom: txn.reopenedFrom || null,
      orderName: txn.orderName || '',
      ticketDiscount: this._migrateTicketDiscount(txn.ticketDiscount),
      subtotal: txn.subtotal || txn.total
    }));
  },

  /**
   * v206: migrate the legacy ticketDiscount shape (`{type:'percent'|'dollar'|'newprice', value}`)
   * to the v206 shape (`{type:'discount'|'surcharge'|'set', mode, value}`).
   * Idempotent — already-new records pass through unchanged. Pure transform;
   * doesn't write back. Storage.exportSaleCSV and dashboard read paths get
   * the new shape automatically.
   */
  _migrateTicketDiscount(td) {
    if (!td) return null;
    if (td.type === 'discount' || td.type === 'surcharge' || td.type === 'set') return td;
    if (td.type === 'percent')  return { type: 'discount', mode: 'percent', value: td.value };
    if (td.type === 'dollar')   return { type: 'discount', mode: 'dollar',  value: td.value };
    if (td.type === 'newprice') return { type: 'set',      mode: null,      value: td.value };
    return td;
  },

  /**
   * Update a specific transaction by ID.
   *
   * v200: stamp `_updatedAt` with the current timestamp so the sync layer
   * can use it as a conflict-resolution baseline. Without this, a local
   * mutation (e.g. Mark Paid) could be clobbered by an in-flight poll
   * that reads the still-stale record back from the server before the
   * PATCH lands.
   */
  updateTransaction(txnId, updates) {
    const transactions = this.getTransactions();
    const index = transactions.findIndex(t => t.id === txnId);

    if (index === -1) return false;

    transactions[index] = {
      ...transactions[index],
      ...updates,
      _updatedAt: new Date().toISOString()
    };
    localStorage.setItem(this.KEYS.TRANSACTIONS, JSON.stringify(transactions));
    return true;
  },

  /**
   * Get a specific transaction by ID
   */
  getTransaction(txnId) {
    const transactions = this.getTransactions();
    return transactions.find(t => t.id === txnId) || null;
  },

  /**
   * Clear all transactions (used when ending a sale)
   */
  clearTransactions() {
    localStorage.removeItem(this.KEYS.TRANSACTIONS);
  },

  /**
   * v199: Remove transactions belonging to a specific sale.
   *
   * Called from SaleSetup.clearEndedSale (i.e. "Start New Estate Sale") so
   * the just-ended sale's transactions don't leak into the next sale's
   * archive. Order matters: the archive snapshot must already have been
   * taken before this runs (it is — snapshot happens at end-sale, this
   * runs later when the user starts a fresh sale).
   *
   * Matches by saleId primarily; falls back to the legacy timestamp
   * heuristic for transactions that predate the v199 saleId tagging.
   */
  clearTransactionsForSale(sale) {
    if (!sale) return;
    const txns = this.getTransactions();
    const remaining = txns.filter(t => !this.isTransactionForSale(t, sale));
    localStorage.setItem(this.KEYS.TRANSACTIONS, JSON.stringify(remaining));
  },

  /**
   * v199: Does this transaction belong to this sale?
   *
   * Primary check: txn.saleId === sale.id (set at creation in v199+).
   * Fallback: legacy transactions without saleId are matched by timestamp
   * (txn.timestamp >= sale.createdAt) — same heuristic the dashboard used
   * before v199. The fallback covers transactions written before the fix
   * AND any race where the field is missing.
   */
  isTransactionForSale(txn, sale) {
    if (!sale || !txn) return false;
    if (txn.saleId) return txn.saleId === sale.id;
    if (!txn.timestamp || !sale.createdAt) return false;
    return new Date(txn.timestamp).getTime() >= new Date(sale.createdAt).getTime();
  },

  /**
   * v199: Return all transactions belonging to a specific sale.
   * Wraps isTransactionForSale; the canonical "scope to sale" reader.
   */
  getTransactionsForSale(sale) {
    if (!sale) return [];
    return this.getTransactions().filter(t => this.isTransactionForSale(t, sale));
  },

  /**
   * Get the next customer number for the current sale
   * Auto-increments and resets when sale changes
   */
  getNextCustomerNumber() {
    const sale = this.getSale();
    const data = localStorage.getItem(this.KEYS.CUSTOMER_COUNTER);

    if (data) {
      const counter = JSON.parse(data);
      // If same sale, increment and return
      if (counter.saleId === sale?.id) {
        const next = counter.counter + 1;
        this.saveCustomerCounter(sale.id, next);
        return next;
      }
    }

    // New sale or first customer - start at 1
    this.saveCustomerCounter(sale?.id, 1);
    return 1;
  },

  /**
   * Peek at the next customer number without incrementing
   * Used for placeholder text (e.g., "Invoice #3 (tap to name)")
   */
  peekNextCustomerNumber() {
    const sale = this.getSale();
    const data = localStorage.getItem(this.KEYS.CUSTOMER_COUNTER);

    if (data) {
      const counter = JSON.parse(data);
      if (counter.saleId === sale?.id) {
        return counter.counter + 1;
      }
    }

    return 1;
  },

  /**
   * Save the customer counter state
   */
  saveCustomerCounter(saleId, counter) {
    localStorage.setItem(this.KEYS.CUSTOMER_COUNTER, JSON.stringify({
      saleId: saleId,
      counter: counter
    }));
  },

  /**
   * Clear the customer counter (called when sale ends)
   */
  clearCustomerCounter() {
    localStorage.removeItem(this.KEYS.CUSTOMER_COUNTER);
  },

  /**
   * Delete a transaction by ID
   */
  deleteTransaction(txnId) {
    const transactions = this.getTransactions();
    const filtered = transactions.filter(t => t.id !== txnId);
    localStorage.setItem(this.KEYS.TRANSACTIONS, JSON.stringify(filtered));
  },

  /**
   * Save the draft transaction ID
   */
  saveDraftTxnId(id) {
    localStorage.setItem(this.KEYS.DRAFT_TXN_ID, id);
  },

  /**
   * Get the draft transaction ID
   */
  getDraftTxnId() {
    return localStorage.getItem(this.KEYS.DRAFT_TXN_ID);
  },

  /**
   * Clear the draft transaction ID
   */
  clearDraftTxnId() {
    localStorage.removeItem(this.KEYS.DRAFT_TXN_ID);
  },

  /**
   * Get consignors from the current sale
   */
  getConsignors() {
    const sale = this.getSale();
    return (sale && sale.consignors) || [];
  },

  /**
   * Save the full consignors array to the sale
   */
  saveConsignors(consignors) {
    const sale = this.getSale();
    if (!sale) return;
    sale.consignors = consignors;
    this.saveSale(sale);
  },

  /**
   * Add a consignor to the sale
   */
  addConsignor(consignor) {
    const consignors = this.getConsignors();
    consignors.push(consignor);
    this.saveConsignors(consignors);
  },

  /**
   * Update a consignor by ID
   */
  updateConsignor(id, updates) {
    const consignors = this.getConsignors();
    const index = consignors.findIndex(c => c.id === id);
    if (index === -1) return false;
    consignors[index] = { ...consignors[index], ...updates };
    this.saveConsignors(consignors);
    return true;
  },

  /**
   * Delete a consignor by ID
   */
  deleteConsignor(id) {
    const consignors = this.getConsignors().filter(c => c.id !== id);
    this.saveConsignors(consignors);
  },

  /**
   * Generate a CSV export of the current estate sale's transactions.
   * One row per line item, denormalized so consignor splits and discounts
   * are visible at the item level. Returns the CSV string.
   *
   * Empty sale or zero transactions → returns headers-only CSV (caller
   * should detect zero data and surface an inline error before calling).
   *
   * Status mapping (per v187 audit):
   *   transaction.status === 'paid'   → 'paid'
   *   transaction.status === 'unpaid' → 'unpaid'
   *   transaction.status === 'open'   → 'open'
   *   transaction.status === 'void' && voidReason includes 'Edit' → 'edited'
   *   transaction.status === 'void' (other reasons)               → 'void'
   *
   * Deleted-consignor handling (v187 audit, A): if item.consignorId points
   * to a consignor that no longer exists, treat as no-consignor — empty
   * Consignor cell, 0 in Consignor Cut, full Final Price in Your Cut.
   */
  exportSaleCSV(daysFilter) {
    // v199: scope to the active sale's transactions only — same fix as
    // archiveCurrentSale. Without this, exports include orphan rows from
    // prior sales that linger in estate_transactions.
    const sale = this.getSale();
    let transactions = sale ? this.getTransactionsForSale(sale) : [];
    // daysFilter contract:
    //   null/undefined → export all transactions
    //   []             → export headers only (no data rows)
    //   [n, ...]       → export transactions whose saleDay is in the array
    // Legacy txns with missing saleDay coerce to Day 1 to match the
    // existing fallback at the column-write site.
    if (Array.isArray(daysFilter)) {
      transactions = transactions.filter(t => daysFilter.includes(t.saleDay || 1));
    }
    const consignors = this.getConsignors();
    const consignorById = {};
    consignors.forEach(c => { consignorById[c.id] = c; });

    const headers = [
      'Day', 'Date', 'Time', 'Invoice #', 'Customer Name',
      'Item', 'Qty', 'Original Price',
      'Day Discount %', 'Day Discount $', 'Haggle $', 'Invoice Adjustment Share',
      'Final Price',
      'Consignor', 'Payout %', 'Consignor Cut', 'Your Cut',
      'Status'
    ];

    const escape = (v) => {
      if (v === null || v === undefined) return '';
      const s = String(v);
      if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    };

    const fmt$ = (n) => (Math.round(n * 100) / 100).toFixed(2);

    const rows = [headers.map(escape).join(',')];

    transactions.forEach(txn => {
      const date = new Date(txn.timestamp);
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      const hh = String(date.getHours()).padStart(2, '0');
      const mn = String(date.getMinutes()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const timeStr = `${hh}:${mn}`;

      const cssStatus = txn.status === 'void'
        ? (txn.voidReason && /edit/i.test(txn.voidReason) ? 'edited' : 'void')
        : (txn.status || 'unpaid');

      // Per-item proportional share of the invoice-level (ticket) discount.
      // ticketDiscount savings = subtotal − total. Each item carries a share
      // proportional to its finalPrice / subtotal.
      const subtotal = txn.subtotal || 0;
      const total = txn.total || subtotal;
      // v206: signed — positive when discount, negative when surcharge.
      // The per-item share carries the same sign so consignor/owner cuts
      // get the right adjustment direction.
      const ticketAdjustmentTotal = subtotal - total;

      (txn.items || []).forEach(item => {
        const qty = item.quantity || 1;
        const originalPriceTotal = (item.originalPrice || 0) * qty;
        const dayDiscountedTotal = (item.dayDiscountedPrice || item.originalPrice || 0) * qty;
        const finalLineTotal = item.finalPrice || 0;
        const dayDiscountSavings = originalPriceTotal - dayDiscountedTotal;
        const haggleSavings = dayDiscountedTotal - finalLineTotal;
        const itemTicketShare = subtotal > 0 ? (finalLineTotal / subtotal) * ticketAdjustmentTotal : 0;

        // Consignor lookup (orphaned IDs render as no-consignor per v187 audit, A)
        const consignor = item.consignorId ? consignorById[item.consignorId] : null;
        let consignorCut = 0;
        let payoutPctDisplay = '';
        if (consignor) {
          if (consignor.payoutType === 'percentage') {
            consignorCut = (finalLineTotal - itemTicketShare) * (consignor.payoutValue / 100);
            payoutPctDisplay = consignor.payoutValue;
          } else {
            // flat fee per item × qty (with safety cap at line total)
            consignorCut = Math.min(finalLineTotal - itemTicketShare, consignor.payoutValue * qty);
          }
        }
        const yourCut = (finalLineTotal - itemTicketShare) - consignorCut;

        const row = [
          txn.saleDay || 1,
          dateStr,
          timeStr,
          txn.customerNumber || '',
          txn.orderName || '',
          item.description || '',
          qty,
          fmt$(item.originalPrice || 0),
          (txn.discount || 0),  // Day Discount % snapshot from transaction
          fmt$(dayDiscountSavings),
          fmt$(haggleSavings),
          fmt$(itemTicketShare),
          fmt$(finalLineTotal),
          consignor ? consignor.name : '',
          payoutPctDisplay,
          consignor ? fmt$(consignorCut) : '',
          fmt$(yourCut),
          cssStatus
        ];
        rows.push(row.map(escape).join(','));
      });
    });

    return rows.join('\r\n');
  },

  /**
   * Build a filesystem-safe filename for the CSV export.
   *   "Johnson Estate - Oak Hill" → "johnson-estate-oak-hill-2026-04-28.csv"
   *   No name set → "estate-sale-2026-04-28.csv"
   *
   * v193: accepts an optional saleNameOverride for past-sale exports (where
   * Storage.getSale() returns null but we still know the archived sale's name).
   */
  exportFilename(saleNameOverride) {
    let rawName;
    if (typeof saleNameOverride === 'string') {
      rawName = saleNameOverride.trim();
    } else {
      const sale = this.getSale();
      rawName = sale && sale.name ? sale.name.trim() : '';
    }
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const slug = rawName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const prefix = slug || 'estate-sale';
    return `${prefix}-${dateStr}.csv`;
  },

  /**
   * v193: Build a CSV from an explicit transactions+consignors snapshot rather
   * than the live storage. Used by past-sale exports — the live storage may be
   * a different sale (or empty) by the time the user revisits an archive entry.
   *
   * Mirrors exportSaleCSV but is pure: no localStorage reads, no migrations.
   */
  exportSaleCSVFromSnapshot(transactions, consignors, daysFilter) {
    let txns = transactions || [];
    if (Array.isArray(daysFilter)) {
      txns = txns.filter(t => daysFilter.includes(t.saleDay || 1));
    }
    const consignorById = {};
    (consignors || []).forEach(c => { consignorById[c.id] = c; });

    const headers = [
      'Day', 'Date', 'Time', 'Invoice #', 'Customer Name',
      'Item', 'Qty', 'Original Price',
      'Day Discount %', 'Day Discount $', 'Haggle $', 'Invoice Adjustment Share',
      'Final Price',
      'Consignor', 'Payout %', 'Consignor Cut', 'Your Cut',
      'Status'
    ];

    const escape = (v) => {
      if (v === null || v === undefined) return '';
      const s = String(v);
      if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    };

    const fmt$ = (n) => (Math.round(n * 100) / 100).toFixed(2);
    const rows = [headers.map(escape).join(',')];

    txns.forEach(txn => {
      const date = new Date(txn.timestamp);
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');
      const hh = String(date.getHours()).padStart(2, '0');
      const mn = String(date.getMinutes()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const timeStr = `${hh}:${mn}`;

      const cssStatus = txn.status === 'void'
        ? (txn.voidReason && /edit/i.test(txn.voidReason) ? 'edited' : 'void')
        : (txn.status || 'unpaid');

      const subtotal = txn.subtotal || 0;
      const total = txn.total || subtotal;
      // v206: signed — positive when discount, negative when surcharge.
      // The per-item share carries the same sign so consignor/owner cuts
      // get the right adjustment direction.
      const ticketAdjustmentTotal = subtotal - total;

      (txn.items || []).forEach(item => {
        const qty = item.quantity || 1;
        const originalPriceTotal = (item.originalPrice || 0) * qty;
        const dayDiscountedTotal = (item.dayDiscountedPrice || item.originalPrice || 0) * qty;
        const finalLineTotal = item.finalPrice || 0;
        const dayDiscountSavings = originalPriceTotal - dayDiscountedTotal;
        const haggleSavings = dayDiscountedTotal - finalLineTotal;
        const itemTicketShare = subtotal > 0 ? (finalLineTotal / subtotal) * ticketAdjustmentTotal : 0;

        const consignor = item.consignorId ? consignorById[item.consignorId] : null;
        let consignorCut = 0;
        let payoutPctDisplay = '';
        if (consignor) {
          if (consignor.payoutType === 'percentage') {
            consignorCut = (finalLineTotal - itemTicketShare) * (consignor.payoutValue / 100);
            payoutPctDisplay = consignor.payoutValue;
          } else {
            consignorCut = Math.min(finalLineTotal - itemTicketShare, consignor.payoutValue * qty);
          }
        }
        const yourCut = (finalLineTotal - itemTicketShare) - consignorCut;

        rows.push([
          txn.saleDay || 1, dateStr, timeStr,
          txn.customerNumber || '', txn.orderName || '',
          item.description || '', qty,
          fmt$(item.originalPrice || 0),
          (txn.discount || 0),
          fmt$(dayDiscountSavings),
          fmt$(haggleSavings),
          fmt$(itemTicketShare),
          fmt$(finalLineTotal),
          consignor ? consignor.name : '',
          payoutPctDisplay,
          consignor ? fmt$(consignorCut) : '',
          fmt$(yourCut),
          cssStatus
        ].map(escape).join(','));
      });
    });

    return rows.join('\r\n');
  }
};


/**
 * v193 — Past Sales archive (IndexedDB).
 *
 * Why IDB and not localStorage: a typical estate sale serializes to ~30–60KB.
 * 50–100 archived sales ≈ 5MB, which is the localStorage cap. Hitting that cap
 * during end-sale (the snapshot write) is catastrophic. IDB has practically
 * unlimited quota on mobile browsers and is async, which keeps the snapshot
 * off the main thread.
 *
 * Schema (one object store):
 *   archived_sales (keyPath: 'archiveId')
 *     archiveId   — UUID assigned at archive time (not the sale.id; lets us
 *                   dedupe if the same sale is somehow archived twice)
 *     saleId      — the original sale's id, for cloud-purge lookup
 *     archivedAt  — ISO timestamp, used for sort order
 *     sale        — frozen snapshot of the sale config
 *     transactions — frozen snapshot, drafts (status='open') filtered out
 *     consignors  — frozen snapshot
 *
 * All snapshot fields are deep-cloned via structuredClone so subsequent edits
 * to live storage don't mutate the archive.
 */
const ArchiveDB = {
  _DB_NAME: 'estate_checkout_archive',
  _DB_VERSION: 1,
  _STORE: 'archived_sales',

  _open() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this._DB_NAME, this._DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(this._STORE)) {
          const store = db.createObjectStore(this._STORE, { keyPath: 'archiveId' });
          store.createIndex('archivedAt', 'archivedAt');
          store.createIndex('saleId', 'saleId', { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async _tx(mode, fn) {
    const db = await this._open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this._STORE, mode);
      const store = tx.objectStore(this._STORE);
      const result = fn(store);
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  },

  /**
   * Take a snapshot of the live sale state and append to the archive.
   * Drafts (status === 'open') are filtered out — they're in-progress,
   * not history.
   *
   * Returns the archived entry on success.
   */
  async archiveCurrentSale() {
    const liveSale = Storage.getSale();
    if (!liveSale) return null;

    // v199: scope transactions to THIS sale only — not every transaction
    // in localStorage. Without this filter, archives bleed across sales
    // because estate_transactions persists between Start New Sale calls.
    // Drafts are excluded — they're in-progress, not history.
    const liveTransactions = Storage.getTransactionsForSale(liveSale)
      .filter(t => t.status !== 'open');
    const liveConsignors = Storage.getConsignors();

    const entry = {
      archiveId: (crypto.randomUUID && crypto.randomUUID()) || ('arch_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10)),
      saleId: liveSale.id,
      archivedAt: new Date().toISOString(),
      sale: structuredClone(liveSale),
      transactions: structuredClone(liveTransactions),
      consignors: structuredClone(liveConsignors)
    };

    await this._tx('readwrite', (store) => {
      store.add(entry);
    });

    return entry;
  },

  /** Return all archive entries, newest first. */
  async getAll() {
    const db = await this._open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this._STORE, 'readonly');
      const store = tx.objectStore(this._STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const entries = req.result || [];
        entries.sort((a, b) => (b.archivedAt || '').localeCompare(a.archivedAt || ''));
        resolve(entries);
      };
      req.onerror = () => reject(req.error);
    });
  },

  /** Return one archive entry by archiveId, or null. */
  async get(archiveId) {
    const db = await this._open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this._STORE, 'readonly');
      const store = tx.objectStore(this._STORE);
      const req = store.get(archiveId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  },

  /** Delete one archive entry by archiveId. */
  async delete(archiveId) {
    const db = await this._open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this._STORE, 'readwrite');
      const store = tx.objectStore(this._STORE);
      const req = store.delete(archiveId);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  },

  /**
   * v199: wipe every archive entry on this device.
   *
   * Used by the "Clear all past estate sales" affordance — gives users a
   * one-shot reset for archives polluted by the pre-v199 cross-sale leak.
   * Does NOT touch the cloud (use the per-sale Delete from the detail
   * screen for that). Local-only purge.
   */
  async deleteAll() {
    const db = await this._open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this._STORE, 'readwrite');
      const store = tx.objectStore(this._STORE);
      const req = store.clear();
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  },

  /** Return entry count without loading the rows. Used to hide menu entries. */
  async count() {
    const db = await this._open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this._STORE, 'readonly');
      const store = tx.objectStore(this._STORE);
      const req = store.count();
      req.onsuccess = () => resolve(req.result || 0);
      req.onerror = () => reject(req.error);
    });
  }
};

if (typeof window !== 'undefined') {
  window.ArchiveDB = ArchiveDB;
}

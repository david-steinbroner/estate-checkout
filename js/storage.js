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
   */
  getSale() {
    const data = localStorage.getItem(this.KEYS.SALE);
    return data ? JSON.parse(data) : null;
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
      ticketDiscount: parsed.ticketDiscount || null
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
      ticketDiscount: txn.ticketDiscount || null,
      subtotal: txn.subtotal || txn.total
    }));
  },

  /**
   * Update a specific transaction by ID
   */
  updateTransaction(txnId, updates) {
    const transactions = this.getTransactions();
    const index = transactions.findIndex(t => t.id === txnId);

    if (index === -1) return false;

    transactions[index] = { ...transactions[index], ...updates };
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
  exportSaleCSV() {
    const transactions = this.getTransactions();
    const consignors = this.getConsignors();
    const consignorById = {};
    consignors.forEach(c => { consignorById[c.id] = c; });

    const headers = [
      'Day', 'Date', 'Time', 'Invoice #', 'Customer Name',
      'Item', 'Qty', 'Original Price',
      'Day Discount %', 'Day Discount $', 'Haggle $', 'Invoice Discount Share',
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
      const ticketDiscountTotal = Math.max(0, subtotal - total);

      (txn.items || []).forEach(item => {
        const qty = item.quantity || 1;
        const originalPriceTotal = (item.originalPrice || 0) * qty;
        const dayDiscountedTotal = (item.dayDiscountedPrice || item.originalPrice || 0) * qty;
        const finalLineTotal = item.finalPrice || 0;
        const dayDiscountSavings = originalPriceTotal - dayDiscountedTotal;
        const haggleSavings = dayDiscountedTotal - finalLineTotal;
        const itemTicketShare = subtotal > 0 ? (finalLineTotal / subtotal) * ticketDiscountTotal : 0;

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
   */
  exportFilename() {
    const sale = this.getSale();
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const rawName = sale && sale.name ? sale.name.trim() : '';
    const slug = rawName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const prefix = slug || 'estate-sale';
    return `${prefix}-${dateStr}.csv`;
  }
};

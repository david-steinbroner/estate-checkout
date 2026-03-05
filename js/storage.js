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
  }
};

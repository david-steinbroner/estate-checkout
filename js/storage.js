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
    PAID_TRANSACTIONS: 'estate_paid_transactions'
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
   * Save the current cart (items in progress)
   */
  saveCart(items) {
    localStorage.setItem(this.KEYS.CART, JSON.stringify(items));
  },

  /**
   * Get the current cart
   * Returns empty array if no cart exists
   */
  getCart() {
    const data = localStorage.getItem(this.KEYS.CART);
    return data ? JSON.parse(data) : [];
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
   * Get all transactions
   */
  getTransactions() {
    const data = localStorage.getItem(this.KEYS.TRANSACTIONS);
    return data ? JSON.parse(data) : [];
  },

  /**
   * Clear all transactions (used when ending a sale)
   */
  clearTransactions() {
    localStorage.removeItem(this.KEYS.TRANSACTIONS);
  },

  /**
   * Clear all app data
   */
  clearAll() {
    this.clearSale();
    this.clearCart();
    this.clearTransactions();
    this.clearCustomerCounter();
    this.clearPaidTransactions();
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
   * Save a paid transaction from the payment worker
   */
  savePaidTransaction(transaction) {
    const transactions = this.getPaidTransactions();
    transactions.push(transaction);
    localStorage.setItem(this.KEYS.PAID_TRANSACTIONS, JSON.stringify(transactions));
  },

  /**
   * Get all paid transactions
   */
  getPaidTransactions() {
    const data = localStorage.getItem(this.KEYS.PAID_TRANSACTIONS);
    return data ? JSON.parse(data) : [];
  },

  /**
   * Clear paid transactions
   */
  clearPaidTransactions() {
    localStorage.removeItem(this.KEYS.PAID_TRANSACTIONS);
  }
};

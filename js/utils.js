/**
 * utils.js - Shared helper functions for Estate Checkout
 */

const Utils = {
  /**
   * Format a number as currency (USD)
   */
  formatCurrency(amount) {
    return '$' + amount.toFixed(2);
  },

  /**
   * Calculate the current day of a sale
   * Returns 1 for first day, 2 for second, etc.
   * Returns 0 if sale hasn't started yet
   */
  getSaleDay(startDate) {
    // Parse start date as local time (not UTC) to avoid timezone issues
    const [year, month, day] = startDate.split('-').map(Number);
    const start = new Date(year, month - 1, day); // month is 0-indexed
    start.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = today - start;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Day 1 is the first day, not day 0
    // If sale hasn't started, return 0
    if (diffDays < 0) return 0;
    return diffDays + 1;
  },

  /**
   * Get the discount percentage for a given sale day
   */
  getDiscountForDay(sale, dayNumber) {
    if (!sale || !sale.discounts) return 0;

    // discounts is an object like { 1: 0, 2: 25, 3: 50 }
    const discount = sale.discounts[dayNumber];

    // If no specific discount for this day, use the highest day that exists
    if (discount === undefined) {
      const days = Object.keys(sale.discounts).map(Number).sort((a, b) => b - a);
      for (const day of days) {
        if (dayNumber >= day) {
          return sale.discounts[day];
        }
      }
      return 0;
    }

    return discount;
  },

  /**
   * Apply a discount percentage to a price
   */
  applyDiscount(originalPrice, discountPercent) {
    if (!discountPercent) return originalPrice;
    return originalPrice * (1 - discountPercent / 100);
  },

  /**
   * Generate a simple unique ID
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  },

  /**
   * Get current ISO timestamp
   */
  getTimestamp() {
    return new Date().toISOString();
  },

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * Apply a haggle discount to a day-discounted price
   * @param {number} dayDiscountedPrice - Price after day discount
   * @param {string} haggleType - 'percent' | 'dollar' | 'newprice' | null
   * @param {number} haggleValue - The raw haggle input
   * @returns {number} Final price after haggle
   */
  applyHaggle(dayDiscountedPrice, haggleType, haggleValue) {
    if (!haggleType || !haggleValue) return dayDiscountedPrice;

    if (haggleType === 'newprice') {
      return Math.max(0, haggleValue);
    } else if (haggleType === 'dollar') {
      return Math.max(0, dayDiscountedPrice - haggleValue);
    } else if (haggleType === 'percent') {
      return Math.max(0, dayDiscountedPrice * (1 - haggleValue / 100));
    }

    return dayDiscountedPrice;
  },

  /**
   * Apply a ticket-level discount to a subtotal
   * @param {number} subtotal - Sum of item final prices
   * @param {object|null} ticketDiscount - { type: 'percent'|'dollar', value: number }
   * @returns {number} Total after ticket discount
   */
  applyTicketDiscount(subtotal, ticketDiscount) {
    if (!ticketDiscount || !ticketDiscount.type || !ticketDiscount.value) return subtotal;

    if (ticketDiscount.type === 'dollar') {
      return Math.max(0, subtotal - ticketDiscount.value);
    } else if (ticketDiscount.type === 'percent') {
      return Math.max(0, subtotal * (1 - ticketDiscount.value / 100));
    }

    return subtotal;
  },

  /**
   * Format ISO timestamp to time string (e.g., "10:42 AM")
   */
  formatTime(isoTimestamp) {
    try {
      const date = new Date(isoTimestamp);
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return '--:--';
    }
  }
};

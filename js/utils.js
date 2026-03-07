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
  getSaleDay(startDate, sale) {
    // If dayOverride is set, use it directly
    if (sale && sale.dayOverride && Number.isInteger(sale.dayOverride) && sale.dayOverride > 0) {
      return sale.dayOverride;
    }
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
   * Apply an invoice-level discount to a subtotal
   * @param {number} subtotal - Sum of item final prices
   * @param {object|null} ticketDiscount - { type: 'percent'|'dollar', value: number }
   * @returns {number} Total after invoice discount
   */
  applyTicketDiscount(subtotal, ticketDiscount) {
    if (!ticketDiscount || !ticketDiscount.type || !ticketDiscount.value) return subtotal;

    if (ticketDiscount.type === 'dollar') {
      return Math.max(0, subtotal - ticketDiscount.value);
    } else if (ticketDiscount.type === 'percent') {
      return Math.max(0, subtotal * (1 - ticketDiscount.value / 100));
    } else if (ticketDiscount.type === 'newprice') {
      return Math.max(0, Math.min(subtotal, ticketDiscount.value));
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

/**
 * KeyboardAvoidance — keeps .overlay sheets visible above the iOS keyboard.
 *
 * Uses the visualViewport API to detect when the keyboard shrinks the viewport,
 * then shifts all visible .overlay elements up so sheets anchor above the keyboard.
 * Attach once at startup; listeners self-manage based on overlay visibility.
 */
const KeyboardAvoidance = {
  _listening: false,
  _layoutHeight: 0,

  init() {
    if (!window.visualViewport) return;
    this._layoutHeight = window.innerHeight;

    this._onResize = this._update.bind(this);
    this._onScroll = this._update.bind(this);

    // Observe all .overlay elements for class changes to detect visible/hidden
    this._observer = new MutationObserver(() => this._checkOverlays());
    document.querySelectorAll('.overlay').forEach(el => {
      this._observer.observe(el, { attributes: true, attributeFilter: ['class'] });
    });
  },

  _checkOverlays() {
    const hasVisible = document.querySelector('.overlay.visible') !== null;
    if (hasVisible && !this._listening) {
      this._layoutHeight = window.innerHeight;
      window.visualViewport.addEventListener('resize', this._onResize);
      window.visualViewport.addEventListener('scroll', this._onScroll);
      this._listening = true;
      this._update();
    } else if (!hasVisible && this._listening) {
      window.visualViewport.removeEventListener('resize', this._onResize);
      window.visualViewport.removeEventListener('scroll', this._onScroll);
      this._listening = false;
      this._reset();
    }
  },

  _update() {
    const vv = window.visualViewport;
    const keyboardHeight = this._layoutHeight - vv.height - vv.offsetTop;
    if (keyboardHeight > 50) {
      // Keyboard is open — shift overlays up (skip Add Item sheet)
      document.querySelectorAll('.overlay.visible').forEach(el => {
        if (el.id === 'add-item-modal') return;
        el.style.bottom = keyboardHeight + 'px';
      });
    } else {
      this._reset();
    }
  },

  _reset() {
    document.querySelectorAll('.overlay').forEach(el => {
      el.style.bottom = '';
    });
  }
};

// Auto-initialize
KeyboardAvoidance.init();

/**
 * utils.js - Shared helper functions for Estate Checkout
 */

const CONSIGNOR_COLORS = [
  '#e53e3e', // red
  '#2563eb', // blue
  '#16a34a', // green
  '#d97706', // orange
  '#7c3aed', // purple
  '#0d9488', // teal
  '#db2777', // pink
  '#92400e', // brown
  '#6b7280', // gray
  '#0284c7'  // sky
];

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
  /**
   * Apply an invoice-level adjustment to a subtotal.
   *
   * v206: name kept (call sites still use applyTicketDiscount) but semantics
   * extended — now handles BOTH the old shape (`{type:'percent'|'dollar'|'newprice', value}`)
   * AND the new shape (`{type:'discount'|'surcharge'|'set', mode:'percent'|'dollar'|null, value}`).
   * The forgiving handling means callers don't have to migrate — but
   * Storage.getTransactions and Storage.getCart migrate on read so most
   * records are already in the new shape by the time this runs.
   */
  applyTicketDiscount(subtotal, ticketDiscount) {
    if (!ticketDiscount || !ticketDiscount.type || !ticketDiscount.value) return subtotal;
    const v = ticketDiscount.value;
    const t = ticketDiscount.type;
    const mode = ticketDiscount.mode;

    // Legacy shape (pre-v206) — treat percent/dollar as discount, newprice as set.
    if (t === 'dollar')   return Math.max(0, subtotal - v);
    if (t === 'percent')  return Math.max(0, subtotal * (1 - v / 100));
    if (t === 'newprice') return Math.max(0, v);

    // New shape (v206+).
    if (t === 'discount') {
      if (mode === 'percent') return Math.max(0, subtotal * (1 - v / 100));
      if (mode === 'dollar')  return Math.max(0, subtotal - v);
    }
    if (t === 'surcharge') {
      if (mode === 'percent') return subtotal * (1 + v / 100);
      if (mode === 'dollar')  return subtotal + v;
    }
    if (t === 'set') return Math.max(0, v);

    return subtotal;
  },

  /**
   * Format an invoice-level adjustment as human-readable labels.
   * Single source of truth — used by qr.js, payment.js, dashboard.js so the
   * label never drifts out of sync with the data shape. Handles both the
   * legacy shape (pre-v206) and the current `{type, mode, value}` shape.
   *
   * Returns { short, long }. `short` is for tight contexts (captions, chips);
   * `long` is for descriptive lines on detail/dashboard views.
   * Returns null when the adjustment is empty/invalid.
   */
  formatTicketDiscountLabel(adj) {
    if (!adj || !adj.value) return null;
    const v = adj.value;
    const t = adj.type;
    const mode = adj.mode;

    // Current shape (v206+).
    if (t === 'discount') {
      if (mode === 'percent') return { short: `${v}% off`,                       long: `Invoice discount: ${v}% off` };
      if (mode === 'dollar')  return { short: `${this.formatCurrency(v)} off`,   long: `Invoice discount: ${this.formatCurrency(v)} off` };
    }
    if (t === 'surcharge') {
      if (mode === 'percent') return { short: `+${v}% surcharge`,                 long: `Invoice surcharge: +${v}%` };
      if (mode === 'dollar')  return { short: `+${this.formatCurrency(v)} surcharge`, long: `Invoice surcharge: +${this.formatCurrency(v)}` };
    }
    if (t === 'set') return { short: `Total set to ${this.formatCurrency(v)}`, long: `Invoice total set to ${this.formatCurrency(v)}` };

    // Legacy shape (pre-v206) — render defensively in case migration didn't run.
    if (t === 'percent')  return { short: `${v}% off`,                     long: `Invoice discount: ${v}% off` };
    if (t === 'dollar')   return { short: `${this.formatCurrency(v)} off`, long: `Invoice discount: ${this.formatCurrency(v)} off` };
    if (t === 'newprice') return { short: `Total set to ${this.formatCurrency(v)}`, long: `Invoice total set to ${this.formatCurrency(v)}` };

    return null;
  },

  /**
   * Build the caption line that sits underneath an item's final price.
   *
   * v215: stripped to the minimum. The day discount is shown globally at
   * the top of the screen ("Day 1 · 5% off" pill) and on the customer's
   * saved ticket header — repeating it on every row was noise. Now the
   * caption only fires for two cases that aren't communicated elsewhere:
   *
   *   1. multi-qty: per-unit price ("$0.95 each") so the worker can
   *      sanity-check 5 × $0.95 = $4.75 at a glance
   *   2. per-item haggle override: "Marked from $X" so it's clear this
   *      item deviates from the day's pricing
   *
   * Single-unit items with only a sale-wide day discount get NO caption.
   *
   * Reads both unified and legacy item shapes:
   *   { quantity, originalPrice, finalPrice, haggleType, haggleValue }
   *   { qty, orig, final, haggle: {type, value} }   ← payment/ticket scan shape
   */
  formatItemPriceCaption(item) {
    const qty = item.quantity || item.qty || 1;
    const finalLine = item.finalPrice !== undefined ? item.finalPrice : (item.final || 0);
    const original = item.originalPrice !== undefined ? item.originalPrice : (item.orig || 0);
    const hasHaggle = (item.haggleType && item.haggleValue) || (item.haggle && item.haggle.value);
    const finalUnit = qty > 0 ? finalLine / qty : finalLine;

    if (qty > 1) {
      return `${this.formatCurrency(finalUnit)} each`;
    }
    if (hasHaggle && original > 0) {
      return `Marked from ${this.formatCurrency(original)}`;
    }
    return null;
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
  },

  /**
   * Format a YYYY-MM-DD date string as a short label like "Apr 28".
   * Uses the local-time split pattern (not new Date(str)) to avoid the
   * UTC-offset bug where iOS Safari interprets bare YYYY-MM-DD as midnight UTC.
   */
  formatShortDate(yyyymmdd) {
    if (!yyyymmdd) return '';
    try {
      const [y, m, d] = yyyymmdd.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${months[date.getMonth()]} ${date.getDate()}`;
    } catch (e) {
      return yyyymmdd;
    }
  }
};

// v206: KeyboardAvoidance removed. The previous implementation used the
// visualViewport API to lift sheets above the iOS keyboard, but the v185
// fix was incomplete and recently regressed (the Invoice Adjustment sheet
// was being pushed up). v206 replaces the JS approach with a viewport meta
// directive (`interactive-widget=overlays-content`), which prevents the
// visual viewport from shrinking when the keyboard appears. The keyboard
// overlays the sheet's bottom; user dismisses it to see/tap buttons below.

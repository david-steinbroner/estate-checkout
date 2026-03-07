/**
 * sale-setup.js - Sale Configuration Module for Estate Checkout
 * Handles the sale setup form and discount schedule configuration
 */

const SaleSetup = {
  // Default discount schedule
  defaultDiscounts: {
    1: 0,
    2: 25,
    3: 50
  },

  // Current discount configuration (editable)
  discounts: {},

  // Pre-sale consignors (before sale is created)
  pendingConsignors: [],

  // DOM element references
  elements: {},

  /**
   * Initialize sale setup screen
   */
  init() {
    this.cacheElements();
    this.bindEvents();
    this.setDefaultDate();
    this.resetDiscounts();
    this.renderDiscountList();
  },

  /**
   * Cache DOM element references
   */
  cacheElements() {
    this.elements = {
      saleNameInput: document.getElementById('setup-sale-name'),
      startDateInput: document.getElementById('setup-start-date'),
      todayCheckbox: document.getElementById('setup-today-checkbox'),
      datePicker: document.getElementById('setup-date-picker'),
      discountList: document.getElementById('discount-list'),
      addDayButton: document.getElementById('add-day-button'),
      dashboardButton: document.getElementById('setup-dashboard-button'),
      startSaleButton: document.getElementById('start-sale-button')
    };
  },

  /**
   * Bind event listeners
   */
  bindEvents() {
    // Add day button
    this.elements.addDayButton.addEventListener('click', () => {
      this.addDay();
    });

    // Start sale button
    this.elements.startSaleButton.addEventListener('click', () => {
      this.startSale();
    });

    // Dashboard button
    this.elements.dashboardButton.addEventListener('click', () => {
      App.showScreen('dashboard', 'setup');
    });

    // "Sale starts today" checkbox
    this.elements.todayCheckbox.addEventListener('change', () => {
      const checked = this.elements.todayCheckbox.checked;
      this.elements.datePicker.hidden = checked;
      if (checked) {
        this.setDefaultDate();
      }
    });

    // Validate on input
    this.elements.saleNameInput.addEventListener('input', () => {
      this.validateForm();
    });

    // Add consignor button on setup
    const addConsignorBtn = document.getElementById('setup-add-consignor');
    if (addConsignorBtn) {
      addConsignorBtn.addEventListener('click', () => App.openConsignorSheet(null));
    }
  },

  /**
   * Set default date to today (using local time, not UTC)
   */
  setDefaultDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    this.elements.startDateInput.value = `${year}-${month}-${day}`;
  },

  /**
   * Reset discounts to defaults
   */
  resetDiscounts() {
    this.discounts = { ...this.defaultDiscounts };
  },

  /**
   * Render the discount list
   */
  renderDiscountList() {
    const days = Object.keys(this.discounts).map(Number).sort((a, b) => a - b);

    const html = days.map(day => {
      const discount = this.discounts[day];
      const canRemove = day > 3; // Can only remove Day 4+

      return `
        <div class="discount-row" data-day="${day}">
          <span class="discount-row__label">Day ${day}</span>
          <input
            type="number"
            class="discount-row__input"
            value="${discount}"
            min="0"
            max="100"
            data-day="${day}"
          >
          <span class="discount-row__suffix">% off</span>
          ${canRemove ? `<button class="discount-row__remove" data-remove="${day}">×</button>` : ''}
        </div>
      `;
    }).join('');

    this.elements.discountList.innerHTML = html;

    // Bind input events
    this.elements.discountList.querySelectorAll('.discount-row__input').forEach(input => {
      input.addEventListener('change', (e) => {
        const day = parseInt(e.target.dataset.day);
        let value = parseInt(e.target.value) || 0;
        // Clamp to 0-100
        value = Math.max(0, Math.min(100, value));
        e.target.value = value;
        this.discounts[day] = value;
      });
    });

    // Bind remove buttons
    this.elements.discountList.querySelectorAll('.discount-row__remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const day = parseInt(btn.dataset.remove);
        this.removeDay(day);
      });
    });
  },

  /**
   * Add a new day to the discount schedule
   */
  addDay() {
    const days = Object.keys(this.discounts).map(Number);
    const nextDay = Math.max(...days) + 1;

    // Default to same discount as previous day or 50%
    const prevDiscount = this.discounts[nextDay - 1] || 50;
    this.discounts[nextDay] = Math.min(prevDiscount + 10, 100);

    this.renderDiscountList();
  },

  /**
   * Remove a day from the discount schedule
   */
  removeDay(day) {
    if (day <= 3) return; // Can't remove first 3 days

    delete this.discounts[day];

    // Renumber remaining days above this one
    const days = Object.keys(this.discounts).map(Number).sort((a, b) => a - b);
    const newDiscounts = {};

    days.forEach((d, index) => {
      newDiscounts[index + 1] = this.discounts[d];
    });

    this.discounts = newDiscounts;
    this.renderDiscountList();
  },

  /**
   * Validate the form
   */
  validateForm() {
    const name = this.elements.saleNameInput.value.trim();
    const isValid = name.length > 0;

    this.elements.startSaleButton.disabled = !isValid;
    return isValid;
  },

  /**
   * Start a new sale
   */
  startSale() {
    if (!this.validateForm()) return;

    const name = this.elements.saleNameInput.value.trim();
    const startDate = this.elements.startDateInput.value;

    const sale = this.createSale({
      name: name,
      startDate: startDate,
      discounts: { ...this.discounts }
    });

    // Navigate to checkout
    App.showScreen('checkout');
  },

  /**
   * Create a new sale and save to storage
   */
  createSale(config) {
    const sale = {
      id: Utils.generateId(),
      name: config.name,
      startDate: config.startDate,
      discounts: config.discounts || this.defaultDiscounts,
      consignors: config.consignors || this.pendingConsignors || [],
      createdAt: Utils.getTimestamp(),
      status: 'active',
      pausedAt: null,
      maxDiscountPercent: config.maxDiscountPercent || null,
      shareCode: config.shareCode || null,
      isShared: config.isShared || false,
      sharedAt: config.sharedAt || null
    };

    Storage.saveSale(sale);
    return sale;
  },

  /**
   * Generate a share code for the current sale
   * Format: first 3 letters of sale name (uppercase) + hyphen + 4 random digits
   * Persists on the sale object so it stays the same
   */
  generateShareCode(sale) {
    if (sale.shareCode) return sale.shareCode;

    const prefix = sale.name.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase() || 'EST';
    const suffix = String(Math.floor(1000 + Math.random() * 9000));
    const code = `${prefix}-${suffix}`;

    sale.shareCode = code;
    sale.isShared = true;
    sale.sharedAt = sale.sharedAt || Utils.getTimestamp();
    Storage.saveSale(sale);

    return code;
  },

  /**
   * Get the share data for QR encoding
   */
  getShareData(sale) {
    return {
      name: sale.name,
      startDate: sale.startDate,
      discounts: sale.discounts,
      shareCode: sale.shareCode,
      sharedAt: sale.sharedAt,
      maxDiscountPercent: sale.maxDiscountPercent || null
    };
  },

  /**
   * Pause the current sale (end of day)
   */
  pauseSale() {
    const sale = Storage.getSale();
    if (!sale) return;

    sale.status = 'paused';
    sale.pausedAt = Utils.getTimestamp();
    Storage.saveSale(sale);
    Storage.clearCart();
  },

  /**
   * Resume a paused sale
   */
  resumeSale() {
    const sale = Storage.getSale();
    if (!sale) return;

    sale.status = 'active';
    sale.pausedAt = null;
    Storage.saveSale(sale);
  },

  /**
   * End the current sale permanently
   * Transaction data is preserved — only sale config and cart are cleared
   */
  endSale() {
    const sale = Storage.getSale();
    if (sale) {
      sale.status = 'ended';
      Storage.saveSale(sale);
    }
    Storage.clearCart();
    Storage.clearCustomerCounter();
    // Note: transactions are NOT cleared — they stay on the dashboard
    Storage.clearSale();
  },

  /**
   * Render the consignor list on the setup screen
   */
  renderConsignorList() {
    const container = document.getElementById('setup-consignor-list');
    if (!container) return;

    const sale = Storage.getSale();
    const consignors = sale ? (sale.consignors || []) : this.pendingConsignors;
    if (consignors.length === 0) {
      container.innerHTML = '';
      return;
    }

    container.innerHTML = consignors.map(c => {
      const payoutLabel = c.payoutType === 'percentage'
        ? `${c.payoutValue}% to consignor`
        : `$${c.payoutValue} fee per item`;
      return `<div class="consignor-list__item" data-consignor-id="${c.id}">
        <span class="consignor-list__dot" style="background: ${c.color}"></span>
        <span class="consignor-list__name">${Utils.escapeHtml(c.name)}</span>
        <span class="consignor-list__payout">${payoutLabel}</span>
      </div>`;
    }).join('');

    container.querySelectorAll('[data-consignor-id]').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.consignorId;
        const consignor = consignors.find(c => c.id === id);
        if (consignor) App.openConsignorSheet(consignor);
      });
    });
  },

  /**
   * Reset the form for a new sale
   */
  resetForm() {
    this.elements.saleNameInput.value = '';
    this.elements.todayCheckbox.checked = true;
    this.elements.datePicker.hidden = true;
    this.setDefaultDate();
    this.resetDiscounts();
    this.renderDiscountList();
    this.pendingConsignors = [];
    this.renderConsignorList();
    this.validateForm();
    this.updateDashboardButton();
  },

  /**
   * Show/hide dashboard button based on sale state
   */
  updateDashboardButton() {
    const sale = Storage.getSale();
    this.elements.dashboardButton.hidden = !sale;
  }
};

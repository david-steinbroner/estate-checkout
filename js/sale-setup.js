/**
 * sale-setup.js - Sale Configuration Module for Estate Checkout
 * Handles the sale setup form and discount schedule configuration
 */

const SaleSetup = {
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
    this._updateStartDateState();
    this.rebuildDiscounts();
    this.renderDiscountList();
    this.validateForm();
  },

  /**
   * Cache DOM element references
   */
  cacheElements() {
    this.elements = {
      saleNameInput: document.getElementById('setup-sale-name'),
      startDateInput: document.getElementById('setup-start-date'),
      todayCheckbox: document.getElementById('setup-today-checkbox'),
      tbdCheckbox: document.getElementById('setup-tbd-checkbox'),
      endDatePicker: document.getElementById('setup-end-date-picker'),
      endDateInput: document.getElementById('setup-end-date'),
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

    // Start sale button — open confirmation sheet
    this.elements.startSaleButton.addEventListener('click', () => {
      this.showConfirmation();
    });

    // Confirmation sheet buttons
    document.getElementById('sale-confirm-start').addEventListener('click', () => {
      this.dismissConfirmation();
      this.startSale();
    });
    document.getElementById('sale-confirm-back').addEventListener('click', () => {
      this.dismissConfirmation();
    });

    // Dismiss confirmation on overlay backdrop click
    const confirmModal = document.getElementById('sale-confirm-modal');
    confirmModal.addEventListener('click', (e) => {
      if (e.target === confirmModal) this.dismissConfirmation();
    });

    // Dashboard button
    this.elements.dashboardButton.addEventListener('click', () => {
      App.showScreen('dashboard', 'setup');
    });

    // "Sale starts today" checkbox
    this.elements.todayCheckbox.addEventListener('change', () => {
      const checked = this.elements.todayCheckbox.checked;
      if (checked) {
        this.setDefaultDate();
        this._autoResolveEndDate();
      }
      this._updateStartDateState();
      this.rebuildDiscounts();
      this.renderDiscountList();
      this.validateForm();
    });

    // Start date input change
    this.elements.startDateInput.addEventListener('change', () => {
      const startDate = this.elements.startDateInput.value;
      const endDate = this.elements.endDateInput.value;

      if (endDate && startDate >= endDate) {
        this._showDateError('start-date-error', 'Must be before end date.');
        this.setDefaultDate();
        return;
      }
      this._hideDateError('start-date-error');
      this.rebuildDiscounts();
      this.renderDiscountList();
      this.validateForm();
    });

    // TBD checkbox
    this.elements.tbdCheckbox.addEventListener('change', () => {
      const checked = this.elements.tbdCheckbox.checked;
      this.elements.endDatePicker.hidden = checked;
      if (checked) {
        this.elements.endDateInput.value = '';
      }
      this._updateEndDateState();
      this.rebuildDiscounts();
      this.renderDiscountList();
      this.validateForm();
    });

    // End date input change
    this.elements.endDateInput.addEventListener('change', () => {
      const startDate = this._getStartDate();
      const endDate = this.elements.endDateInput.value;

      if (endDate && startDate >= endDate) {
        this._showDateError('end-date-error', 'Must be after start date.');
        this.elements.endDateInput.value = '';
        this._updateEndDateState();
        return;
      }
      this._hideDateError('end-date-error');
      this._updateEndDateState();
      this.rebuildDiscounts();
      this.renderDiscountList();
      this.validateForm();
    });

    // Add consignor button on setup
    const addConsignorBtn = document.getElementById('setup-add-consignor');
    if (addConsignorBtn) {
      addConsignorBtn.addEventListener('click', () => App.openConsignorSheet(null));
    }
  },

  /**
   * Update start date input readonly state based on checkbox
   */
  _updateStartDateState() {
    const checked = this.elements.todayCheckbox.checked;
    if (checked) {
      this.elements.startDateInput.classList.add('setup-section__input--readonly');
      this.elements.startDateInput.setAttribute('tabindex', '-1');
    } else {
      this.elements.startDateInput.classList.remove('setup-section__input--readonly');
      this.elements.startDateInput.removeAttribute('tabindex');
    }
  },

  /**
   * Update end date pencil icon visibility
   */
  _updateEndDateState() {
    const iconEl = document.getElementById('setup-end-date-icon');
    if (!iconEl) return;
    const hasValue = !!this.elements.endDateInput.value;
    iconEl.hidden = hasValue;
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
   * Get the effective start date string (YYYY-MM-DD)
   */
  _getStartDate() {
    if (this.elements.todayCheckbox.checked) {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return this.elements.startDateInput.value;
  },

  /**
   * Get effective end date string or null if TBD
   */
  _getEndDate() {
    if (this.elements.tbdCheckbox.checked) return null;
    return this.elements.endDateInput.value || null;
  },

  /**
   * Auto-resolve: if end date is before start date, re-check TBD
   */
  _autoResolveEndDate() {
    const endDate = this._getEndDate();
    if (!endDate) return;
    const startDate = this._getStartDate();
    if (endDate <= startDate) {
      this.elements.tbdCheckbox.checked = true;
      this.elements.endDatePicker.hidden = true;
      this.elements.endDateInput.value = '';
    }
  },

  /**
   * Show inline date error
   */
  _showDateError(id, message) {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = message;
      el.hidden = false;
      setTimeout(() => { el.hidden = true; }, 2500);
    }
  },

  /**
   * Hide inline date error
   */
  _hideDateError(id) {
    const el = document.getElementById(id);
    if (el) el.hidden = true;
  },

  /**
   * Format a date string (YYYY-MM-DD) as "Mon D" (e.g., "Mar 7")
   */
  _formatDateLabel(dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}`;
  },

  /**
   * Add N days to a date string, return new date string
   */
  _addDays(dateStr, n) {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + n);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  /**
   * Count calendar days between two date strings (inclusive)
   */
  _daysBetween(startStr, endStr) {
    const [sy, sm, sd] = startStr.split('-').map(Number);
    const [ey, em, ed] = endStr.split('-').map(Number);
    const start = new Date(sy, sm - 1, sd);
    const end = new Date(ey, em - 1, ed);
    return Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
  },

  /**
   * Rebuild discounts based on current date selections.
   * Preserves existing discount values where possible.
   */
  rebuildDiscounts() {
    const startDate = this._getStartDate();
    const endDate = this._getEndDate();

    if (!endDate) {
      const oldDay1 = this.discounts[1];
      this.discounts = { 1: (oldDay1 !== undefined ? oldDay1 : 0) };
      return;
    }

    const totalDays = this._daysBetween(startDate, endDate);
    if (totalDays < 2) {
      this.discounts = { 1: this.discounts[1] || 0 };
      return;
    }

    const existingDays = Object.keys(this.discounts).map(Number).sort((a, b) => a - b);
    const existingCount = existingDays.length;

    if (existingCount <= 2) {
      this.discounts = {
        1: this.discounts[1] || 0,
        2: this.discounts[existingDays[existingDays.length - 1]] || 0
      };
    } else {
      const maxMiddleDays = totalDays - 2;
      const newDiscounts = { 1: this.discounts[1] || 0 };

      const middleDays = existingDays.slice(1, -1);
      const keptMiddle = middleDays.slice(0, maxMiddleDays);
      keptMiddle.forEach((oldDay, i) => {
        newDiscounts[i + 2] = this.discounts[oldDay];
      });

      const lastDayNum = keptMiddle.length + 2;
      const oldLastDay = existingDays[existingDays.length - 1];
      newDiscounts[lastDayNum] = this.discounts[oldLastDay] || 0;

      this.discounts = newDiscounts;
    }
  },

  /**
   * Render the discount list with tap-to-edit pattern
   */
  renderDiscountList() {
    const startDate = this._getStartDate();
    const endDate = this._getEndDate();
    const days = Object.keys(this.discounts).map(Number).sort((a, b) => a - b);
    const totalDays = days.length;

    const html = days.map((day, index) => {
      const discount = this.discounts[day];

      // Compute date label for this day
      let dateLabel = '';
      if (endDate && totalDays >= 2) {
        if (index === totalDays - 1) {
          dateLabel = this._formatDateLabel(endDate);
        } else {
          dateLabel = this._formatDateLabel(this._addDays(startDate, index));
        }
      } else {
        dateLabel = this._formatDateLabel(this._addDays(startDate, index));
      }

      // Right side: tap-to-edit discount
      let rightHtml;
      if (discount > 0) {
        rightHtml = `<span class="discount-row__value" data-day="${day}">${discount}% off</span>`;
      } else {
        rightHtml = `<button class="discount-row__add-link" data-day="${day}">+ Add Discount</button>`;
      }

      return `
        <div class="discount-row" data-day="${day}">
          <span class="discount-row__label">Day ${day} <span class="discount-row__date">&middot; ${dateLabel}</span></span>
          <div class="discount-row__right">${rightHtml}</div>
        </div>
      `;
    }).join('');

    this.elements.discountList.innerHTML = html;

    // Bind tap-to-edit on value text and "+ Add Discount" links
    this.elements.discountList.querySelectorAll('.discount-row__value, .discount-row__add-link').forEach(el => {
      el.addEventListener('click', () => {
        const day = parseInt(el.dataset.day);
        this._openDiscountEdit(day, el.closest('.discount-row'));
      });
    });

    this._updateAddDayButton();
  },

  /**
   * Open inline discount edit for a specific day
   */
  _openDiscountEdit(day, rowEl) {
    const rightEl = rowEl.querySelector('.discount-row__right');
    const current = this.discounts[day] || 0;

    rightEl.innerHTML = `
      <div class="discount-row__edit">
        <input type="number" class="discount-row__input" value="${current || ''}"
          min="0" max="100" inputmode="numeric" data-day="${day}" placeholder="0">
        <span class="discount-row__suffix">% off</span>
      </div>
    `;

    const input = rightEl.querySelector('.discount-row__input');
    input.focus();
    input.select();

    const commitEdit = () => {
      let value = parseInt(input.value) || 0;
      value = Math.max(0, Math.min(100, value));
      this.discounts[day] = value;
      this.renderDiscountList();
    };

    input.addEventListener('blur', commitEdit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        input.blur();
      }
    });
  },

  /**
   * Update add day button state based on date range
   */
  _updateAddDayButton() {
    const endDate = this._getEndDate();
    if (!endDate) {
      this.elements.addDayButton.hidden = true;
      return;
    }

    const startDate = this._getStartDate();
    const maxDays = this._daysBetween(startDate, endDate);
    const currentDays = Object.keys(this.discounts).length;

    this.elements.addDayButton.hidden = (currentDays >= maxDays);
  },

  /**
   * Add a new day between Day 1 and the last day
   */
  addDay() {
    const endDate = this._getEndDate();
    if (!endDate) return;

    const startDate = this._getStartDate();
    const maxDays = this._daysBetween(startDate, endDate);
    const days = Object.keys(this.discounts).map(Number).sort((a, b) => a - b);

    if (days.length >= maxDays) return;

    const lastDay = days[days.length - 1];
    const lastDiscount = this.discounts[lastDay];

    const newDiscounts = {};
    days.slice(0, -1).forEach(d => {
      newDiscounts[d] = this.discounts[d];
    });
    newDiscounts[lastDay] = 0;
    newDiscounts[lastDay + 1] = lastDiscount;

    this.discounts = newDiscounts;
    this.renderDiscountList();
  },

  /**
   * Validate the form — enabled as long as dates are valid
   */
  validateForm() {
    const startOk = this.elements.todayCheckbox.checked || !!this.elements.startDateInput.value;
    const endOk = this.elements.tbdCheckbox.checked || !!this.elements.endDateInput.value;
    const isValid = startOk && endOk;

    this.elements.startSaleButton.disabled = !isValid;
    return isValid;
  },

  /**
   * Show the confirmation bottom sheet with a summary of sale settings
   */
  showConfirmation() {
    if (!this.validateForm()) return;

    const name = this.elements.saleNameInput.value.trim();
    const startDate = this._getStartDate();
    const endDate = this._getEndDate();
    const day1Discount = this.discounts[1] || 0;

    const sale = Storage.getSale();
    const consignors = sale ? (sale.consignors || []) : this.pendingConsignors;
    const consignorNames = consignors.map(c => c.name).join(', ');

    const isToday = this.elements.todayCheckbox.checked;
    const startLabel = isToday
      ? `Today (${this._formatDateLabelFull(startDate)})`
      : this._formatDateLabelFull(startDate);

    const endLabel = endDate ? this._formatDateLabelFull(endDate) : null;

    const rows = [
      { label: 'Name', value: name || '(none)', isDefault: !name },
      { label: 'Starts', value: startLabel, isDefault: false },
      { label: 'Ends', value: endLabel || 'TBD', isDefault: !endLabel },
      { label: 'Day 1', value: `${day1Discount}% off`, isDefault: false },
      { label: 'Consignors', value: consignorNames || 'None', isDefault: !consignorNames }
    ];

    const summaryEl = document.getElementById('sale-confirm-summary');
    summaryEl.innerHTML = rows.map(r => `
      <div class="sale-confirm__row">
        <span class="sale-confirm__label">${r.label}</span>
        <span class="sale-confirm__value${r.isDefault ? ' sale-confirm__value--default' : ''}">${Utils.escapeHtml(r.value)}</span>
      </div>
    `).join('');

    document.getElementById('sale-confirm-modal').classList.add('visible');
  },

  /**
   * Dismiss the confirmation bottom sheet
   */
  dismissConfirmation() {
    document.getElementById('sale-confirm-modal').classList.remove('visible');
  },

  /**
   * Format a date string as "Mon D, YYYY" (e.g., "Mar 10, 2026")
   */
  _formatDateLabelFull(dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  },

  /**
   * Start a new sale
   */
  startSale() {
    if (!this.validateForm()) return;

    const name = this.elements.saleNameInput.value.trim();
    const startDate = this._getStartDate();
    const endDate = this._getEndDate();

    const sale = this.createSale({
      name: name,
      startDate: startDate,
      endDate: endDate,
      discounts: { ...this.discounts }
    });

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
      endDate: config.endDate || null,
      discounts: config.discounts || { 1: 0 },
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
   */
  generateShareCode(sale) {
    if (sale.shareCode) return sale.shareCode;

    const prefix = (sale.name || '').replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase() || 'EST';
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
      endDate: sale.endDate || null,
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
   */
  endSale() {
    const sale = Storage.getSale();
    if (sale) {
      sale.status = 'ended';
      Storage.saveSale(sale);
    }
    Storage.clearCart();
    Storage.clearCustomerCounter();
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
    this.elements.tbdCheckbox.checked = true;
    this.elements.endDatePicker.hidden = true;
    this.elements.endDateInput.value = '';
    this.setDefaultDate();
    this._updateStartDateState();
    this.discounts = { 1: 0 };
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

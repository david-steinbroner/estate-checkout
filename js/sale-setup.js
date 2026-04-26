/**
 * sale-setup.js - Sale Configuration Module for Estate Checkout
 * Schedule days are the source of truth; end date mirrors the last day.
 */

const SaleSetup = {
  // Schedule days: [{ date: 'YYYY-MM-DD', discount: 0 }, ...]
  scheduleDays: [],

  // Pre-sale consignors (before sale is created)
  pendingConsignors: [],

  // DOM element references
  elements: {},

  // Guard flag to prevent cascading change events during sync
  _syncing: false,

  /**
   * Initialize sale setup screen
   */
  init() {
    this.cacheElements();
    this.bindEvents();
    this._initDefaultState();
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
      endDateInput: document.getElementById('setup-end-date'),
      dayDatePicker: document.getElementById('setup-day-date-picker'),
      discountList: document.getElementById('discount-list'),
      dashboardButton: document.getElementById('setup-dashboard-button'),
      startSaleButton: document.getElementById('start-sale-button')
    };
  },

  /**
   * Set up default state on page load
   */
  _initDefaultState() {
    const today = this._todayString();
    this.scheduleDays = [{ date: today, discount: 0 }];
    this.elements.startDateInput.value = today;
    this._updateStartDateState();
    this._syncEndDate();
    this.renderDiscountList();
    this.validateForm();
  },

  /**
   * Bind event listeners
   */
  bindEvents() {
    // "+ Add" date picker — overlay input inside the button, fires on native tap
    this.elements.dayDatePicker.addEventListener('change', () => {
      const date = this.elements.dayDatePicker.value;
      this.elements.dayDatePicker.value = '';
      if (!date) return;
      // Duplicate check
      if (this.scheduleDays.some(d => d.date === date)) {
        this._showDateError('schedule-error', 'Day already exists. Select a different date.');
        return;
      }
      this.scheduleDays.push({ date, discount: 0 });
      this._sortAndRenumber();
      // If TBD was checked, uncheck it — user explicitly added a day
      if (this.elements.tbdCheckbox.checked) {
        this.elements.tbdCheckbox.checked = false;
      }
      this._syncEndDate();
      this._syncStartDate();
      this.renderDiscountList();
      this.validateForm();
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
    const confirmModal = document.getElementById('sale-confirm-modal');
    confirmModal.addEventListener('click', (e) => {
      if (e.target === confirmModal) this.dismissConfirmation();
    });

    // Dashboard button
    this.elements.dashboardButton.addEventListener('click', () => {
      App.showScreen('dashboard', 'setup');
    });

    // "Starts today" checkbox
    this.elements.todayCheckbox.addEventListener('change', () => {
      const checked = this.elements.todayCheckbox.checked;
      if (checked) {
        this._setStartDate(this._todayString());
      }
      this._updateStartDateState();
      this.validateForm();
    });

    // Start date input change
    this.elements.startDateInput.addEventListener('change', () => {
      if (this._syncing) return;
      const newDate = this.elements.startDateInput.value;
      if (!newDate) return;
      const endDate = this._getEndDate();
      if (endDate && newDate > endDate) {
        this._showDateError('start-date-error', 'Start date must be before end date.');
        this.elements.startDateInput.value = this.scheduleDays[0]?.date || this._todayString();
        return;
      }
      this._setStartDate(newDate);
      this.validateForm();
    });

    // TBD checkbox
    this.elements.tbdCheckbox.addEventListener('change', () => {
      this._syncEndDate();
      this.validateForm();
    });

    // End date change — add new last day if after all existing days, otherwise reset
    this.elements.endDateInput.addEventListener('change', () => {
      if (this._syncing) return;
      const date = this.elements.endDateInput.value;
      if (!date || this.elements.tbdCheckbox.checked) return;

      const startDate = this._getStartDate();
      if (date < startDate) {
        this._showDateError('end-date-error', 'End date must be after start date.');
        this._syncEndDate();
        return;
      }

      const lastDay = this.scheduleDays[this.scheduleDays.length - 1];
      // Only add a new row if date is after all existing days and not a duplicate
      if (date > lastDay.date && !this.scheduleDays.some(d => d.date === date)) {
        this.scheduleDays.push({ date, discount: 0 });
        this._sortAndRenumber();
        this._syncEndDate();
        this.renderDiscountList();
        this.validateForm();
        return;
      }
      // Otherwise silently reset to match the schedule
      this._syncEndDate();
    });

    // Add consignor button on setup
    const addConsignorBtn = document.getElementById('setup-add-consignor');
    if (addConsignorBtn) {
      addConsignorBtn.addEventListener('click', () => App.openConsignorSheet(null));
    }
  },

  /**
   * Set the start date — updates Day 1 in schedule
   */
  _setStartDate(newDate) {
    this.elements.startDateInput.value = newDate;

    if (this.scheduleDays.length > 0) {
      // Update the earliest day's date
      this._sortAndRenumber();
      this.scheduleDays[0].date = newDate;
      this._sortAndRenumber();
      this._syncEndDate();
      this.renderDiscountList();
    }
  },

  /**
   * Sync start date field to match Day 1
   */
  _syncStartDate() {
    if (this.scheduleDays.length === 0) return;
    this._syncing = true;
    const day1Date = this.scheduleDays[0].date;
    this.elements.startDateInput.value = day1Date;
    this._syncing = false;

    // If "Starts today" is checked but Day 1 is not today, uncheck it
    if (this.elements.todayCheckbox.checked && day1Date !== this._todayString()) {
      this.elements.todayCheckbox.checked = false;
      this._updateStartDateState();
    }
  },

  /**
   * Sync end date field to match last schedule day
   */
  _syncEndDate() {
    this._syncing = true;
    if (this.elements.tbdCheckbox.checked) {
      this.elements.endDateInput.value = '';
      this._syncing = false;
      return;
    }

    if (this.scheduleDays.length === 0) {
      this._syncing = false;
      return;
    }
    const lastDate = this.scheduleDays[this.scheduleDays.length - 1].date;
    this.elements.endDateInput.value = lastDate;
    this._syncing = false;
  },

  /**
   * Sort schedule days chronologically and renumber
   */
  _sortAndRenumber() {
    this.scheduleDays.sort((a, b) => a.date.localeCompare(b.date));
  },

  /**
   * Update start date input readonly state
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
   * Get today's date as YYYY-MM-DD
   */
  _todayString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * Show inline date error (brief)
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
   * Format a date string (YYYY-MM-DD) as "Mon D" (e.g., "Mar 7")
   */
  _formatDateLabel(dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}`;
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
   * Render the discount list with swipe-to-delete and tap-to-edit
   */
  renderDiscountList() {
    const canDelete = this.scheduleDays.length > 1;
    const deleteIcon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';

    const html = this.scheduleDays.map((dayObj, index) => {
      const dayNum = index + 1;
      const dateLabel = this._formatDateLabel(dayObj.date);

      // Right side: tap-to-edit discount
      let rightHtml;
      if (dayObj.discount > 0) {
        rightHtml = `<span class="discount-row__value" data-day-index="${index}">${dayObj.discount}% off</span>`;
      } else {
        rightHtml = `<button class="discount-row__add-link" data-day-index="${index}">+ Add Discount</button>`;
      }

      return `
        <div class="discount-row" data-day-index="${index}">
          ${canDelete ? `<div class="discount-row__delete-bg" data-delete-index="${index}">${deleteIcon}</div>` : ''}
          <div class="discount-row__content">
            <span class="discount-row__label">Day ${dayNum} <span class="discount-row__date" data-edit-date="${index}">&middot; ${dateLabel}<input type="date" class="setup-hidden-input" data-row-picker="${index}" value="${dayObj.date}"></span></span>
            <div class="discount-row__right">${rightHtml}</div>
          </div>
        </div>
      `;
    }).join('');

    this.elements.discountList.innerHTML = html;

    // Bind tap-to-edit discount
    this.elements.discountList.querySelectorAll('.discount-row__value, .discount-row__add-link').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.dayIndex);
        this._openDiscountEdit(idx, el.closest('.discount-row'));
      });
    });

    // Per-row date pickers — overlay input handles native tap, change event does the update
    this.elements.discountList.querySelectorAll('[data-row-picker]').forEach(input => {
      input.addEventListener('change', () => {
        const idx = parseInt(input.dataset.rowPicker);
        const newDate = input.value;
        if (!newDate) return;
        const oldDate = this.scheduleDays[idx]?.date;
        if (newDate === oldDate) return;
        // Duplicate check — silently revert
        if (this.scheduleDays.some(d => d.date === newDate)) {
          input.value = oldDate;
          return;
        }
        this.scheduleDays[idx].date = newDate;
        this._sortAndRenumber();
        this._syncEndDate();
        this._syncStartDate();
        this.renderDiscountList();
        this.validateForm();
      });
    });

    // Bind swipe-to-delete (only if more than 1 day)
    if (canDelete) {
      this.elements.discountList.querySelectorAll('.discount-row').forEach(row => {
        this._bindSwipeToDelete(row);
      });
      this.elements.discountList.querySelectorAll('.discount-row__delete-bg').forEach(el => {
        el.addEventListener('click', () => {
          const idx = parseInt(el.dataset.deleteIndex);
          this._deleteDay(idx);
        });
      });
    }
  },

  /**
   * Bind swipe-to-delete touch events on a discount row
   */
  _bindSwipeToDelete(row) {
    const content = row.querySelector('.discount-row__content');
    if (!content) return;

    const MAX_SWIPE = 56;
    const DELETE_THRESHOLD = 40;
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let swiping = false;

    content.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      currentX = 0;
      swiping = false;
      content.style.transition = 'none';
    }, { passive: true });

    content.addEventListener('touchmove', (e) => {
      const touch = e.touches[0];
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;

      if (!swiping && Math.abs(deltaX) > 10 && Math.abs(deltaX) > Math.abs(deltaY)) {
        swiping = true;
      }
      if (!swiping) return;

      e.preventDefault();
      currentX = Math.max(-MAX_SWIPE, Math.min(0, deltaX));
      content.style.transform = `translateX(${currentX}px)`;
    }, { passive: false });

    content.addEventListener('touchend', () => {
      content.style.transition = 'transform 0.2s ease-out';
      if (currentX < -DELETE_THRESHOLD) {
        content.style.transform = `translateX(-${MAX_SWIPE}px)`;
      } else {
        content.style.transform = 'translateX(0)';
      }
      swiping = false;
    });
  },

  /**
   * Delete a schedule day by index
   */
  _deleteDay(index) {
    if (this.scheduleDays.length <= 1) return;
    this.scheduleDays.splice(index, 1);
    this._syncEndDate();
    this._syncStartDate();
    this.renderDiscountList();
    this.validateForm();
  },

  /**
   * Open inline discount edit for a specific day
   */
  _openDiscountEdit(index, rowEl) {
    const rightEl = rowEl.querySelector('.discount-row__right');
    const current = this.scheduleDays[index].discount || 0;

    rightEl.innerHTML = `
      <div class="discount-row__edit">
        <input type="number" class="discount-row__input" value="${current || ''}"
          min="0" max="100" inputmode="numeric" data-day-index="${index}" placeholder="0">
        <span class="discount-row__suffix">% off</span>
      </div>
    `;

    const input = rightEl.querySelector('.discount-row__input');
    input.focus();
    input.select();

    const commitEdit = () => {
      let value = parseInt(input.value) || 0;
      value = Math.max(0, Math.min(100, value));
      this.scheduleDays[index].discount = value;
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
   * Get the effective start date string
   */
  _getStartDate() {
    if (this.elements.todayCheckbox.checked) return this._todayString();
    return this.elements.startDateInput.value;
  },

  /**
   * Get effective end date string or null if TBD
   */
  _getEndDate() {
    if (this.elements.tbdCheckbox.checked) return null;
    if (this.scheduleDays.length === 0) return null;
    return this.scheduleDays[this.scheduleDays.length - 1].date;
  },

  /**
   * Validate the form — enabled as long as start date is valid
   */
  validateForm() {
    const startOk = this.elements.todayCheckbox.checked || !!this.elements.startDateInput.value;
    const isValid = startOk && this.scheduleDays.length > 0;

    this.elements.startSaleButton.disabled = !isValid;
    return isValid;
  },

  /**
   * Convert scheduleDays to the discounts object format for the sale
   */
  _buildDiscountsObject() {
    const discounts = {};
    this.scheduleDays.forEach((d, i) => {
      discounts[i + 1] = d.discount;
    });
    return discounts;
  },

  /**
   * Show the confirmation bottom sheet
   */
  showConfirmation() {
    if (!this.validateForm()) return;

    const name = this.elements.saleNameInput.value.trim();
    const startDate = this._getStartDate();
    const endDate = this._getEndDate();
    const day1Discount = this.scheduleDays[0]?.discount || 0;

    const sale = Storage.getSale();
    const consignors = sale ? (sale.consignors || []) : this.pendingConsignors;
    const consignorNames = consignors.map(c => c.name).join(', ');

    const isToday = this.elements.todayCheckbox.checked;
    const startLabel = isToday
      ? `Today (${this._formatDateLabelFull(startDate)})`
      : this._formatDateLabelFull(startDate);

    const daysLabel = endDate
      ? `${this.scheduleDays.length} day${this.scheduleDays.length !== 1 ? 's' : ''}`
      : 'TBD';

    // Build schedule rows for each day
    const scheduleRows = this.scheduleDays.map((dayObj, i) => {
      const dateLabel = this._formatDateLabel(dayObj.date);
      const discountLabel = dayObj.discount > 0 ? `${dayObj.discount}% off` : 'No discount';
      return {
        label: `Day ${i + 1} \u00B7 ${dateLabel}`,
        value: discountLabel,
        isDefault: dayObj.discount === 0
      };
    });

    const rows = [
      { label: 'Name', value: name || '(none)', isDefault: !name },
      { label: 'Starts', value: startLabel, isDefault: false },
      { label: 'Days', value: daysLabel, isDefault: !endDate },
      ...scheduleRows,
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

  dismissConfirmation() {
    document.getElementById('sale-confirm-modal').classList.remove('visible');
  },

  /**
   * Start a new sale
   */
  async startSale() {
    if (!this.validateForm()) return;

    const name = this.elements.saleNameInput.value.trim();
    const startDate = this._getStartDate();
    const endDate = this._getEndDate();

    // Disable the button briefly while the backend assigns a share code
    const btn = document.getElementById('start-sale-button');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Starting…';
    }

    try {
      await this.createSale({
        name: name,
        startDate: startDate,
        endDate: endDate,
        discounts: this._buildDiscountsObject()
      });
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Start Sale';
      }
    }

    App.showScreen('checkout');
  },

  /**
   * Create a new sale and save to storage.
   *
   * Returns a Promise that resolves once the backend has assigned a share
   * code (or once it's clear the network is down and the sale is local-only).
   * Awaiting this guarantees that anyone reading sale.shareCode after this
   * resolves gets the canonical server code, not a stale local fabrication.
   *
   * If config carries `_synced: true` and an `id`/`shareCode`, the caller
   * (e.g. confirmJoinSale) has already validated the remote sale — we just
   * mirror it locally and skip the backend round-trip.
   */
  async createSale(config) {
    const sale = {
      id: config.id || Utils.generateId(),
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
      sharedAt: config.sharedAt || null,
      _synced: !!config._synced
    };

    Storage.saveSale(sale);

    // For brand-new sales (not joins), push to the backend BEFORE returning.
    // This ensures sale.shareCode is the server-assigned code by the time the
    // caller proceeds — closing the v156 race where Share Sale could fire
    // before the backend response arrived.
    if (!sale._synced && typeof Sync !== 'undefined') {
      try {
        const remote = await Sync.createSale({
          name: sale.name,
          startDate: sale.startDate,
          endDate: sale.endDate,
          discounts: sale.discounts,
          consignors: sale.consignors,
          maxDiscountPercent: sale.maxDiscountPercent,
          status: sale.status
        });
        sale.id = remote.id;
        sale.shareCode = remote.shareCode;
        sale._synced = true;
        Storage.saveSale(sale);
        console.log('[sync] sale created on backend:', remote.id, 'code:', remote.shareCode);
      } catch (err) {
        console.warn('[sync] createSale failed — sale saved local-only:', err.message);
        // Local-only fallback. Sharing won't work until network returns;
        // openShareSaleSheet will surface this state to the user.
      }
    }

    return sale;
  },

  /**
   * Return the server-assigned share code for this sale.
   * Returns null if the sale was created offline and never synced — caller
   * (openShareSaleSheet) shows a "couldn't reach the cloud" state in that case.
   *
   * Legacy local-fallback code generation has been removed (v157): there's
   * exactly one source of share codes now, the backend.
   */
  getShareCode(sale) {
    return sale && sale.shareCode ? sale.shareCode : null;
  },

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

  pauseSale() {
    const sale = Storage.getSale();
    if (!sale) return;
    sale.status = 'paused';
    sale.pausedAt = Utils.getTimestamp();
    Storage.saveSale(sale);
    Storage.clearCart();
    if (typeof Sync !== 'undefined' && Sync.isSynced(sale)) {
      Sync.patchSale(sale.id, sale.shareCode, { status: 'paused' })
        .catch(err => console.warn('[sync] pauseSale failed:', err.message));
    }
  },

  resumeSale() {
    const sale = Storage.getSale();
    if (!sale) return;
    sale.status = 'active';
    sale.pausedAt = null;
    Storage.saveSale(sale);
    if (typeof Sync !== 'undefined' && Sync.isSynced(sale)) {
      Sync.patchSale(sale.id, sale.shareCode, { status: 'active' })
        .catch(err => console.warn('[sync] resumeSale failed:', err.message));
    }
  },

  endSale() {
    const sale = Storage.getSale();
    if (sale) {
      sale.status = 'ended';
      Storage.saveSale(sale);
      if (typeof Sync !== 'undefined' && Sync.isSynced(sale)) {
        Sync.patchSale(sale.id, sale.shareCode, {
          status: 'ended',
          endedAt: Utils.getTimestamp()
        }).catch(err => console.warn('[sync] endSale failed:', err.message));
      }
    }
    Storage.clearCart();
    Storage.clearCustomerCounter();
    Storage.clearSale();
  },

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
    this.elements.tbdCheckbox.checked = false;
    this._initDefaultState();
    this.pendingConsignors = [];
    this.renderConsignorList();
    this.updateDashboardButton();
  },

  updateDashboardButton() {
    const sale = Storage.getSale();
    this.elements.dashboardButton.hidden = !sale;
  }
};

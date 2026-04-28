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
    // v164: Start Date / End Date sections + their inputs/checkboxes are gone.
    // The schedule (scheduleDays) is the canonical source.
    this.elements = {
      saleNameInput: document.getElementById('setup-sale-name'),
      addDayButton: document.getElementById('add-day-button'),
      daysEditToggle: document.getElementById('days-edit-toggle'),
      discountList: document.getElementById('discount-list'),
      consignorList: document.getElementById('setup-consignor-list'),
      consignorsEditToggle: document.getElementById('consignors-edit-toggle'),
      dashboardButton: document.getElementById('setup-dashboard-button'),
      startSaleButton: document.getElementById('start-sale-button')
    };
  },

  // Edit-mode state for the Sale Days and Consignors sections (v173).
  // _editMode flips when the user taps Remove → Done. _armed holds the
  // index/id of a row whose minus has been tapped once and is awaiting
  // the second confirm tap.
  _editMode: { days: false, consignors: false },
  _armed: { dayIndex: null, consignorId: null },

  /**
   * Set up default state on page load
   */
  _initDefaultState() {
    const today = this._todayString();
    this.scheduleDays = [{ date: today, discount: 0 }];
    this.renderDiscountList();
    this.validateForm();
  },

  /**
   * Bind event listeners
   */
  bindEvents() {
    // "+ Add Day" — appends the next consecutive day with no discount.
    // User can tap the new day's date inline to change it if they want a gap.
    this.elements.addDayButton.addEventListener('click', () => {
      const lastDay = this.scheduleDays[this.scheduleDays.length - 1];
      const lastDate = lastDay ? lastDay.date : this._todayString();
      const nextDate = this._addOneDay(lastDate);
      // Skip if duplicate (extremely unlikely with consecutive logic)
      if (this.scheduleDays.some(d => d.date === nextDate)) return;
      this.scheduleDays.push({ date: nextDate, discount: 0 });
      this._sortAndRenumber();
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

    // Add consignor button on setup
    const addConsignorBtn = document.getElementById('setup-add-consignor');
    if (addConsignorBtn) {
      addConsignorBtn.addEventListener('click', () => App.openConsignorSheet(null));
    }

    // Edit-mode toggles for Sale Days and Consignors (v173)
    if (this.elements.daysEditToggle) {
      this.elements.daysEditToggle.addEventListener('click', () => this._toggleEditMode('days'));
    }
    if (this.elements.consignorsEditToggle) {
      this.elements.consignorsEditToggle.addEventListener('click', () => this._toggleEditMode('consignors'));
    }
  },

  /**
   * Flip edit mode for a section ("days" or "consignors"). Clears any armed
   * row, swaps the toggle text between Remove/Done, and re-renders the list.
   */
  _toggleEditMode(section) {
    this._editMode[section] = !this._editMode[section];
    this._armed.dayIndex = null;
    this._armed.consignorId = null;
    this._refreshEditToggles();
    if (section === 'days') {
      this.renderDiscountList();
    } else {
      this.renderConsignorList();
    }
  },

  /**
   * Update the Remove/Done labels and visibility of the edit-mode toggles.
   * Hide the toggle entirely when there's nothing to edit (1 day for Days,
   * 0 consignors for Consignors).
   */
  _refreshEditToggles() {
    const sale = Storage.getSale();
    const consignors = sale ? (sale.consignors || []) : this.pendingConsignors;

    if (this.elements.daysEditToggle) {
      const showDays = this.scheduleDays.length > 1;
      this.elements.daysEditToggle.hidden = !showDays;
      this.elements.daysEditToggle.textContent = this._editMode.days ? 'Done' : 'Remove';
    }
    if (this.elements.consignorsEditToggle) {
      const showCons = consignors.length > 0;
      this.elements.consignorsEditToggle.hidden = !showCons;
      this.elements.consignorsEditToggle.textContent = this._editMode.consignors ? 'Done' : 'Remove';
    }
  },

  /**
   * Return the YYYY-MM-DD string for `dateStr` plus one day.
   */
  _addOneDay(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + 1);
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  },

  /**
   * v164: _setStartDate / _syncStartDate / _syncEndDate / _updateStartDateState
   * removed — there are no more separate start/end inputs to keep in sync.
   * The schedule (scheduleDays) is the single source of truth.
   */
  _sortAndRenumber() {
    this.scheduleDays.sort((a, b) => a.date.localeCompare(b.date));
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
   * Render the discount list. Tap a row's discount value to edit; the inline
   * edit also surfaces a "Remove this day" link when more than one day exists.
   * In edit mode, each row gets a minus-circle handle on the left; tapping
   * it arms the row (right side becomes a Confirm button).
   */
  renderDiscountList() {
    const editing = this._editMode.days;
    const armedIndex = this._armed.dayIndex;

    const html = this.scheduleDays.map((dayObj, index) => {
      const dayNum = index + 1;
      const dateLabel = this._formatDateLabel(dayObj.date);
      const armed = editing && armedIndex === index;

      // Left side: minus-circle handle (rendered always, hidden by CSS when
      // not in edit mode, so toggling edit mode doesn't require a re-render).
      const handleHtml = `<button class="row-edit-handle" data-arm-day="${index}" type="button" aria-label="Remove Day ${dayNum}"></button>`;

      // Right side: depends on armed state. Armed row → red Confirm button.
      // Otherwise → the existing tap-to-edit-discount affordance.
      let rightHtml;
      if (armed) {
        rightHtml = `<button class="row-edit-confirm" data-confirm-day="${index}" type="button">Remove</button>`;
      } else if (dayObj.discount > 0) {
        rightHtml = `<span class="discount-row__value" data-day-index="${index}">${dayObj.discount}% off</span>`;
      } else {
        rightHtml = `<button class="discount-row__add-link" data-day-index="${index}">+ Add Discount</button>`;
      }

      const labelHtml = editing
        ? `<span class="discount-row__label">Day ${dayNum} &middot; ${dateLabel}</span>`
        : `<span class="discount-row__label">Day ${dayNum} <span class="discount-row__date" data-edit-date="${index}">&middot; ${dateLabel}<input type="date" class="setup-hidden-input" data-row-picker="${index}" value="${dayObj.date}"></span></span>`;

      return `
        <div class="discount-row" data-day-index="${index}">
          <div class="discount-row__content">
            ${handleHtml}
            ${labelHtml}
            <div class="discount-row__right">${rightHtml}</div>
          </div>
        </div>
      `;
    }).join('');

    this.elements.discountList.innerHTML = html;
    this.elements.discountList.classList.toggle('discount-list--editing', editing);
    this._refreshEditToggles();

    if (editing) {
      // In edit mode: only the minus handles and confirm buttons respond.
      this.elements.discountList.querySelectorAll('[data-arm-day]').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.armDay);
          this._armed.dayIndex = (this._armed.dayIndex === idx) ? null : idx;
          this.renderDiscountList();
        });
      });
      this.elements.discountList.querySelectorAll('[data-confirm-day]').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.confirmDay);
          this._deleteDay(idx);
          this._armed.dayIndex = null;
          // Auto-exit edit mode if no more removable rows remain
          if (this.scheduleDays.length <= 1) {
            this._editMode.days = false;
          }
          this._refreshEditToggles();
          this.renderDiscountList();
        });
      });
      return;
    }

    // Normal (non-edit) mode bindings — date picker + discount tap-to-edit
    this.elements.discountList.querySelectorAll('.discount-row__value, .discount-row__add-link').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.dayIndex);
        this._openDiscountEdit(idx, el.closest('.discount-row'));
      });
    });

    // Native iOS date picker behavior (v185): listen on `blur` rather than
    // `change`. Change fires as the user scrolls dates inside the picker,
    // and re-rendering the list mid-pick destroys the input element the
    // picker is anchored to — closes the picker prematurely. Blur fires
    // when the user taps Done (the checkmark) or dismisses, which is the
    // confirmation moment we actually want.
    this.elements.discountList.querySelectorAll('[data-row-picker]').forEach(input => {
      input.addEventListener('blur', () => {
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
        this.renderDiscountList();
        this.validateForm();
      });
    });
  },

  /**
   * Delete a schedule day by index
   */
  _deleteDay(index) {
    if (this.scheduleDays.length <= 1) return;
    this.scheduleDays.splice(index, 1);
    this.renderDiscountList();
    this.validateForm();
  },

  /**
   * Open inline discount edit for a specific day. Day deletion lives in
   * Edit Mode now (Remove toggle on the action row), not inside this flow.
   */
  _openDiscountEdit(index, rowEl) {
    const rightEl = rowEl.querySelector('.discount-row__right');
    const current = this.scheduleDays[index].discount || 0;

    rightEl.innerHTML = `
      <div class="discount-row__edit">
        <input type="number" class="ec-input ec-input--compact" value="${current || ''}"
          min="0" max="100" inputmode="numeric" data-day-index="${index}" placeholder="0">
        <span class="discount-row__suffix">% off</span>
      </div>
    `;

    const input = rightEl.querySelector('.ec-input--compact');
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
    return this.scheduleDays.length > 0 ? this.scheduleDays[0].date : this._todayString();
  },

  /**
   * Get effective end date string. v164: always derived from the last
   * schedule day. (TBD removed — sale always has a defined end now.)
   */
  _getEndDate() {
    if (this.scheduleDays.length === 0) return null;
    return this.scheduleDays[this.scheduleDays.length - 1].date;
  },

  /**
   * Validate the form — enabled when there's at least one day in the schedule
   * (Day 1 is auto-populated to today, so this is always satisfied unless the
   * user explicitly deletes everything — which the swipe-to-delete prevents).
   */
  validateForm() {
    const isValid = this.scheduleDays.length > 0;
    this.elements.startSaleButton.disabled = !isValid;
    return isValid;
  },

  /**
   * Convert scheduleDays to the discounts object format for the sale.
   * Legacy storage (just `{day: percent}`) — kept alongside scheduleDays
   * for back-compat during the v190 transition.
   */
  _buildDiscountsObject() {
    const discounts = {};
    this.scheduleDays.forEach((d, i) => {
      discounts[i + 1] = d.discount;
    });
    return discounts;
  },

  /**
   * Build the canonical scheduleDays array for the sale (v190).
   * Each entry is `{day: 1-based number, date: YYYY-MM-DD, discount: percent}`.
   * Persisting this means non-consecutive ("gap") schedules survive — the
   * old `{day: pct}` shape lost the dates and required deriving them as
   * startDate + (day-1), which was wrong for any sale with a gap.
   */
  _buildScheduleDaysArray() {
    return this.scheduleDays.map((d, i) => ({
      day: i + 1,
      date: d.date,
      discount: d.discount
    }));
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

    const isToday = startDate === this._todayString();
    const startLabel = isToday
      ? `Today (${this._formatDateLabelFull(startDate)})`
      : this._formatDateLabelFull(startDate);

    const daysLabel = `${this.scheduleDays.length} day${this.scheduleDays.length !== 1 ? 's' : ''}`;

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
        discounts: this._buildDiscountsObject(),
        scheduleDays: this._buildScheduleDaysArray()
      });
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Start Estate Sale';
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
      scheduleDays: config.scheduleDays || null,  // v190: filled by Storage.getSale() migration if missing
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

  /**
   * Mark the current sale as ended. v159: we no longer clear the sale or
   * its transactions from local storage — keeping them lets the operator
   * review past invoices from the dashboard. Cart and customer counter
   * are still cleared (those are session state, not historical).
   *
   * The user starts a fresh sale via "Start New Sale" on the dashboard,
   * which calls clearEndedSale() to actually drop the old record.
   */
  endSale() {
    const sale = Storage.getSale();
    if (!sale) return;
    sale.status = 'ended';
    sale.endedAt = Utils.getTimestamp();
    Storage.saveSale(sale);
    if (typeof Sync !== 'undefined' && Sync.isSynced(sale)) {
      Sync.patchSale(sale.id, sale.shareCode, {
        status: 'ended',
        endedAt: sale.endedAt
      }).catch(err => console.warn('[sync] endSale failed:', err.message));
    }
    Storage.clearCart();
    Storage.clearCustomerCounter();
  },

  /** Drop the ended sale from local storage so the user can start a fresh one. */
  clearEndedSale() {
    Storage.clearSale();
  },

  renderConsignorList() {
    const container = document.getElementById('setup-consignor-list');
    if (!container) return;

    const sale = Storage.getSale();
    const consignors = sale ? (sale.consignors || []) : this.pendingConsignors;
    const editing = this._editMode.consignors;
    const armedId = this._armed.consignorId;

    if (consignors.length === 0) {
      container.innerHTML = '';
      container.classList.remove('consignor-list--editing');
      this._refreshEditToggles();
      return;
    }

    container.innerHTML = consignors.map(c => {
      const payoutLabel = c.payoutType === 'percentage'
        ? `${c.payoutValue}% to consignor`
        : `$${c.payoutValue} fee per item`;
      const armed = editing && armedId === c.id;
      const handleHtml = `<button class="row-edit-handle" data-arm-consignor="${c.id}" type="button" aria-label="Remove ${Utils.escapeHtml(c.name)}"></button>`;
      const rightHtml = armed
        ? `<button class="row-edit-confirm" data-confirm-consignor="${c.id}" type="button">Remove</button>`
        : `<span class="consignor-list__payout">${payoutLabel}</span>`;
      return `<div class="consignor-list__item" data-consignor-id="${c.id}">
        ${handleHtml}
        <span class="consignor-list__dot" style="background: ${c.color}"></span>
        <span class="consignor-list__name">${Utils.escapeHtml(c.name)}</span>
        ${rightHtml}
      </div>`;
    }).join('');

    container.classList.toggle('consignor-list--editing', editing);
    this._refreshEditToggles();

    if (editing) {
      // In edit mode: only the minus handles and confirm buttons respond.
      container.querySelectorAll('[data-arm-consignor]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.dataset.armConsignor;
          this._armed.consignorId = (this._armed.consignorId === id) ? null : id;
          this.renderConsignorList();
        });
      });
      container.querySelectorAll('[data-confirm-consignor]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.dataset.confirmConsignor;
          this._removeConsignor(id);
        });
      });
      return;
    }

    container.querySelectorAll('[data-consignor-id]').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.consignorId;
        const consignor = consignors.find(c => c.id === id);
        if (consignor) App.openConsignorSheet(consignor);
      });
    });
  },

  /**
   * Remove a consignor from edit-mode batch delete. Mirrors App._deleteConsignor
   * but driven by id (not the modal's _consignorEditId) and skips the modal.
   */
  _removeConsignor(consignorId) {
    const sale = Storage.getSale();
    if (sale) {
      Storage.deleteConsignor(consignorId);
      if (typeof Sync !== 'undefined' && Sync.isSynced(sale)) {
        const fresh = Storage.getSale();
        Sync.patchSale(fresh.id, fresh.shareCode, { consignors: fresh.consignors || [] })
          .catch(err => console.warn('[sync] _removeConsignor failed:', err.message));
      }
    } else {
      this.pendingConsignors = this.pendingConsignors.filter(c => c.id !== consignorId);
    }
    this._armed.consignorId = null;
    // Auto-exit edit mode if no more rows remain
    const remaining = sale ? Storage.getConsignors() : this.pendingConsignors;
    if (remaining.length === 0) this._editMode.consignors = false;
    this.renderConsignorList();
  },

  /**
   * Reset the form for a new sale
   */
  resetForm() {
    this.elements.saleNameInput.value = '';
    this._editMode = { days: false, consignors: false };
    this._armed = { dayIndex: null, consignorId: null };
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

/**
 * app.js - Main Application Entry Point for Estate Checkout
 * Handles initialization, routing, and service worker registration
 */

const App = {
  currentScreen: null,

  // Shared header element references
  headerElements: {},

  /**
   * Initialize the application
   */
  init() {
    this.registerServiceWorker();
    if (typeof Sync !== 'undefined') Sync.init();
    this.cacheHeaderElements();
    this.bindHeaderEvents();
    this._bindPayoutTypePicker();
    this._bindEndSaleConfirmInput();
    this.initModules();
    this.route();

},

  // Pending join data (from URL parameter, awaiting user confirmation)
  pendingJoinData: null,

  /**
   * Cache shared header element references
   */
  cacheHeaderElements() {
    this.headerElements = {
      header: document.getElementById('sale-header'),
      // v161: sale-name / sale-day / discount-badge removed from header.
      // Identity + state context now live per-screen (dashboard large title,
      // checkout meta line, menu sale block).
      sharedBadge: document.getElementById('shared-badge'),
      menuBtn: document.getElementById('nav-menu'),
      // Header menu sheet
      menuModal: document.getElementById('header-menu-modal'),
      menuDashboard: document.getElementById('menu-dashboard'),
      menuPayouts: document.getElementById('menu-payouts'),
      menuScan: document.getElementById('menu-scan'),
      menuShare: document.getElementById('menu-share'),
      menuEndDay: document.getElementById('menu-end-day'),
      menuEndSale: document.getElementById('menu-end-sale'),
      menuCancel: document.getElementById('menu-cancel'),
      menuWhatsNew: document.getElementById('menu-whats-new'),
      menuVersionLabel: document.getElementById('menu-version-label'),
      versionHistoryModal: document.getElementById('version-history-modal'),
      versionHistoryContent: document.getElementById('version-history-content'),
      versionHistoryDone: document.getElementById('version-history-done'),
      // End sale confirmation
      endSaleConfirmModal: document.getElementById('end-sale-confirm-modal'),
      endSaleConfirm: document.getElementById('end-sale-confirm'),
      endSaleCancel: document.getElementById('end-sale-cancel'),
      // Share sale sheet
      shareSaleModal: document.getElementById('share-sale-modal'),
      shareSaleQr: document.getElementById('share-sale-qr'),
      shareSaleCode: document.getElementById('share-sale-code'),
      shareSaleDone: document.getElementById('share-sale-done'),
      // Join sale sheet
      joinSaleModal: document.getElementById('join-sale-modal'),
      joinSaleTitle: document.getElementById('join-sale-title'),
      joinSaleDesc: document.getElementById('join-sale-desc'),
      joinSaleConfirm: document.getElementById('join-sale-confirm'),
      joinSaleCancel: document.getElementById('join-sale-cancel'),
      // Join instruction sheet
      joinInstructionModal: document.getElementById('join-instruction-modal'),
      joinInstructionDone: document.getElementById('join-instruction-done'),
      // Join Sale button on setup
      joinSaleButton: document.getElementById('join-sale-button'),
      // Edit sale sheet
      menuEditSale: document.getElementById('menu-edit-sale'),
      editSaleModal: document.getElementById('edit-sale-modal'),
      editSaleContent: document.getElementById('edit-sale-content'),
      editSaleDone: document.getElementById('edit-sale-done'),
      // Setup menu
      setupMenuBtn: document.getElementById('setup-menu-btn'),
      setupMenuModal: document.getElementById('setup-menu-modal'),
      setupMenuCancel: document.getElementById('setup-menu-cancel')
    };
  },

  /**
   * Bind shared header event listeners
   */
  bindHeaderEvents() {
    // Menu button
    if (this.headerElements.menuBtn) {
      this.headerElements.menuBtn.addEventListener('click', () => this.openMenu());
    }

    // Menu sheet items
    if (this.headerElements.menuDashboard) {
      this.headerElements.menuDashboard.addEventListener('click', () => {
        this.closeMenu();
        this.showScreen('dashboard');
      });
    }
    if (this.headerElements.menuPayouts) {
      this.headerElements.menuPayouts.addEventListener('click', () => {
        this.closeMenu();
        this.showScreen('payouts');
      });
    }
    if (this.headerElements.menuScan) {
      this.headerElements.menuScan.addEventListener('click', () => {
        this.closeMenu();
        this.showScreen('scan');
      });
    }
    if (this.headerElements.menuShare) {
      this.headerElements.menuShare.addEventListener('click', () => {
        this.closeMenu();
        this.openShareSaleSheet();
      });
    }
    if (this.headerElements.menuEditSale) {
      this.headerElements.menuEditSale.addEventListener('click', () => {
        this.closeMenu();
        this.openEditSale();
      });
    }
    if (this.headerElements.editSaleDone) {
      this.headerElements.editSaleDone.addEventListener('click', () => this.closeEditSale());
    }
    if (this.headerElements.editSaleModal) {
      this.headerElements.editSaleModal.addEventListener('click', (e) => {
        if (e.target === this.headerElements.editSaleModal) {
          if (this._editSaleEditing) {
            if (document.activeElement && document.activeElement.blur) {
              document.activeElement.blur();
            }
            return;
          }
          this.closeEditSale();
        }
      });
    }
    if (this.headerElements.menuEndDay) {
      this.headerElements.menuEndDay.addEventListener('click', () => {
        this.closeMenu();
        const sale = Storage.getSale();
        if (sale && sale.status === 'paused') {
          SaleSetup.resumeSale();
          Checkout.loadSale();
          this.showScreen('checkout');
        } else {
          this.endDay();
        }
      });
    }
    if (this.headerElements.menuEndSale) {
      this.headerElements.menuEndSale.addEventListener('click', () => {
        this.closeMenu();
        this.showEndSaleConfirm();
      });
    }
    if (this.headerElements.menuCancel) {
      this.headerElements.menuCancel.addEventListener('click', () => this.closeMenu());
    }
    if (this.headerElements.menuModal) {
      this.headerElements.menuModal.addEventListener('click', (e) => {
        if (e.target === this.headerElements.menuModal) this.closeMenu();
      });
    }

    // Version / What's New
    this._initVersionHistory();
    if (this.headerElements.menuWhatsNew) {
      this.headerElements.menuWhatsNew.addEventListener('click', () => {
        this.closeMenu();
        this.openVersionHistory();
      });
    }
    if (this.headerElements.versionHistoryDone) {
      this.headerElements.versionHistoryDone.addEventListener('click', () => this.closeVersionHistory());
    }
    if (this.headerElements.versionHistoryModal) {
      this.headerElements.versionHistoryModal.addEventListener('click', (e) => {
        if (e.target === this.headerElements.versionHistoryModal) this.closeVersionHistory();
      });
    }

    // End sale confirmation
    if (this.headerElements.endSaleConfirm) {
      this.headerElements.endSaleConfirm.addEventListener('click', () => {
        this.headerElements.endSaleConfirmModal.classList.remove('visible');
        this.endSale();
      });
    }
    if (this.headerElements.endSaleCancel) {
      this.headerElements.endSaleCancel.addEventListener('click', () => {
        this.headerElements.endSaleConfirmModal.classList.remove('visible');
      });
    }
    if (this.headerElements.endSaleConfirmModal) {
      this.headerElements.endSaleConfirmModal.addEventListener('click', (e) => {
        if (e.target === this.headerElements.endSaleConfirmModal) {
          this.headerElements.endSaleConfirmModal.classList.remove('visible');
        }
      });
    }

    // Paused screen buttons
    const pausedResume = document.getElementById('paused-resume');
    const pausedDashboard = document.getElementById('paused-dashboard');
    const pausedEndSale = document.getElementById('paused-end-sale');

    if (pausedResume) {
      pausedResume.addEventListener('click', () => {
        SaleSetup.resumeSale();
        Checkout.loadSale();
        this.showScreen('checkout');
      });
    }
    if (pausedDashboard) {
      pausedDashboard.addEventListener('click', () => this.showScreen('dashboard'));
    }
    if (pausedEndSale) {
      pausedEndSale.addEventListener('click', () => this.endSale());
    }

    // Share sale modal done/backdrop
    if (this.headerElements.shareSaleDone) {
      this.headerElements.shareSaleDone.addEventListener('click', () => this.closeShareSaleSheet());
    }
    if (this.headerElements.shareSaleModal) {
      this.headerElements.shareSaleModal.addEventListener('click', (e) => {
        if (e.target === this.headerElements.shareSaleModal) this.closeShareSaleSheet();
      });
    }

    // Join sale confirmation buttons
    if (this.headerElements.joinSaleConfirm) {
      this.headerElements.joinSaleConfirm.addEventListener('click', () => this.confirmJoinSale());
    }
    if (this.headerElements.joinSaleCancel) {
      this.headerElements.joinSaleCancel.addEventListener('click', () => this.cancelJoinSale());
    }
    if (this.headerElements.joinSaleModal) {
      this.headerElements.joinSaleModal.addEventListener('click', (e) => {
        if (e.target === this.headerElements.joinSaleModal) this.cancelJoinSale();
      });
    }

    // Join Sale button on setup screen
    if (this.headerElements.joinSaleButton) {
      this.headerElements.joinSaleButton.addEventListener('click', () => this.showJoinInstruction());
    }

    // Join instruction done/backdrop
    if (this.headerElements.joinInstructionDone) {
      this.headerElements.joinInstructionDone.addEventListener('click', () => {
        this.headerElements.joinInstructionModal.classList.remove('visible');
      });
    }
    if (this.headerElements.joinInstructionModal) {
      this.headerElements.joinInstructionModal.addEventListener('click', (e) => {
        if (e.target === this.headerElements.joinInstructionModal) {
          this.headerElements.joinInstructionModal.classList.remove('visible');
        }
      });
    }

    // Setup menu
    if (this.headerElements.setupMenuBtn) {
      this.headerElements.setupMenuBtn.addEventListener('click', () => {
        this.headerElements.setupMenuModal.classList.add('visible');
      });
    }
    if (this.headerElements.setupMenuCancel) {
      this.headerElements.setupMenuCancel.addEventListener('click', () => {
        this.headerElements.setupMenuModal.classList.remove('visible');
      });
    }
    if (this.headerElements.setupMenuModal) {
      this.headerElements.setupMenuModal.addEventListener('click', (e) => {
        if (e.target === this.headerElements.setupMenuModal) {
          this.headerElements.setupMenuModal.classList.remove('visible');
        }
      });
    }

    // Consignor sheet events (shared by Edit Sale + Setup)
    this._initConsignorSheetEvents();
  },

  /**
   * Open the header menu sheet
   */
  openMenu() {
    if (!this.headerElements.menuModal) return;
    // Toggle End Day / Resume Day based on sale status
    const sale = Storage.getSale();
    if (this.headerElements.menuEndDay) {
      this.headerElements.menuEndDay.textContent = (sale && sale.status === 'paused') ? 'Resume Day' : 'End Day';
    }
    // Show Consignor Payouts only if consignors exist
    if (this.headerElements.menuPayouts) {
      const hasConsignors = sale && sale.consignors && sale.consignors.length > 0;
      this.headerElements.menuPayouts.hidden = !hasConsignors;
    }
    this.headerElements.menuModal.classList.add('visible');
  },

  /**
   * Close the header menu sheet
   */
  closeMenu() {
    if (this.headerElements.menuModal) {
      this.headerElements.menuModal.classList.remove('visible');
    }
  },

  // ── Edit Sale Sheet ──

  // Track whether an input is actively being edited in the Edit Sale sheet
  _editSaleEditing: false,

  /**
   * Open the edit sale sheet and render its content
   */
  openEditSale() {
    const sale = Storage.getSale();
    if (!sale) return;
    this._editSaleEditing = false;
    this._updateEditSaleDoneBtn();
    this.renderEditSale(sale);
    this.headerElements.editSaleModal.classList.add('visible');
  },

  /**
   * Close the edit sale sheet and refresh dependent state
   */
  closeEditSale() {
    if (this._editSaleEditing) {
      // Confirm first — blur active input, don't close yet
      if (document.activeElement && document.activeElement.blur) {
        document.activeElement.blur();
      }
      return;
    }
    this.headerElements.editSaleModal.classList.remove('visible');
    // Refresh header, checkout discount, and paused screen
    const sale = Storage.getSale();
    if (sale) {
      this.updateHeaderContent(sale);
      Checkout.loadSale();
    }
  },

  /**
   * Set or clear the editing flag and update Done button text
   */
  _setEditSaleEditing(editing) {
    this._editSaleEditing = editing;
    this._updateEditSaleDoneBtn();
  },

  /**
   * Update the Done/Confirm button text based on editing state
   */
  _updateEditSaleDoneBtn() {
    if (this.headerElements.editSaleDone) {
      this.headerElements.editSaleDone.textContent = this._editSaleEditing ? 'Confirm' : 'Done';
    }
  },

  /**
   * Show a brief flash error message inside the edit sale sheet
   */
  _showEditSaleFlash(message) {
    const sheet = this.headerElements.editSaleModal?.querySelector('.sheet');
    if (!sheet) return;
    // Remove any existing flash
    const existing = sheet.querySelector('.edit-sale__flash-error');
    if (existing) existing.remove();
    const el = document.createElement('div');
    el.className = 'edit-sale__flash-error';
    el.textContent = message;
    sheet.appendChild(el);
    setTimeout(() => el.remove(), 1500);
  },

  /**
   * Render the edit sale sheet content
   */
  renderEditSale(sale) {
    const currentDay = Utils.getSaleDay(sale.startDate, sale);
    const discounts = sale.discounts || {};
    const days = Object.keys(discounts).map(Number).sort((a, b) => a - b);

    let html = '';

    // Sale Name
    html += `<div class="edit-sale__section">
      <div class="edit-sale__label">Sale Name</div>
      <div class="edit-sale__value" id="edit-sale-name">${Utils.escapeHtml(sale.name)}</div>
    </div>`;

    // Current Day (dropdown)
    html += `<div class="edit-sale__section">
      <div class="edit-sale__label">Current Day</div>
      <div class="edit-sale__value" id="edit-sale-day">Day ${currentDay}</div>
    </div>`;

    // Discount Schedule
    html += `<div class="edit-sale__section">
      <div class="consignor-section__header">
        <div class="edit-sale__label">Discount Schedule</div>
        <button class="consignor-list__add" id="edit-sale-add-day">+ Add Day</button>
      </div>`;
    days.forEach(d => {
      const isCompleted = d <= currentDay;
      const removeClass = isCompleted ? 'edit-sale__remove edit-sale__remove--disabled' : 'edit-sale__remove';
      html += `<div class="edit-sale__row">
        <span class="edit-sale__row-label">Day ${d}</span>
        <span class="edit-sale__row-value" data-edit-discount="${d}">${discounts[d]}%</span>
        <button class="${removeClass}" data-remove-day="${d}" ${isCompleted ? 'aria-disabled="true"' : ''}>&times;</button>
      </div>`;
    });
    html += `</div>`;

    // Consignors section
    const consignors = sale.consignors || [];
    html += `<div class="edit-sale__section">
      <div class="consignor-section__header">
        <div class="edit-sale__label">Consignors</div>
        <button class="consignor-list__add" id="edit-sale-add-consignor">+ Add</button>
      </div>`;
    if (consignors.length === 0) {
      html += `<div style="font-size: var(--font-size-sm); color: var(--color-text-secondary); padding: var(--space-sm) 0;">No consignors added</div>`;
    } else {
      consignors.forEach(c => {
        const payoutLabel = c.payoutType === 'percentage'
          ? `${c.payoutValue}% to consignor`
          : `$${c.payoutValue} fee per item`;
        html += `<div class="consignor-list__item" data-consignor-id="${c.id}">
          <span class="consignor-list__dot" style="background: ${c.color}"></span>
          <span class="consignor-list__name">${Utils.escapeHtml(c.name)}</span>
          <span class="consignor-list__payout">${payoutLabel}</span>
        </div>`;
      });
    }
    html += `</div>`;

    this.headerElements.editSaleContent.innerHTML = html;
    this._setEditSaleEditing(false);
    this.bindEditSaleEvents(sale);
  },

  /**
   * Bind tap-to-edit events inside the edit sale sheet
   */
  bindEditSaleEvents(sale) {
    const content = this.headerElements.editSaleContent;

    // Sale name tap to edit
    const nameEl = content.querySelector('#edit-sale-name');
    if (nameEl) {
      nameEl.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'sheet__input';
        input.value = sale.name;
        input.maxLength = 50;
        nameEl.replaceWith(input);
        input.focus();
        this._setEditSaleEditing(true);
        const save = () => {
          const val = input.value.trim();
          if (val) sale.name = val;
          Storage.saveSale(sale);
          this._setEditSaleEditing(false);
          this.renderEditSale(sale);
        };
        input.addEventListener('blur', save);
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); });
      });
    }

    // Current day tap to open dropdown
    const dayEl = content.querySelector('#edit-sale-day');
    if (dayEl) {
      dayEl.addEventListener('click', () => {
        const currentDay = Utils.getSaleDay(sale.startDate, sale);
        const days = Object.keys(sale.discounts).map(Number).sort((a, b) => a - b);
        const select = document.createElement('select');
        select.className = 'sheet__input';
        days.forEach(d => {
          const opt = document.createElement('option');
          opt.value = d;
          opt.textContent = `Day ${d}`;
          if (d === currentDay) opt.selected = true;
          select.appendChild(opt);
        });
        dayEl.replaceWith(select);
        select.focus();
        this._setEditSaleEditing(true);
        select.addEventListener('change', () => {
          sale.dayOverride = parseInt(select.value);
          Storage.saveSale(sale);
          this._setEditSaleEditing(false);
          this.renderEditSale(sale);
        });
        select.addEventListener('blur', () => {
          this._setEditSaleEditing(false);
          this.renderEditSale(sale);
        });
      });
    }

    // Discount percentage tap to edit
    content.querySelectorAll('[data-edit-discount]').forEach(el => {
      el.addEventListener('click', () => {
        const day = parseInt(el.dataset.editDiscount);
        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'sheet__input';
        input.value = sale.discounts[day] || 0;
        input.min = 0;
        input.max = 100;
        input.style.width = '80px';
        input.style.textAlign = 'right';
        el.replaceWith(input);
        input.focus();
        this._setEditSaleEditing(true);
        const save = () => {
          const val = parseInt(input.value);
          if (!isNaN(val) && val >= 0 && val <= 100) {
            sale.discounts[day] = val;
          }
          Storage.saveSale(sale);
          this._setEditSaleEditing(false);
          this.renderEditSale(sale);
        };
        input.addEventListener('blur', save);
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); });
      });
    });

    // Remove day buttons
    content.querySelectorAll('[data-remove-day]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const day = parseInt(btn.dataset.removeDay);
        const currentDay = Utils.getSaleDay(sale.startDate, sale);

        if (day <= currentDay) {
          this._showEditSaleFlash("Can't remove a completed day");
          return;
        }

        // Delete the day and renumber sequentially
        delete sale.discounts[day];
        const remaining = Object.keys(sale.discounts).map(Number).sort((a, b) => a - b);
        const newDiscounts = {};
        remaining.forEach((oldKey, i) => {
          newDiscounts[i + 1] = sale.discounts[oldKey];
        });
        sale.discounts = newDiscounts;

        // Clamp dayOverride if needed
        const maxDay = remaining.length;
        if (sale.dayOverride && sale.dayOverride > maxDay) {
          sale.dayOverride = maxDay;
        }

        Storage.saveSale(sale);
        this.renderEditSale(sale);
      });
    });

    // Add Day button
    const addDayBtn = content.querySelector('#edit-sale-add-day');
    if (addDayBtn) {
      addDayBtn.addEventListener('click', () => {
        const days = Object.keys(sale.discounts).map(Number);
        const nextDay = days.length > 0 ? Math.max(...days) + 1 : 1;
        const lastDiscount = days.length > 0 ? sale.discounts[Math.max(...days)] : 0;
        // Default new day to last discount + 25, capped at 100
        sale.discounts[nextDay] = Math.min(100, lastDiscount + 25);
        Storage.saveSale(sale);
        this.renderEditSale(sale);
      });
    }

    // Consignor: Add button
    const addConsignorBtn = content.querySelector('#edit-sale-add-consignor');
    if (addConsignorBtn) {
      addConsignorBtn.addEventListener('click', () => this.openConsignorSheet(null));
    }

    // Consignor: Tap to edit
    content.querySelectorAll('[data-consignor-id]').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.consignorId;
        const consignor = (sale.consignors || []).find(c => c.id === id);
        if (consignor) this.openConsignorSheet(consignor);
      });
    });
  },

  // ── Consignor Sheet ──

  _consignorEditId: null,

  openConsignorSheet(consignor) {
    const modal = document.getElementById('consignor-modal');
    const title = document.getElementById('consignor-modal-title');
    const nameInput = document.getElementById('consignor-name');
    const payoutType = document.getElementById('consignor-payout-type');
    const payoutValue = document.getElementById('consignor-payout-value');
    const notesInput = document.getElementById('consignor-notes');
    const deleteBtn = document.getElementById('consignor-delete');

    if (consignor) {
      title.textContent = 'Edit Consignor';
      nameInput.value = consignor.name;
      payoutType.value = consignor.payoutType;
      payoutValue.value = consignor.payoutValue;
      notesInput.value = consignor.notes || '';
      deleteBtn.hidden = false;
      this._consignorEditId = consignor.id;
      this._renderConsignorColors(consignor.color);
    } else {
      title.textContent = 'Add Consignor';
      nameInput.value = '';
      payoutType.value = 'percentage';
      payoutValue.value = '';
      notesInput.value = '';
      deleteBtn.hidden = true;
      this._consignorEditId = null;
      // Pick first unused color
      const sale = Storage.getSale();
      const existing = sale ? Storage.getConsignors() : SaleSetup.pendingConsignors;
      const used = existing.map(c => c.color);
      const defaultColor = CONSIGNOR_COLORS.find(c => !used.includes(c)) || CONSIGNOR_COLORS[0];
      this._renderConsignorColors(defaultColor);
    }

    this._updateConsignorPayoutUI();
    modal.classList.add('visible');
  },

  _renderConsignorColors(selected) {
    const container = document.getElementById('consignor-colors');
    container.innerHTML = CONSIGNOR_COLORS.map(color => {
      const sel = color === selected ? ' consignor-form__color-dot--selected' : '';
      return `<div class="consignor-form__color-dot${sel}" data-color="${color}" style="background: ${color}"></div>`;
    }).join('');

    container.querySelectorAll('.consignor-form__color-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        container.querySelectorAll('.consignor-form__color-dot').forEach(d => d.classList.remove('consignor-form__color-dot--selected'));
        dot.classList.add('consignor-form__color-dot--selected');
      });
    });
  },

  _updateConsignorPayoutUI() {
    const type = document.getElementById('consignor-payout-type').value;
    const prefix = document.getElementById('consignor-payout-prefix');
    const suffix = document.getElementById('consignor-payout-suffix');
    const hint = document.getElementById('consignor-payout-hint');
    const input = document.getElementById('consignor-payout-value');
    const typeLabel = document.getElementById('consignor-payout-type-label');

    if (type === 'percentage') {
      prefix.textContent = '';
      suffix.textContent = '%';
      input.placeholder = '70';
      if (typeLabel) typeLabel.textContent = 'Percentage';
      const val = parseFloat(input.value) || 0;
      hint.textContent = val > 0 ? `Consignor gets ${val}%, you keep ${100 - val}%` : 'Consignor gets X%, you keep the rest';
    } else {
      prefix.textContent = '$';
      suffix.textContent = '';
      input.placeholder = '5';
      if (typeLabel) typeLabel.textContent = 'Flat Fee';
      const val = parseFloat(input.value) || 0;
      hint.textContent = val > 0 ? `You charge $${val} per item, consignor gets the rest` : 'You charge $X per item, consignor gets the rest';
    }
  },

  _openPayoutTypePicker() {
    const modal = document.getElementById('payout-type-picker-modal');
    if (!modal) return;
    const currentValue = document.getElementById('consignor-payout-type').value;
    modal.querySelectorAll('[data-payout-type]').forEach(el => {
      el.classList.toggle('ec-picker-item--selected', el.dataset.payoutType === currentValue);
    });
    modal.classList.add('visible');
  },

  _closePayoutTypePicker() {
    const modal = document.getElementById('payout-type-picker-modal');
    if (modal) modal.classList.remove('visible');
  },

  _bindPayoutTypePicker() {
    if (this._payoutTypePickerBound) return;
    this._payoutTypePickerBound = true;

    const btn = document.getElementById('consignor-payout-type-btn');
    if (btn) {
      btn.addEventListener('click', () => this._openPayoutTypePicker());
    }

    const modal = document.getElementById('payout-type-picker-modal');
    if (modal) {
      modal.querySelectorAll('[data-payout-type]').forEach(el => {
        el.addEventListener('click', () => {
          const value = el.dataset.payoutType;
          const hidden = document.getElementById('consignor-payout-type');
          if (hidden) hidden.value = value;
          this._updateConsignorPayoutUI();
          this._closePayoutTypePicker();
        });
      });
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this._closePayoutTypePicker();
      });
    }
  },

  _saveConsignor() {
    const name = document.getElementById('consignor-name').value.trim();
    const payoutType = document.getElementById('consignor-payout-type').value;
    const payoutValue = parseFloat(document.getElementById('consignor-payout-value').value) || 0;
    const notes = document.getElementById('consignor-notes').value.trim();
    const selectedDot = document.querySelector('.consignor-form__color-dot--selected');
    const color = selectedDot ? selectedDot.dataset.color : CONSIGNOR_COLORS[0];

    if (!name) {
      this._showConsignorFlash('Enter a name');
      return;
    }
    if (!payoutValue || payoutValue <= 0) {
      this._showConsignorFlash('Enter a payout value');
      return;
    }
    if (payoutType === 'percentage' && payoutValue > 100) {
      this._showConsignorFlash('Percentage cannot exceed 100%');
      return;
    }

    const sale = Storage.getSale();
    const consignorData = { name, color, payoutType, payoutValue, notes };

    if (sale) {
      // Sale exists — use Storage methods
      if (this._consignorEditId) {
        Storage.updateConsignor(this._consignorEditId, consignorData);
      } else {
        Storage.addConsignor({ id: Utils.generateId(), ...consignorData });
      }
    } else {
      // No sale yet — use SaleSetup.pendingConsignors
      if (this._consignorEditId) {
        const idx = SaleSetup.pendingConsignors.findIndex(c => c.id === this._consignorEditId);
        if (idx !== -1) SaleSetup.pendingConsignors[idx] = { ...SaleSetup.pendingConsignors[idx], ...consignorData };
      } else {
        SaleSetup.pendingConsignors.push({ id: Utils.generateId(), ...consignorData });
      }
    }

    // Sync consignor list to backend if applicable
    if (sale && typeof Sync !== 'undefined' && Sync.isSynced(sale)) {
      const fresh = Storage.getSale();
      Sync.patchSale(fresh.id, fresh.shareCode, { consignors: fresh.consignors || [] })
        .catch(err => console.warn('[sync] saveConsignor failed:', err.message));
    }

    document.getElementById('consignor-modal').classList.remove('visible');
    if (sale) this.renderEditSale(sale);
    if (this.currentScreen === 'setup') SaleSetup.renderConsignorList();
  },

  _deleteConsignor() {
    if (!this._consignorEditId) return;

    const sale = Storage.getSale();
    if (sale) {
      Storage.deleteConsignor(this._consignorEditId);
      // Sync the new consignor list
      if (typeof Sync !== 'undefined' && Sync.isSynced(sale)) {
        const fresh = Storage.getSale();
        Sync.patchSale(fresh.id, fresh.shareCode, { consignors: fresh.consignors || [] })
          .catch(err => console.warn('[sync] deleteConsignor failed:', err.message));
      }
    } else {
      SaleSetup.pendingConsignors = SaleSetup.pendingConsignors.filter(c => c.id !== this._consignorEditId);
    }

    document.getElementById('consignor-modal').classList.remove('visible');
    this._consignorEditId = null;
    if (sale) this.renderEditSale(sale);
    if (this.currentScreen === 'setup') SaleSetup.renderConsignorList();
  },

  _initVersionHistory() {
    // Populate version label in menu
    if (this.headerElements.menuVersionLabel && typeof APP_VERSION !== 'undefined') {
      this.headerElements.menuVersionLabel.textContent = `Version ${APP_VERSION}`;
    }
    // Render version history content
    if (this.headerElements.versionHistoryContent && typeof VERSION_HISTORY !== 'undefined') {
      const html = VERSION_HISTORY.map((entry) => {
        const changesHtml = entry.changes.map((c) => `<li>${c}</li>`).join('');
        return `
          <div class="version-history__entry">
            <p class="version-history__header">
              <span class="version-history__version">${entry.version}</span>
              <span class="version-history__date">${entry.date}</span>
            </p>
            <ul class="version-history__list">${changesHtml}</ul>
          </div>
        `;
      }).join('');
      this.headerElements.versionHistoryContent.innerHTML = html;
    }
  },

  openVersionHistory() {
    if (this.headerElements.versionHistoryModal) {
      this.headerElements.versionHistoryModal.classList.add('visible');
    }
  },

  closeVersionHistory() {
    if (this.headerElements.versionHistoryModal) {
      this.headerElements.versionHistoryModal.classList.remove('visible');
    }
  },

  _showConsignorFlash(message) {
    const sheet = document.querySelector('#consignor-modal .sheet');
    if (!sheet) return;
    const existing = sheet.querySelector('.edit-sale__flash-error');
    if (existing) existing.remove();
    const el = document.createElement('div');
    el.className = 'edit-sale__flash-error';
    el.textContent = message;
    sheet.appendChild(el);
    setTimeout(() => el.remove(), 1500);
  },

  _initConsignorSheetEvents() {
    const modal = document.getElementById('consignor-modal');
    const saveBtn = document.getElementById('consignor-save');
    const deleteBtn = document.getElementById('consignor-delete');
    const cancelBtn = document.getElementById('consignor-cancel');
    const payoutType = document.getElementById('consignor-payout-type');
    const payoutValue = document.getElementById('consignor-payout-value');

    saveBtn.addEventListener('click', () => this._saveConsignor());
    deleteBtn.addEventListener('click', () => this._deleteConsignor());
    cancelBtn.addEventListener('click', () => modal.classList.remove('visible'));
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('visible');
    });
    payoutType.addEventListener('change', () => this._updateConsignorPayoutUI());
    payoutValue.addEventListener('input', () => this._updateConsignorPayoutUI());
  },

  /**
   * Show end sale confirmation dialog
   */
  showEndSaleConfirm() {
    if (!this.headerElements.endSaleConfirmModal) return;
    const sale = Storage.getSale();
    const saleName = sale ? sale.name : '';
    const input = document.getElementById('end-sale-confirm-input');
    const confirmBtn = document.getElementById('end-sale-confirm');
    const nameLabel = document.getElementById('end-sale-confirm-name');
    if (nameLabel) nameLabel.textContent = saleName;
    if (input) {
      input.value = '';
      input.placeholder = saleName;
    }
    if (confirmBtn) confirmBtn.disabled = true;
    this.headerElements.endSaleConfirmModal.classList.add('visible');
    setTimeout(() => { if (input) input.focus(); }, 100);
  },

  /**
   * Wire the type-name-to-confirm input on the End Sale modal.
   * Called once on init.
   */
  _bindEndSaleConfirmInput() {
    if (this._endSaleConfirmInputBound) return;
    this._endSaleConfirmInputBound = true;
    const input = document.getElementById('end-sale-confirm-input');
    const confirmBtn = document.getElementById('end-sale-confirm');
    if (!input || !confirmBtn) return;
    input.addEventListener('input', () => {
      const sale = Storage.getSale();
      const saleName = sale ? sale.name : '';
      confirmBtn.disabled = input.value.trim() !== saleName.trim();
    });
  },

  /**
   * Handle a remote sale-status change detected via polling.
   * paused → kick to paused screen (anyone can resume from there)
   * active → if we were on paused, return to checkout
   * ended  → go to setup with an alert
   */
  _handleRemoteSaleStatusChange(newStatus) {
    console.log('[sync] remote sale status changed →', newStatus);
    if (newStatus === 'paused') {
      this.showScreen('paused');
    } else if (newStatus === 'active') {
      // Someone resumed; if we were on the paused screen, go back to checkout.
      if (this.currentScreen === 'paused') {
        this.showScreen('checkout');
      }
    } else if (newStatus === 'ended') {
      // Drop the active cart but keep the sale + transactions for review
      Storage.clearCart();
      Storage.clearCustomerCounter();
      alert('This sale was ended on another device. You can still review past invoices on the dashboard.');
      this.showScreen('dashboard');
    }
  },

  /**
   * End the current day (pause sale)
   */
  endDay() {
    // Delete any open draft before pausing
    if (Checkout.draftTransactionId) {
      Storage.deleteTransaction(Checkout.draftTransactionId);
      Storage.clearDraftTxnId();
      Checkout.draftTransactionId = null;
    }
    SaleSetup.pauseSale();
    Checkout.items = [];
    Checkout.priceInput = '';
    Checkout.transactionSaved = false;
    Checkout.lastTransaction = null;
    Checkout.reuseCustomerNumber = null;
    this.showScreen('paused');
  },

  /**
   * End the current sale permanently
   */
  endSale() {
    Checkout.endSale();
  },

  /**
   * Register service worker for offline support + auto-update.
   *
   * Auto-update flow:
   *  1. On every app launch, register SW and call registration.update() to force
   *     the browser to check for a new sw.js from the server.
   *  2. When a new SW finishes installing, it activates immediately (skipWaiting
   *     in sw.js). The browser fires 'controllerchange' when the new SW takes
   *     control.
   *  3. On controllerchange, reload the page silently so the user sees the new
   *     version without any manual refresh. localStorage preserves sale state.
   *
   * This eliminates the iOS Safari "can't force refresh" pain — every app reopen
   * pulls the latest code automatically when online.
   */
  registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;

    // Auto-reload when a new service worker takes control
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      console.log('[SW] New version activated — reloading');
      window.location.reload();
    });

    // updateViaCache: 'none' tells the browser to bypass HTTP cache when checking
    // for sw.js updates — critical for iOS Safari, which otherwise caches sw.js
    // aggressively and can miss new versions for hours or days.
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
      .then((registration) => {
        // Force a check for updates on every launch
        registration.update().catch(() => {
          // Offline or fetch failed — harmless, existing SW keeps working
        });

        // Also check for updates when the tab regains focus (user returning
        // from another app) — catches cases where the app was left open for
        // a long time and a new version shipped in between.
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            registration.update().catch(() => {});
          }
        });

        // If a new SW is already waiting when we register, activate it
        if (registration.waiting) {
          registration.waiting.postMessage({ action: 'skipWaiting' });
        }

        // Listen for new SWs installing during this session
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // A new worker is installed and an old one is controlling the page.
              // Tell the new worker to take over immediately.
              newWorker.postMessage({ action: 'skipWaiting' });
            }
          });
        });
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error);
      });
  },

  /**
   * Initialize all modules
   */
  initModules() {
    SaleSetup.init();
    Checkout.init();
    Speech.init();
    QR.init();
    Scan.init();
    Payment.init();
    Dashboard.init();
  },

  /**
   * Route to appropriate screen based on app state
   */
  route() {
    // Check for join parameter first
    const urlParams = new URLSearchParams(window.location.search);
    const joinData = urlParams.get('join');
    if (joinData) {
      this.handleJoinUrl(joinData);
      return;
    }

    const sale = Storage.getSale();

    if (!sale) {
      this.showScreen('setup');
      return;
    }

    const status = sale.status || 'active';

    if (status === 'paused') {
      this.showScreen('paused');
    } else if (status === 'active') {
      this.showScreen('checkout');
    } else if (status === 'ended') {
      // Sale ended — review past invoices on dashboard; banner offers Start New Sale
      this.showScreen('dashboard');
    } else {
      this.showScreen('setup');
    }
  },

  /**
   * Switch to a different screen
   */
  showScreen(screenName, data) {
    // Cleanup before leaving current screen
    if (this.currentScreen === 'scan') {
      try { Scan.stop(); } catch (e) { /* safe — scanner may not have started */ }
    }
    // Stop background sync polling when leaving any screen that polls
    if (this._stopSyncPoll) {
      this._stopSyncPoll();
      this._stopSyncPoll = null;
    }

    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
      screen.classList.remove('active');
    });

    // Show target screen
    const targetScreen = document.getElementById(`screen-${screenName}`);

    if (targetScreen) {
      targetScreen.classList.add('active');
      this.currentScreen = screenName;

      // Update shared header visibility and state
      this.updateHeader(screenName);

      // Handle screen-specific initialization
      if (screenName === 'checkout') {
        Checkout.loadSale();
        Checkout.render();
        // Poll for sale-state changes from other devices (end day, end sale)
        const sale = Storage.getSale();
        if (typeof Sync !== 'undefined' && Sync.isSynced(sale)) {
          this._stopSyncPoll = Sync.startPolling(sale, 3000, (result) => {
            if (result.saleStatusChanged) this._handleRemoteSaleStatusChange(result.newStatus);
          });
        }
      } else if (screenName === 'setup') {
        SaleSetup.resetForm();
      } else if (screenName === 'qr') {
        QR.render(data);
      } else if (screenName === 'scan') {
        Scan.onActivate();
      } else if (screenName === 'payment') {
        Payment.render(data);
      } else if (screenName === 'dashboard') {
        Dashboard.resetFilters();
        Dashboard.render(data);
        // Start sync polling — pulls invoices + sale status from other devices
        const sale = Storage.getSale();
        if (typeof Sync !== 'undefined' && Sync.isSynced(sale)) {
          this._stopSyncPoll = Sync.startPolling(sale, 3000, (result) => {
            if (result.count > 0) Dashboard.render();
            if (result.saleStatusChanged) this._handleRemoteSaleStatusChange(result.newStatus);
          });
        }
      } else if (screenName === 'payouts') {
        Payouts.render();
      } else if (screenName === 'paused') {
        this.renderPausedScreen();
        // Poll on paused too — when another worker resumes, this device should follow
        const sale = Storage.getSale();
        if (typeof Sync !== 'undefined' && Sync.isSynced(sale)) {
          this._stopSyncPoll = Sync.startPolling(sale, 3000, (result) => {
            if (result.saleStatusChanged) this._handleRemoteSaleStatusChange(result.newStatus);
          });
        }
      }

    }
  },

  /**
   * Render the sale-paused screen with stats and next-day info
   */
  renderPausedScreen() {
    const sale = Storage.getSale();
    if (!sale) return;

    const dayNumber = Utils.getSaleDay(sale.startDate, sale);
    const maxDay = Math.max(...Object.keys(sale.discounts || {}).map(Number));
    const nextDay = dayNumber + 1;
    const nextDiscount = Utils.getDiscountForDay(sale, nextDay);

    // Sale name and day label
    const nameEl = document.getElementById('paused-sale-name');
    const dayLabel = document.getElementById('paused-day-label');
    if (nameEl) nameEl.textContent = sale.name;
    if (dayLabel) dayLabel.textContent = `Day ${dayNumber} Complete`;

    // Compute today's stats from transactions
    const allTxns = Storage.getTransactions();
    const saleCreatedAt = new Date(sale.createdAt).getTime();
    const saleTxns = allTxns.filter(txn => new Date(txn.timestamp).getTime() >= saleCreatedAt);

    // Filter to today's non-void transactions
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTxns = saleTxns.filter(txn => {
      if (txn.status === 'void') return false;
      const txnDate = new Date(txn.timestamp);
      txnDate.setHours(0, 0, 0, 0);
      return txnDate.getTime() === today.getTime();
    });

    const orderCount = todayTxns.length;
    const revenue = todayTxns.reduce((sum, txn) => sum + txn.total, 0);
    const avg = orderCount > 0 ? revenue / orderCount : 0;

    const ordersEl = document.getElementById('paused-orders');
    const revenueEl = document.getElementById('paused-revenue');
    const avgEl = document.getElementById('paused-avg');
    if (ordersEl) ordersEl.textContent = orderCount.toString();
    if (revenueEl) revenueEl.textContent = Utils.formatCurrency(revenue);
    if (avgEl) avgEl.textContent = Utils.formatCurrency(avg);

    // Next day info
    const nextEl = document.getElementById('paused-next-text');
    if (nextEl) {
      const isFinalDay = dayNumber >= maxDay;
      if (isFinalDay) {
        nextEl.textContent = `Day ${dayNumber} was the last scheduled day. You can still resume if needed.`;
      } else {
        const discountText = nextDiscount > 0 ? `${nextDiscount}% off` : 'no discount';
        nextEl.textContent = `Resume tomorrow for Day ${nextDay} (${discountText})`;
      }
    }

    // Stale sale nudge (>7 days since start)
    const staleEl = document.getElementById('paused-stale');
    const staleText = document.getElementById('paused-stale-text');
    if (staleEl && staleText) {
      const [year, month, day] = sale.startDate.split('-').map(Number);
      const start = new Date(year, month - 1, day);
      const diffDays = Math.floor((new Date() - start) / (1000 * 60 * 60 * 24));
      if (diffDays > 7) {
        staleText.textContent = `This sale started ${diffDays} days ago. Resume or end it?`;
        staleEl.hidden = false;
      } else {
        staleEl.hidden = true;
      }
    }
  },

  /**
   * Update shared header visibility and active state
   */
  updateHeader(screenName) {
    const sale = Storage.getSale();

    // Hide header on setup and paused screens, or when no sale
    if (screenName === 'setup' || screenName === 'paused' || !sale) {
      if (this.headerElements.header) {
        this.headerElements.header.hidden = true;
      }
      return;
    }

    // Show header
    if (this.headerElements.header) {
      this.headerElements.header.hidden = false;
    }

    // Update header content
    this.updateHeaderContent(sale);

  },

  /**
   * v161: header is now minimal — only the SHARED chip is dynamic.
   * Per-screen identity + state context lives in each screen's content.
   * The menu sheet's saleblock and the dashboard large title use the same
   * data; both refresh from updateHeader so any sale-state change updates
   * everywhere at once.
   */
  updateHeaderContent(sale) {
    if (!sale) return;

    const status = sale.status || 'active';
    const dayNumber = Utils.getSaleDay(sale.startDate, sale);
    const discount = Utils.getDiscountForDay(sale, dayNumber);

    // SHARED chip in the global header
    if (this.headerElements.sharedBadge) {
      this.headerElements.sharedBadge.hidden = !sale.isShared;
    }

    // Build the human-readable meta string used in multiple places.
    // Skip "No discount" when zero — confirms the obvious, takes up space.
    const metaParts = [];
    if (status === 'paused') {
      metaParts.push(`Day ${dayNumber} — Paused`);
    } else if (status === 'ended') {
      metaParts.push(`Day ${dayNumber}`);
    } else {
      metaParts.push(`Day ${dayNumber}`);
    }
    if (discount > 0) metaParts.push(`${discount}% off`);
    if (sale.isShared) metaParts.push('SHARED');
    const metaText = metaParts.join(' · ');

    // Menu sheet sale block
    const menuSaleName = document.getElementById('menu-sale-name');
    const menuSaleMeta = document.getElementById('menu-sale-meta');
    if (menuSaleName) menuSaleName.textContent = sale.name || 'Sale';
    if (menuSaleMeta) menuSaleMeta.textContent = metaText;

    // Dashboard large title block
    const dashTitle = document.getElementById('dashboard-large-title');
    const dashSubtitle = document.getElementById('dashboard-large-subtitle');
    if (dashTitle) dashTitle.textContent = sale.name || 'Sale';
    if (dashSubtitle) dashSubtitle.textContent = metaText;
  },


  // ── Share Sale ──

  /**
   * Open the share sale sheet with QR code and sale code.
   *
   * v157: only the server-assigned share code is used. If the sale was
   * created offline and never synced, we attempt one more sync.createSale
   * here; if that fails too, we surface "Sharing requires internet" so the
   * user knows why nothing's appearing.
   */
  async openShareSaleSheet() {
    const sale = Storage.getSale();
    if (!sale) return;

    this.headerElements.shareSaleModal.classList.add('visible');

    let code = SaleSetup.getShareCode(sale);

    // If we don't have a server share code yet (sale was created offline),
    // try to sync now before giving up.
    if (!code && typeof Sync !== 'undefined') {
      this.headerElements.shareSaleCode.textContent = 'Connecting…';
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
        code = remote.shareCode;
      } catch (err) {
        console.warn('[sync] openShareSaleSheet retry failed:', err.message);
        this.headerElements.shareSaleCode.textContent = 'Offline';
        this.headerElements.shareSaleQr.innerHTML = '<p style="font-size:13px;color:var(--color-text-secondary);text-align:center;padding:var(--space-lg)">Sharing requires internet. Try again once you\'re online.</p>';
        return;
      }
    }

    if (!code) {
      this.headerElements.shareSaleCode.textContent = 'Offline';
      this.headerElements.shareSaleQr.innerHTML = '<p style="font-size:13px;color:var(--color-text-secondary);text-align:center;padding:var(--space-lg)">Sharing requires internet. Try again once you\'re online.</p>';
      return;
    }

    this.headerElements.shareSaleCode.textContent = code;

    // Mark this sale as shared
    sale.isShared = true;
    sale.sharedAt = sale.sharedAt || Utils.getTimestamp();
    Storage.saveSale(sale);

    if (this.headerElements.sharedBadge) {
      this.headerElements.sharedBadge.hidden = false;
    }

    // QR encodes a clean URL with just the share code — phone fetches the
    // full sale config from the backend on join.
    const shareUrl = window.location.origin + '/?join=' + encodeURIComponent(code);

    this.headerElements.shareSaleQr.innerHTML = '';
    if (typeof QRCode !== 'undefined') {
      new QRCode(this.headerElements.shareSaleQr, {
        text: shareUrl,
        width: 200,
        height: 200,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
      });
    }
  },

  /**
   * Close the share sale sheet
   */
  closeShareSaleSheet() {
    this.headerElements.shareSaleModal.classList.remove('visible');
  },

  // ── Join Sale ──

  /**
   * Handle a ?join= URL parameter.
   *
   * Two formats supported:
   *  - v157+: just the 6-char share code (e.g. ?join=ABC123). Full sale
   *    config is fetched from the backend in confirmJoinSale.
   *  - Legacy: base64-encoded JSON with name/startDate/discounts/shareCode.
   *    Kept for backwards compat with invite links from before v157.
   */
  handleJoinUrl(encoded) {
    let data;

    // Detect format: short alphanumeric → new style; everything else → legacy base64
    const isShortCode = /^[A-Z0-9]{4,12}$/.test(encoded);

    if (isShortCode) {
      data = { shareCode: encoded };
    } else {
      try {
        let b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
        while (b64.length % 4) b64 += '=';
        const jsonStr = decodeURIComponent(escape(atob(b64)));
        data = JSON.parse(jsonStr);

        if (!data.name || !data.startDate || !data.discounts) {
          console.error('Invalid join data');
          this.cleanJoinUrl();
          this.routeWithoutJoin();
          return;
        }
      } catch (err) {
        console.error('Could not parse join URL:', err.message);
        this.cleanJoinUrl();
        this.routeWithoutJoin();
        return;
      }
    }

    this.pendingJoinData = data;

    // Show the right screen behind the modal
    const sale = Storage.getSale();
    if (sale) {
      this.showScreen('checkout');
    } else {
      this.showScreen('setup');
    }

    // Show join confirmation. For shortcode-only data, fetch the sale config
    // first so we can show the user the sale name and day/discount. For legacy
    // data, the config is already in the URL.
    if (isShortCode && typeof Sync !== 'undefined') {
      Sync.fetchSaleByCode(data.shareCode).then(remote => {
        // Enrich the pendingJoinData so confirmJoinSale doesn't have to refetch
        this.pendingJoinData = {
          shareCode: remote.shareCode,
          name: remote.name,
          startDate: remote.startDate,
          endDate: remote.endDate,
          discounts: remote.discounts,
          consignors: remote.consignors,
          maxDiscountPercent: remote.maxDiscountPercent,
          _remote: remote
        };
        this.showJoinConfirmation(this.pendingJoinData, !!sale);
      }).catch(err => {
        console.error('[sync] fetchSaleByCode failed:', err.message);
        this.cleanJoinUrl();
        this.routeWithoutJoin();
        alert('Couldn\'t find that sale. The code may be wrong or the sale may have ended.');
      });
    } else {
      this.showJoinConfirmation(data, !!sale);
    }
  },

  /**
   * Show join confirmation sheet
   */
  showJoinConfirmation(data, hasExistingSale) {
    const dayNumber = Utils.getSaleDay(data.startDate);
    const discount = Utils.getDiscountForDay({ discounts: data.discounts }, dayNumber);
    const discountText = discount > 0 ? `${discount}% off today` : 'no discount today';

    this.headerElements.joinSaleTitle.textContent = `Join "${data.name}"?`;
    this.headerElements.joinSaleDesc.textContent = hasExistingSale
      ? `You have an active sale. Joining will replace it. Day ${dayNumber}, ${discountText}.`
      : `Day ${dayNumber}, ${discountText}.`;
    this.headerElements.joinSaleConfirm.textContent = hasExistingSale ? 'Replace & Join' : 'Join Sale';

    this.headerElements.joinSaleModal.classList.add('visible');
  },

  /**
   * Confirm joining the sale.
   * Fetches the full sale config from the backend by share code (the URL only
   * carries the share code); falls back to the legacy in-URL data on network
   * failure or for legacy invite links.
   */
  async confirmJoinSale() {
    const data = this.pendingJoinData;
    if (!data) return;

    this.headerElements.joinSaleModal.classList.remove('visible');

    // End existing sale if present
    const existingSale = Storage.getSale();
    if (existingSale) {
      SaleSetup.endSale();
    }

    // Try to pull the canonical sale config from the backend if we have a share code.
    let saleConfig = null;
    if (data.shareCode && typeof Sync !== 'undefined') {
      try {
        saleConfig = await Sync.fetchSaleByCode(data.shareCode);
      } catch (err) {
        console.warn('[sync] fetchSaleByCode failed, falling back to URL data:', err.message);
      }
    }

    if (saleConfig) {
      // Server-backed: use the canonical config and mark the local sale as synced
      await SaleSetup.createSale({
        id: saleConfig.id,
        name: saleConfig.name,
        startDate: saleConfig.startDate,
        endDate: saleConfig.endDate,
        discounts: saleConfig.discounts || [],
        consignors: saleConfig.consignors || [],
        maxDiscountPercent: saleConfig.maxDiscountPercent,
        shareCode: saleConfig.shareCode,
        isShared: true,
        sharedAt: Utils.getTimestamp(),
        _synced: true
      });
    } else {
      // Fallback: legacy in-URL config (pre-v156 invite links)
      await SaleSetup.createSale({
        name: data.name,
        startDate: data.startDate,
        discounts: data.discounts,
        shareCode: data.shareCode || null,
        isShared: true,
        sharedAt: Utils.getTimestamp(),
        maxDiscountPercent: data.maxDiscountPercent || null
      });
    }

    this.pendingJoinData = null;
    this.cleanJoinUrl();

    // Navigate to checkout
    Checkout.loadSale();
    this.showScreen('checkout');
  },

  /**
   * Cancel joining the sale
   */
  cancelJoinSale() {
    this.pendingJoinData = null;
    this.headerElements.joinSaleModal.classList.remove('visible');
    this.cleanJoinUrl();
    this.routeWithoutJoin();
  },

  /**
   * Show the join instruction sheet (from setup screen button)
   */
  showJoinInstruction() {
    this.headerElements.joinInstructionModal.classList.add('visible');
  },

  /**
   * Clean the ?join= parameter from the URL
   */
  cleanJoinUrl() {
    window.history.replaceState({}, '', window.location.pathname);
  },

  /**
   * Route normally (without join parameter)
   */
  routeWithoutJoin() {
    const sale = Storage.getSale();
    if (!sale) {
      this.showScreen('setup');
      return;
    }
    const status = sale.status || 'active';
    if (status === 'paused') {
      this.showScreen('paused');
    } else if (status === 'active') {
      this.showScreen('checkout');
    } else if (status === 'ended') {
      this.showScreen('dashboard');
    } else {
      this.showScreen('setup');
    }
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

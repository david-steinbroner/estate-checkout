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
    this.cacheHeaderElements();
    this.bindHeaderEvents();
    this.bindCartBanner();
    this.initModules();
    this.route();

    // Show onboarding walkthrough on first launch
    if (Onboarding.shouldShow()) {
      Onboarding.show('single');
    }
  },

  // Pending join data (from URL parameter, awaiting user confirmation)
  pendingJoinData: null,

  /**
   * Cache shared header element references
   */
  cacheHeaderElements() {
    this.headerElements = {
      header: document.getElementById('sale-header'),
      saleName: document.getElementById('sale-name'),
      saleDay: document.getElementById('sale-day'),
      discountBadge: document.getElementById('discount-badge'),
      sharedBadge: document.getElementById('shared-badge'),
      menuBtn: document.getElementById('nav-menu'),
      // Header menu sheet
      menuModal: document.getElementById('header-menu-modal'),
      menuDashboard: document.getElementById('menu-dashboard'),
      menuScan: document.getElementById('menu-scan'),
      menuShare: document.getElementById('menu-share'),
      menuEndDay: document.getElementById('menu-end-day'),
      menuEndSale: document.getElementById('menu-end-sale'),
      menuCancel: document.getElementById('menu-cancel'),
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
      setupMenuHow: document.getElementById('setup-menu-how'),
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
    if (this.headerElements.setupMenuHow) {
      this.headerElements.setupMenuHow.addEventListener('click', () => {
        this.headerElements.setupMenuModal.classList.remove('visible');
        Onboarding.show('single');
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
      <div class="edit-sale__label">Discount Schedule</div>`;
    days.forEach(d => {
      const isCompleted = d <= currentDay;
      const removeClass = isCompleted ? 'edit-sale__remove edit-sale__remove--disabled' : 'edit-sale__remove';
      html += `<div class="edit-sale__row">
        <span class="edit-sale__row-label">Day ${d}</span>
        <span class="edit-sale__row-value" data-edit-discount="${d}">${discounts[d]}%</span>
        <button class="${removeClass}" data-remove-day="${d}" ${isCompleted ? 'aria-disabled="true"' : ''}>&times;</button>
      </div>`;
    });
    html += `<button class="edit-sale__add-day" id="edit-sale-add-day">+ Add Day</button>`;
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
  },

  /**
   * Show end sale confirmation dialog
   */
  showEndSaleConfirm() {
    if (this.headerElements.endSaleConfirmModal) {
      this.headerElements.endSaleConfirmModal.classList.add('visible');
    }
  },

  /**
   * End the current day (pause sale)
   */
  endDay() {
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
   * Register service worker for offline support
   */
  registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;

    // Auto-reload when a new service worker takes control
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    navigator.serviceWorker.register('/sw.js')
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
    Onboarding.init();
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
    } else {
      // ended or unknown → setup
      this.showScreen('setup');
    }
  },

  /**
   * Bind the cart banner click handler
   */
  bindCartBanner() {
    const banner = document.getElementById('cart-banner');
    if (banner) {
      banner.addEventListener('click', () => this.showScreen('checkout'));
    }
  },

  /**
   * Show or hide the order-in-progress banner based on cart state and current screen
   */
  updateCartBanner() {
    const banner = document.getElementById('cart-banner');
    const bannerText = document.getElementById('cart-banner-text');
    if (!banner || !bannerText) return;

    const hasItems = Checkout.items && Checkout.items.length > 0;
    const hideBanner = this.currentScreen === 'checkout' || this.currentScreen === 'qr' || this.currentScreen === 'payment';

    if (hasItems && !hideBanner) {
      const count = Checkout.items.length;
      const subtotal = Checkout.items.reduce((sum, item) => sum + item.finalPrice, 0);
      const total = Utils.applyTicketDiscount(subtotal, Checkout.ticketDiscount);
      const itemWord = count === 1 ? 'item' : 'items';
      bannerText.innerHTML = `Order in progress · ${count} ${itemWord} · ${Utils.formatCurrency(total)} <span class="cart-banner__hint">tap to edit</span>`;
      banner.hidden = false;
    } else {
      banner.hidden = true;
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
      } else if (screenName === 'paused') {
        this.renderPausedScreen();
      }

      // Update cart banner visibility
      this.updateCartBanner();
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
   * Update header content with sale info
   */
  updateHeaderContent(sale) {
    if (!sale) return;

    const status = sale.status || 'active';
    const dayNumber = Utils.getSaleDay(sale.startDate, sale);
    const discount = Utils.getDiscountForDay(sale, dayNumber);

    if (this.headerElements.saleName) {
      this.headerElements.saleName.textContent = sale.name;
    }
    if (this.headerElements.saleDay) {
      if (status === 'paused') {
        this.headerElements.saleDay.textContent = `Day ${dayNumber} — Paused`;
      } else {
        this.headerElements.saleDay.textContent = `Day ${dayNumber}`;
      }
    }
    if (this.headerElements.discountBadge) {
      if (discount > 0) {
        this.headerElements.discountBadge.textContent = `${discount}% off`;
        this.headerElements.discountBadge.classList.remove('header__discount--none');
      } else {
        this.headerElements.discountBadge.textContent = 'No discount';
        this.headerElements.discountBadge.classList.add('header__discount--none');
      }
    }

    // Shared badge
    if (this.headerElements.sharedBadge) {
      this.headerElements.sharedBadge.hidden = !sale.isShared;
    }
  },


  // ── Share Sale ──

  /**
   * Open the share sale sheet with QR code and sale code
   */
  openShareSaleSheet() {
    const sale = Storage.getSale();
    if (!sale) return;

    // Generate share code (persists on first call)
    const code = SaleSetup.generateShareCode(sale);
    this.headerElements.shareSaleCode.textContent = code;

    // Update shared badge since we just set isShared
    if (this.headerElements.sharedBadge) {
      this.headerElements.sharedBadge.hidden = false;
    }

    // Generate QR code with share URL
    const shareData = SaleSetup.getShareData(sale);
    const jsonStr = JSON.stringify(shareData);
    const base64 = btoa(unescape(encodeURIComponent(jsonStr)));
    const urlSafe = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const shareUrl = window.location.origin + '/?join=' + urlSafe;

    // Render QR
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

    this.headerElements.shareSaleModal.classList.add('visible');
  },

  /**
   * Close the share sale sheet
   */
  closeShareSaleSheet() {
    this.headerElements.shareSaleModal.classList.remove('visible');
  },

  // ── Join Sale ──

  /**
   * Handle a ?join= URL parameter
   */
  handleJoinUrl(encoded) {
    try {
      // Restore standard base64 from URL-safe format
      let b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';
      const jsonStr = decodeURIComponent(escape(atob(b64)));
      const data = JSON.parse(jsonStr);

      if (!data.name || !data.startDate || !data.discounts) {
        console.error('Invalid join data');
        this.cleanJoinUrl();
        this.routeWithoutJoin();
        return;
      }

      this.pendingJoinData = data;

      // Show the right screen behind the modal
      const sale = Storage.getSale();
      if (sale) {
        this.showScreen('checkout');
      } else {
        this.showScreen('setup');
      }

      // Show join confirmation
      this.showJoinConfirmation(data, !!sale);
    } catch (e) {
      console.error('Failed to parse join data:', e);
      this.cleanJoinUrl();
      this.routeWithoutJoin();
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
   * Confirm joining the sale
   */
  confirmJoinSale() {
    const data = this.pendingJoinData;
    if (!data) return;

    this.headerElements.joinSaleModal.classList.remove('visible');

    // End existing sale if present
    const existingSale = Storage.getSale();
    if (existingSale) {
      SaleSetup.endSale();
    }

    // Create new sale from shared config
    SaleSetup.createSale({
      name: data.name,
      startDate: data.startDate,
      discounts: data.discounts,
      shareCode: data.shareCode || null,
      isShared: true,
      sharedAt: Utils.getTimestamp(),
      maxDiscountPercent: data.maxDiscountPercent || null
    });

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
    } else {
      this.showScreen('setup');
    }
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

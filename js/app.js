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
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }
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
    }
  },

  /**
   * Render the sale-paused screen with stats and next-day info
   */
  renderPausedScreen() {
    const sale = Storage.getSale();
    if (!sale) return;

    const dayNumber = Utils.getSaleDay(sale.startDate);
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
    const dayNumber = Utils.getSaleDay(sale.startDate);
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

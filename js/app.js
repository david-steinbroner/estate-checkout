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

  /**
   * Cache shared header element references
   */
  cacheHeaderElements() {
    this.headerElements = {
      header: document.getElementById('sale-header'),
      saleName: document.getElementById('sale-name'),
      saleDay: document.getElementById('sale-day'),
      discountBadge: document.getElementById('discount-badge'),
      dashboardBtn: document.getElementById('nav-dashboard'),
      collectBtn: document.getElementById('nav-collect'),
      endSaleBtn: document.getElementById('nav-end-sale'),
      endSaleModal: document.getElementById('end-sale-modal'),
      endSaleCancel: document.getElementById('end-sale-cancel'),
      endSaleConfirm: document.getElementById('end-sale-confirm'),
      endDayConfirm: document.getElementById('end-day-confirm'),
      endDayDesc: document.getElementById('end-day-desc')
    };
  },

  /**
   * Bind shared header event listeners
   */
  bindHeaderEvents() {
    // Dashboard button
    if (this.headerElements.dashboardBtn) {
      this.headerElements.dashboardBtn.addEventListener('click', () => {
        this.showScreen('dashboard');
      });
    }

    // Collect Payments button
    if (this.headerElements.collectBtn) {
      this.headerElements.collectBtn.addEventListener('click', () => {
        this.showScreen('scan');
      });
    }

    // End Sale button
    if (this.headerElements.endSaleBtn) {
      this.headerElements.endSaleBtn.addEventListener('click', () => {
        this.showEndSaleModal();
      });
    }

    // End sale modal events
    if (this.headerElements.endSaleCancel) {
      this.headerElements.endSaleCancel.addEventListener('click', () => {
        this.hideEndSaleModal();
      });
    }

    if (this.headerElements.endSaleConfirm) {
      this.headerElements.endSaleConfirm.addEventListener('click', (e) => {
        e.stopPropagation();
        this.endSale();
      });
    }

    // End Day button
    if (this.headerElements.endDayConfirm) {
      this.headerElements.endDayConfirm.addEventListener('click', (e) => {
        e.stopPropagation();
        this.endDay();
      });
    }

    if (this.headerElements.endSaleModal) {
      this.headerElements.endSaleModal.addEventListener('click', (e) => {
        if (e.target === this.headerElements.endSaleModal) {
          this.hideEndSaleModal();
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
      pausedDashboard.addEventListener('click', () => {
        this.showScreen('dashboard');
      });
    }

    if (pausedEndSale) {
      pausedEndSale.addEventListener('click', () => {
        this.endSale();
      });
    }
  },

  /**
   * Show end day / end sale modal with dynamic content
   */
  showEndSaleModal() {
    const sale = Storage.getSale();
    if (!sale || !this.headerElements.endSaleModal) return;

    const dayNumber = Utils.getSaleDay(sale.startDate);
    const maxDay = Math.max(...Object.keys(sale.discounts || {}).map(Number));
    const isFinalDay = dayNumber >= maxDay;
    const nextDay = dayNumber + 1;
    const nextDiscount = Utils.getDiscountForDay(sale, nextDay);

    // Update End Day button text
    if (this.headerElements.endDayConfirm) {
      const finalLabel = isFinalDay ? ' (Final Day)' : '';
      this.headerElements.endDayConfirm.textContent = `End Day ${dayNumber}${finalLabel}`;
    }

    // Update End Day description
    if (this.headerElements.endDayDesc) {
      if (isFinalDay) {
        this.headerElements.endDayDesc.textContent = 'Close out for today. This is the last scheduled day — you can still resume if needed.';
      } else {
        const discountText = nextDiscount > 0 ? `${nextDiscount}% off` : 'no discount';
        this.headerElements.endDayDesc.textContent = `Close out for today. Resume tomorrow for Day ${nextDay} (${discountText}).`;
      }
    }

    this.headerElements.endSaleModal.classList.add('visible');
  },

  /**
   * Hide end sale confirmation modal
   */
  hideEndSaleModal() {
    if (this.headerElements.endSaleModal) {
      this.headerElements.endSaleModal.classList.remove('visible');
    }
  },

  /**
   * End the current day (pause sale)
   */
  endDay() {
    this.hideEndSaleModal();
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
    this.hideEndSaleModal();
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

    // Update active button state
    this.updateActiveNavButton(screenName);
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
  },

  /**
   * Update which nav button is active
   */
  updateActiveNavButton(screenName) {
    // Remove active from all buttons
    const buttons = [
      this.headerElements.dashboardBtn,
      this.headerElements.collectBtn,
      this.headerElements.endSaleBtn
    ];

    buttons.forEach(btn => {
      if (btn) btn.classList.remove('header__btn--active');
    });

    // Set active based on screen
    if (screenName === 'dashboard' && this.headerElements.dashboardBtn) {
      this.headerElements.dashboardBtn.classList.add('header__btn--active');
    } else if ((screenName === 'scan' || screenName === 'payment') && this.headerElements.collectBtn) {
      this.headerElements.collectBtn.classList.add('header__btn--active');
    }
    // checkout and qr don't have an active button (they're the main flow)
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

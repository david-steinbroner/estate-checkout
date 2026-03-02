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

    console.log('Estate Checkout initialized');
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
      endSaleConfirm: document.getElementById('end-sale-confirm')
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

    if (this.headerElements.endSaleModal) {
      this.headerElements.endSaleModal.addEventListener('click', (e) => {
        if (e.target === this.headerElements.endSaleModal) {
          this.hideEndSaleModal();
        }
      });
    }
  },

  /**
   * Show end sale confirmation modal
   */
  showEndSaleModal() {
    if (this.headerElements.endSaleModal) {
      this.headerElements.endSaleModal.classList.add('visible');
    }
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
   * End the current sale (called from shared header)
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
        .then((registration) => {
          console.log('Service Worker registered:', registration.scope);
        })
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
  },

  /**
   * Route to appropriate screen based on app state
   */
  route() {
    const sale = Storage.getSale();

    if (sale) {
      // Active sale exists → go to checkout
      this.showScreen('checkout');
    } else {
      // No active sale → show setup
      this.showScreen('setup');
    }
  },

  /**
   * Switch to a different screen
   */
  showScreen(screenName, data) {
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
        Dashboard.render(data);
      }
    }
  },

  /**
   * Update shared header visibility and active state
   */
  updateHeader(screenName) {
    const sale = Storage.getSale();

    // Hide header on setup screen or when no sale
    if (screenName === 'setup' || !sale) {
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

    const dayNumber = Utils.getSaleDay(sale.startDate);
    const discount = Utils.getDiscountForDay(sale, dayNumber);

    if (this.headerElements.saleName) {
      this.headerElements.saleName.textContent = sale.name;
    }
    if (this.headerElements.saleDay) {
      this.headerElements.saleDay.textContent = `Day ${dayNumber}`;
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

/**
 * app.js - Main Application Entry Point for Estate Checkout
 * Handles initialization, routing, and service worker registration
 */

const App = {
  currentScreen: null,

  /**
   * Initialize the application
   */
  init() {
    this.registerServiceWorker();
    this.initModules();
    this.route();

    console.log('Estate Checkout initialized');
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
    console.log('App.showScreen() called with:', screenName);

    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
      screen.classList.remove('active');
    });

    // Show target screen
    const targetScreen = document.getElementById(`screen-${screenName}`);
    console.log('Target screen element:', targetScreen);

    if (targetScreen) {
      targetScreen.classList.add('active');
      this.currentScreen = screenName;
      console.log('Screen switched to:', screenName);

      // Handle screen-specific initialization
      if (screenName === 'checkout') {
        Checkout.loadSale();
        Checkout.render();
      } else if (screenName === 'setup') {
        console.log('Calling SaleSetup.resetForm()');
        SaleSetup.resetForm();
        console.log('SaleSetup.resetForm() complete');
      }
    } else {
      console.error('Screen not found:', `screen-${screenName}`);
    }
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

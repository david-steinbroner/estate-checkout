/**
 * app.js - Main Application Entry Point for Estate Checkout
 * Handles initialization, routing, and service worker registration
 */

const App = {
  currentScreen: 'checkout',

  /**
   * Initialize the application
   */
  init() {
    this.registerServiceWorker();
    this.initModules();

    // If no sale exists, create a demo sale for testing
    if (!Storage.getSale()) {
      SaleSetup.createDemoSale();
    }

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
    Checkout.init();
    Speech.init();
    QR.init();
    SaleSetup.init();
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

      // Handle screen-specific initialization
      if (screenName === 'checkout') {
        Checkout.loadSale();
        Checkout.render();
      }
      // TODO: Handle other screens
    }
  }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

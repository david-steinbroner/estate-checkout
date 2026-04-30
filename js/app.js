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
    // v212: capture beforeinstallprompt as early as possible — needs to be
    // attached before the browser fires it on page load. SW registration and
    // module init can happen after.
    this._initInstallFlow();
    this.registerServiceWorker();
    if (typeof Sync !== 'undefined') Sync.init();
    this.cacheHeaderElements();
    this.bindHeaderEvents();
    this._bindPayoutTypePicker();
    this._bindEndSaleConfirmInput();
    // v203: hash routing — listen for browser back / iOS swipe-from-edge.
    window.addEventListener('popstate', this._onPopState.bind(this));
    this.initModules();
    this.route();
    // After everything's wired, refresh install affordances so the
    // notification dot + row visibility reflect current state.
    this._refreshInstallAffordances();
},

  // === v212: PWA install + update flow ===

  _INSTALL_SEEN_KEY: 'estate_install_seen',
  _WAS_INSTALLED_KEY: 'estate_was_installed',

  /** Captured browser-fired beforeinstallprompt event (Chromium only). */
  _beforeInstallPromptEvent: null,

  _initInstallFlow() {
    // Capture the install prompt event so we can fire it later from our
    // menu row. Only Chromium-based browsers (Android Chrome, desktop
    // Chrome/Edge) emit this. Safari has no equivalent — we fall back
    // to instructions.
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this._beforeInstallPromptEvent = e;
      this._refreshInstallAffordances();
    });

    // When the user installs, persist the "seen" flag and refresh UI.
    window.addEventListener('appinstalled', () => {
      this._markInstallSeen();
      try { localStorage.setItem(this._WAS_INSTALLED_KEY, '1'); } catch (e) {}
      this._beforeInstallPromptEvent = null;
      this._refreshInstallAffordances();
    });

    // Standalone vs uninstall detection (v213).
    //   - Standalone now → mark seen + remember we were installed.
    //   - Not standalone now BUT was previously installed → user uninstalled.
    //     Clear the seen flag so the notification dot returns and the install
    //     entry pulls them back in. Without this, a user who uninstalls would
    //     never get re-prompted to reinstall.
    if (this._isStandalone()) {
      this._markInstallSeen();
      try { localStorage.setItem(this._WAS_INSTALLED_KEY, '1'); } catch (e) {}
    } else {
      try {
        if (localStorage.getItem(this._WAS_INSTALLED_KEY) === '1') {
          localStorage.removeItem(this._INSTALL_SEEN_KEY);
          localStorage.removeItem(this._WAS_INSTALLED_KEY);
        }
      } catch (e) {}
    }
  },

  _isStandalone() {
    return window.navigator.standalone === true
      || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
  },

  _isIOSSafari() {
    return this._detectBrowser() === 'safari' && this._detectPlatform() === 'ios';
  },

  /**
   * Identify the user's browser. Order matters because most browsers also
   * advertise "Safari" in the UA (the WebKit engine identifier).
   */
  _detectBrowser() {
    const ua = navigator.userAgent || '';
    if (/EdgiOS|Edg\//.test(ua)) return 'edge';
    if (/OPR\/|Opera\//.test(ua)) return 'opera';
    if (/SamsungBrowser/.test(ua)) return 'samsung';
    if (/CriOS|Chrome\//.test(ua)) return 'chrome';
    if (/FxiOS|Firefox\//.test(ua)) return 'firefox';
    if (/Safari\//.test(ua)) return 'safari';
    return 'other';
  },

  /**
   * Identify the user's platform. iPadOS 13+ pretends to be macOS in the UA
   * but exposes touch — handle that case so iPad users get iOS instructions.
   */
  _detectPlatform() {
    const ua = navigator.userAgent || '';
    if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
    if (/Mac/.test(ua) && navigator.maxTouchPoints > 1) return 'ios';
    if (/Android/.test(ua)) return 'android';
    if (/Mac/.test(ua)) return 'mac';
    if (/Windows/.test(ua)) return 'windows';
    if (/Linux/.test(ua)) return 'linux';
    return 'other';
  },

  _markInstallSeen() {
    try { localStorage.setItem(this._INSTALL_SEEN_KEY, '1'); } catch (e) {}
  },

  _isInstallSeen() {
    try { return localStorage.getItem(this._INSTALL_SEEN_KEY) === '1'; }
    catch (e) { return false; }
  },

  /**
   * Refresh visibility of install rows + notification dots based on:
   *   - Whether the app is already installed (standalone) — hide rows
   *   - Whether the install path has been seen (flag set) — hide dots
   *
   * Called on init, on appinstalled, and after the user taps the install row.
   */
  _refreshInstallAffordances() {
    const standalone = this._isStandalone();
    const seen = standalone || this._isInstallSeen();

    ['menu-add-to-home', 'setup-menu-add-to-home'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.hidden = standalone;
    });

    ['menu-add-to-home-badge', 'setup-menu-add-to-home-badge'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.hidden = seen;
    });

    document.querySelectorAll('.screen-menu-btn').forEach(btn => {
      btn.classList.toggle('has-notification', !seen);
    });
  },

  /**
   * User tapped "Add to Home Screen". Branches by platform:
   *   - Native install prompt available (Chromium) → fire it directly
   *   - iOS Safari → open the instructions modal with iOS-specific steps
   *   - Anything else → open the modal with generic copy
   *
   * Marks the seen flag regardless of outcome so the notification dot
   * vanishes after one tap.
   */
  _handleAddToHomeScreen() {
    this._markInstallSeen();
    this._refreshInstallAffordances();

    if (this._beforeInstallPromptEvent) {
      const evt = this._beforeInstallPromptEvent;
      evt.prompt();
      evt.userChoice.then(() => { this._beforeInstallPromptEvent = null; });
      return;
    }

    this._openInstallInstructions();
  },

  _openInstallInstructions() {
    const modal = document.getElementById('install-instructions-modal');
    const content = document.getElementById('install-instructions-content');
    if (!modal || !content) return;

    const data = this._getInstallInstructions();
    let html = '';
    if (data.heading) {
      html += `<p class="sheet__text">${data.heading}</p>`;
    }
    if (data.steps && data.steps.length > 0) {
      html += `<ol class="install-steps">${data.steps.map(s => `<li>${s}</li>`).join('')}</ol>`;
    }
    if (data.footer) {
      html += `<p class="sheet__text">${data.footer}</p>`;
    }
    content.innerHTML = html;

    modal.classList.add('visible');
  },

  /**
   * Browser/platform-aware install instructions. Returns
   *   { heading: string, steps: string[], footer: string }
   * so the renderer can build the modal contents from a single data shape.
   *
   * Intentionally specific — non-technical users don't want generic "use
   * your browser's menu" copy when we know the browser. Each branch names
   * the actual menu item or button to look for.
   */
  _getInstallInstructions() {
    const browser = this._detectBrowser();
    const platform = this._detectPlatform();
    const shareIcon = '<span class="install-share-icon" aria-hidden="true"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v8"/><path d="M5 5l3-3 3 3"/><path d="M3 8v5a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V8"/></svg></span>';

    // iOS Safari (iPhone, iPad)
    if (platform === 'ios' && browser === 'safari') {
      return {
        heading: 'Open this app on your home screen — no Safari bar at the top, faster, works offline.',
        steps: [
          `Tap the ${shareIcon} <strong>Share</strong> button at the bottom of Safari.`,
          `Scroll down and tap <strong>Add to Home Screen</strong>.`,
          `Tap <strong>Add</strong> in the top-right.`
        ],
        footer: `Then open the new icon on your home screen — that's the full app experience.`
      };
    }

    // iOS but a non-Safari browser — Chrome / Firefox / Edge on iPhone are
    // all Safari engine wrappers, but only Safari can actually install a
    // PWA on iOS. Send the user to Safari.
    if (platform === 'ios') {
      return {
        heading: 'On iPhone, only Safari can add this app to your home screen.',
        steps: [
          `Open <strong>Safari</strong> (the blue compass icon).`,
          `Go to this same page in Safari.`,
          `Tap the ${shareIcon} <strong>Share</strong> button → <strong>Add to Home Screen</strong>.`
        ],
        footer: ''
      };
    }

    // Android — most browsers support installing
    if (platform === 'android') {
      if (browser === 'chrome' || browser === 'samsung') {
        return {
          heading: 'Add this app to your home screen — opens like a real app, no browser bar.',
          steps: [
            `Tap the three-dots menu (top-right of Chrome).`,
            `Tap <strong>Add to Home screen</strong> or <strong>Install app</strong>.`,
            `Tap <strong>Install</strong>.`
          ],
          footer: `Then open the new icon on your home screen.`
        };
      }
      if (browser === 'firefox') {
        return {
          heading: 'Add this app to your home screen.',
          steps: [
            `Tap the three-dots menu (bottom-right of Firefox).`,
            `Tap <strong>Install</strong>.`
          ],
          footer: ''
        };
      }
      if (browser === 'edge') {
        return {
          heading: 'Add this app to your home screen.',
          steps: [
            `Tap the menu (bottom-right of Edge).`,
            `Tap <strong>Apps</strong> → <strong>Install this site as an app</strong>.`,
            `Tap <strong>Install</strong>.`
          ],
          footer: ''
        };
      }
      if (browser === 'opera') {
        return {
          heading: 'Add this app to your home screen.',
          steps: [
            `Tap the Opera menu.`,
            `Tap <strong>Add to Home screen</strong>.`
          ],
          footer: ''
        };
      }
      return {
        heading: 'Add this app to your home screen via your browser\'s menu.',
        steps: [
          `Open your browser's menu.`,
          `Look for <strong>Add to Home screen</strong> or <strong>Install app</strong>.`,
          `Confirm the install.`
        ],
        footer: ''
      };
    }

    // Desktop browsers
    if (browser === 'chrome') {
      return {
        heading: 'Install this app on your computer — opens in its own window, no browser bar.',
        steps: [
          `Look for the install icon in the address bar (a small computer with a download arrow on the right side).`,
          `Or click the three-dots menu (top-right) → <strong>Install Estate Checkout</strong>.`,
          `Click <strong>Install</strong>.`
        ],
        footer: ''
      };
    }
    if (browser === 'edge') {
      return {
        heading: 'Install this app on your computer.',
        steps: [
          `Click the three-dots menu (top-right of Edge).`,
          `Click <strong>Apps</strong> → <strong>Install this site as an app</strong>.`,
          `Click <strong>Install</strong>.`
        ],
        footer: ''
      };
    }
    if (browser === 'opera') {
      return {
        heading: 'Install this app on your computer.',
        steps: [
          `Look for the install icon in the address bar.`,
          `Or open the Opera menu → <strong>Install Estate Checkout</strong>.`,
          `Click <strong>Install</strong>.`
        ],
        footer: ''
      };
    }
    if (browser === 'safari' && platform === 'mac') {
      return {
        heading: 'Add this app to your Dock (requires macOS Sonoma or later).',
        steps: [
          `Click the <strong>File</strong> menu in Safari.`,
          `Click <strong>Add to Dock…</strong>.`,
          `Click <strong>Add</strong>.`
        ],
        footer: 'On older macOS versions, this option isn\'t available. Try Chrome or Edge instead.'
      };
    }
    if (browser === 'firefox') {
      return {
        heading: 'Firefox on desktop doesn\'t support installing this site as an app.',
        steps: [],
        footer: 'For the full app experience, open this page in Chrome, Edge, or Safari.'
      };
    }

    // Generic fallback
    return {
      heading: 'Install this app on your device.',
      steps: [
        `Open your browser's menu.`,
        `Look for <strong>Install app</strong>, <strong>Add to Home Screen</strong>, or similar.`
      ],
      footer: ''
    };
  },

  _closeInstallInstructions() {
    const modal = document.getElementById('install-instructions-modal');
    if (modal) modal.classList.remove('visible');
  },

  /**
   * User tapped "Check for Updates". Forces a service-worker fetch + label
   * flip for feedback. If a new SW activates, the existing controllerchange
   * handler reloads the page automatically. Otherwise we briefly flip the
   * row label to "✓ Up to date (vXXX)".
   */
  async _handleCheckForUpdates(labelEl) {
    if (!labelEl) return;
    const original = labelEl.textContent;
    labelEl.textContent = 'Checking…';

    if (!('serviceWorker' in navigator)) {
      labelEl.textContent = 'Updates not supported';
      setTimeout(() => { labelEl.textContent = original; }, 2000);
      return;
    }

    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        labelEl.textContent = 'Updates not supported';
        setTimeout(() => { labelEl.textContent = original; }, 2000);
        return;
      }
      await reg.update();
      // If a new SW activates, controllerchange fires and reloads. Wait a
      // beat; if no reload happens, we're already current.
      setTimeout(() => {
        const versionLabel = (typeof APP_VERSION !== 'undefined') ? ` (${APP_VERSION})` : '';
        labelEl.textContent = `✓ Up to date${versionLabel}`;
        setTimeout(() => { labelEl.textContent = original; }, 2000);
      }, 1200);
    } catch (err) {
      console.warn('[updates] check failed:', err.message);
      labelEl.textContent = original;
    }
  },

  // === v203 Hash Routing ===

  /** Screens that get a stable URL fragment. Transient screens (qr/scan/payment)
   *  hold in-memory state that doesn't survive a reload, so they don't get URLs. */
  _HASH_ROUTES: ['setup', 'checkout', 'dashboard', 'paused', 'payouts', 'past-sales', 'past-sale-detail'],

  /** Routes whose URL carries a required id segment (e.g. #/past-sales/<archiveId>). */
  _ID_ROUTES: ['past-sale-detail'],

  /** Transient screens — no hash representation. iOS swipe-back from these
   *  bounces to the underlying screen via a synthetic history entry. */
  _TRANSIENT_SCREENS: ['qr', 'scan', 'payment'],

  /** Tracks the most recently shown hash so we can restore it after a
   *  modal-close-on-back gesture (modals don't get history entries; closing
   *  one in response to popstate consumes the back without navigating). */
  _currentHash: null,

  /**
   * Parse `location.hash` into `{ screen, id } | null`.
   * Hash format: `#/<screen>` or `#/<screen>/<id>`.
   */
  _parseHash(hash) {
    if (!hash || !hash.startsWith('#/')) return null;
    const parts = hash.slice(2).split('/').filter(Boolean);
    if (parts.length === 0) return null;
    const screen = parts[0];
    const id = parts.length > 1 ? parts.slice(1).join('/') : null;
    if (!this._HASH_ROUTES.includes(screen)) return null;
    if (this._ID_ROUTES.includes(screen) && !id) return null;
    return { screen, id };
  },

  /**
   * Build a hash for a screen + optional data. Returns null for screens that
   * don't get URLs (transient) or for malformed inputs.
   * Only id-bearing routes reflect `data` into the URL — other call sites
   * can pass `data` as opaque payload without polluting the hash.
   */
  _buildHash(screen, data) {
    if (!this._HASH_ROUTES.includes(screen)) return null;
    if (this._ID_ROUTES.includes(screen)) {
      if (typeof data === 'string' && data) return `#/${screen}/${data}`;
      return null;
    }
    return `#/${screen}`;
  },

  /**
   * Is this hash target valid for the current sale state? Used to gate
   * cold-load deep links (e.g. `#/checkout` requires an active sale).
   */
  _isHashTargetValid(parsed) {
    if (!parsed) return false;
    const sale = Storage.getSale();
    const status = sale ? (sale.status || 'active') : null;
    switch (parsed.screen) {
      case 'setup': return true;
      case 'checkout': return !!sale && status === 'active';
      case 'paused': return !!sale && status === 'paused';
      case 'dashboard': return !!sale;
      case 'payouts': return !!sale && Array.isArray(sale.consignors) && sale.consignors.length > 0;
      case 'past-sales': return true;
      case 'past-sale-detail': return true; // PastSales.renderDetail validates the archiveId
      default: return false;
    }
  },

  /** What `App.route()` would pick if there were no hash. */
  _defaultRoute() {
    const sale = Storage.getSale();
    if (!sale) return { screen: 'setup', id: null };
    const status = sale.status || 'active';
    if (status === 'paused') return { screen: 'paused', id: null };
    if (status === 'ended') return { screen: 'dashboard', id: null };
    return { screen: 'checkout', id: null };
  },

  /**
   * popstate listener. Fires for browser back/forward and iOS swipe gestures.
   *
   * Order of operations:
   *   1. If any modal is visible, close it and re-push the current hash so
   *      the back gesture is consumed by the modal close — not propagated to
   *      a screen change.
   *   2. If the popped state has `transient` set, route back to the underlying
   *      screen (we entered a QR/Scan/Payment screen and the user is going back).
   *   3. Otherwise, parse the new hash and route to it.
   */
  _onPopState(event) {
    if (this._closeAllModals()) {
      // The back gesture consumed the modal close. Re-push the screen's hash
      // so the back-stack stays consistent (the popped entry was the
      // pre-modal state — we want to stay on the current screen).
      if (this._currentHash) {
        history.pushState(null, '', this._currentHash);
      }
      return;
    }

    if (event.state && event.state.transient) {
      // We just popped the synthetic state pushed when we navigated to a
      // transient screen. Bounce back to the underlying default screen.
      const target = this._defaultRoute();
      this.showScreen(target.screen, target.id, { fromPopstate: true });
      return;
    }

    const parsed = this._parseHash(location.hash);
    if (parsed && this._isHashTargetValid(parsed)) {
      this.showScreen(parsed.screen, parsed.id, { fromPopstate: true });
      return;
    }

    // Hash is empty, malformed, or invalid for current state — fall back.
    const target = this._defaultRoute();
    const targetHash = this._buildHash(target.screen, target.id) || '';
    if (targetHash && targetHash !== location.hash) {
      history.replaceState(null, '', targetHash);
    }
    this.showScreen(target.screen, target.id, { fromPopstate: true });
  },

  /**
   * Sync the URL hash to the screen we just navigated to. Called by showScreen
   * for non-popstate navigation. Skips push for transient screens (synthetic
   * state instead) and for redundant pushes (current hash already matches).
   */
  _syncHashToScreen(screenName, data, replace) {
    if (this._TRANSIENT_SCREENS.includes(screenName)) {
      // Push a synthetic state so iOS swipe-back has something to pop. The
      // actual hash doesn't change — the user remains "on" the underlying
      // screen as far as URLs are concerned.
      history.pushState({ transient: screenName }, '');
      return;
    }
    const newHash = this._buildHash(screenName, data);
    if (!newHash) return;
    if (newHash === location.hash && !replace) return; // skip redundant
    if (replace) {
      history.replaceState(null, '', newHash);
    } else {
      history.pushState(null, '', newHash);
    }
    this._currentHash = newHash;
  },

  /**
   * Close every visible modal/sheet. Returns true if any were closed.
   * Used by popstate to consume the back gesture as a modal-close.
   *
   * Edit-Sale modal has a blur-trap (closeEditSale refuses to close mid-edit
   * to give the user a chance to confirm); we honor it by blurring active
   * input first before forcing the close — same behavior the user gets from
   * tapping outside while editing.
   */
  _closeAllModals() {
    let closed = false;
    const modalIds = [
      'header-menu-modal', 'setup-menu-modal', 'end-sale-confirm-modal',
      'share-sale-modal', 'join-sale-modal', 'join-instruction-modal',
      'edit-sale-modal', 'delete-past-sale-modal', 'clear-past-sales-modal',
      'cancel-confirm-modal', 'export-modal', 'app-guide-modal', 'install-instructions-modal',
      'add-item-modal', 'haggle-modal', 'ticket-discount-modal',
      'consignor-picker-modal', 'consignor-modal', 'consignor-color-picker-modal',
      'payout-type-picker-modal', 'speech-confirm-modal', 'speech-fail-modal',
      'mic-guide-modal', 'speech-permission-modal', 'item-sheet-backdrop',
      'sale-confirm-modal', 'clear-modal', 'dashboard-filter-modal'
    ];
    for (const id of modalIds) {
      const el = document.getElementById(id);
      if (el && el.classList.contains('visible')) {
        // Edit-Sale's blur-trap: blur first, then close.
        if (id === 'edit-sale-modal' && this._editSaleEditing) {
          if (document.activeElement && document.activeElement.blur) {
            document.activeElement.blur();
          }
          this._editSaleEditing = false;
        }
        el.classList.remove('visible');
        closed = true;
      }
    }
    return closed;
  },

  // Pending join data (from URL parameter, awaiting user confirmation)
  pendingJoinData: null,

  /**
   * Cache shared header element references
   */
  cacheHeaderElements() {
    this.headerElements = {
      // v163: standalone header removed; menu lives in each screen's hero/title
      // v161: sale-name / sale-day / discount-badge removed from header.
      // Identity + state context now live per-screen (dashboard large title,
      // checkout meta line, menu sale block).
      // v163: SHARED chip + menu button moved into each screen's hero/title
      // Header menu sheet
      menuModal: document.getElementById('header-menu-modal'),
      menuDashboard: document.getElementById('menu-dashboard'),
      menuPayouts: document.getElementById('menu-payouts'),
      menuAddConsignor: document.getElementById('menu-add-consignor'),
      menuScan: document.getElementById('menu-scan'),
      menuShare: document.getElementById('menu-share'),
      menuEndDay: document.getElementById('menu-end-day'),
      menuEndDayLabel: document.getElementById('menu-end-day-label'),
      menuEndSale: document.getElementById('menu-end-sale'),
      menuAppGuide: document.getElementById('menu-app-guide'),
      menuVersionLabel: document.getElementById('menu-version-label'),
      appGuideModal: document.getElementById('app-guide-modal'),
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
      joinScanButton: document.getElementById('join-scan-button'),
      joinCodeInput: document.getElementById('join-code-input'),
      joinCodeStatus: document.getElementById('join-code-status'),
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
      setupMenuAppGuide: document.getElementById('setup-menu-app-guide'),
      setupMenuFeedback: document.getElementById('setup-menu-feedback'),
      setupMenuVersionLabel: document.getElementById('setup-menu-version-label'),
      setupMenuPastSales: document.getElementById('setup-menu-past-sales'),
      // Past Estate Sales — Setup-screen card (v195) and dashboard-banner link
      setupPastSalesSection: document.getElementById('setup-past-sales-section'),
      setupPastSalesCard: document.getElementById('setup-past-sales-card'),
      setupPastSalesCount: document.getElementById('setup-past-sales-count'),
      dashboardViewPastSales: document.getElementById('dashboard-view-past-sales'),
      dashboardEndedSep: document.getElementById('dashboard-ended-sep')
    };
  },

  /**
   * Bind shared header event listeners
   */
  bindHeaderEvents() {
    // v163: menu button is embedded per-screen. Bind every embedded button to
    // the same openMenu handler. e.stopPropagation prevents the running-total
    // card from also firing its tap-to-open-detail behavior when the menu icon
    // is tapped.
    const menuButtonIds = [
      'nav-menu',           // checkout (running-total card)
      'dashboard-menu-btn', // dashboard (large title block)
      'paused-menu-btn',    // paused (paused-header)
      'payouts-menu-btn'    // payouts (floating top-right)
    ];
    menuButtonIds.forEach(id => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.openMenu();
        });
      }
    });

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
    if (this.headerElements.menuAddConsignor) {
      this.headerElements.menuAddConsignor.addEventListener('click', () => {
        this.closeMenu();
        this.openConsignorSheet(null);
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
    if (this.headerElements.menuModal) {
      this.headerElements.menuModal.addEventListener('click', (e) => {
        if (e.target === this.headerElements.menuModal) this.closeMenu();
      });
    }

    // App Guide (v204) — replaces What's New. Static FAQ content; no
    // per-version history rendering anymore (version-history data lives
    // in js/version.js as the engineering changelog only).
    this._initVersionLabel();
    if (this.headerElements.menuAppGuide) {
      this.headerElements.menuAppGuide.addEventListener('click', () => {
        this.closeMenu();
        this.openAppGuide();
      });
    }

    // v212: Add to Home Screen + Check for Updates (both menus)
    const wireInstall = (rowId) => {
      const el = document.getElementById(rowId);
      if (!el) return;
      el.addEventListener('click', () => {
        // Close whichever menu the row lives in.
        if (rowId.startsWith('setup-')) this._closeSetupMenu();
        else this.closeMenu();
        this._handleAddToHomeScreen();
      });
    };
    wireInstall('menu-add-to-home');
    wireInstall('setup-menu-add-to-home');

    const wireCheckUpdates = (rowId, labelId) => {
      const el = document.getElementById(rowId);
      const labelEl = document.getElementById(labelId);
      if (!el || !labelEl) return;
      el.addEventListener('click', () => this._handleCheckForUpdates(labelEl));
    };
    wireCheckUpdates('menu-check-updates', 'menu-check-updates-label');
    wireCheckUpdates('setup-menu-check-updates', 'setup-menu-check-updates-label');

    // Install instructions modal — Got It + backdrop dismiss
    const installDone = document.getElementById('install-instructions-done');
    const installModal = document.getElementById('install-instructions-modal');
    if (installDone) installDone.addEventListener('click', () => this._closeInstallInstructions());
    if (installModal) {
      installModal.addEventListener('click', (e) => {
        if (e.target === installModal) this._closeInstallInstructions();
      });
    }

    // Past Estate Sales — three entry points (v195):
    //   1) Setup hamburger row (muscle memory)
    //   2) Setup screen body card (primary, visible)
    //   3) Dashboard ended-banner link (post-end-sale shortcut)
    // The in-sale hamburger entry was removed — mid-sale users don't dig into
    // archives.
    if (this.headerElements.setupMenuPastSales) {
      this.headerElements.setupMenuPastSales.addEventListener('click', () => {
        this._closeSetupMenu();
        this.showScreen('past-sales');
      });
    }
    if (this.headerElements.setupPastSalesCard) {
      this.headerElements.setupPastSalesCard.addEventListener('click', () => {
        this.showScreen('past-sales');
      });
    }
    if (this.headerElements.dashboardViewPastSales) {
      this.headerElements.dashboardViewPastSales.addEventListener('click', () => {
        this.showScreen('past-sales');
      });
    }

    // Export Sale Data — three entry points share the same flow.
    const menuExport = document.getElementById('menu-export');
    if (menuExport) {
      menuExport.addEventListener('click', async () => {
        const sale = Storage.getSale();
        const txns = Storage.getTransactions();
        // Empty case stays in the menu so the user sees the inline error.
        // Otherwise close the menu before the share sheet pops.
        if (sale && txns.length > 0) this.closeMenu();
        await this.exportSaleData('menu-export-error');
      });
    }
    const pausedExport = document.getElementById('paused-export');
    if (pausedExport) {
      pausedExport.addEventListener('click', () => this.exportSaleData('paused-export-error'));
    }
    const dashboardExport = document.getElementById('dashboard-export');
    if (dashboardExport) {
      dashboardExport.addEventListener('click', () => this.exportSaleData('dashboard-export-error'));
    }

    // Export modal — confirm button, toggle-all link, backdrop dismiss
    const exportModal = document.getElementById('export-modal');
    const exportConfirm = document.getElementById('export-confirm');
    const exportToggleAll = document.getElementById('export-toggle-all');
    if (exportConfirm) {
      exportConfirm.addEventListener('click', async () => {
        if (exportConfirm.disabled) return;
        const daysFilter = Array.from(this._exportSelection || []);
        // Hide the sheet first (without clearing the export context — _executeExport
        // needs it). _executeExport will clear the context when it's done.
        const modal = document.getElementById('export-modal');
        if (modal) modal.classList.remove('visible');
        await this._executeExport(daysFilter);
      });
    }
    if (exportToggleAll) {
      exportToggleAll.addEventListener('click', () => this._toggleExportAll());
    }
    if (exportModal) {
      exportModal.addEventListener('click', (e) => {
        if (e.target === exportModal) this._closeExportSheet();
      });
    }
    if (this.headerElements.appGuideModal) {
      this.headerElements.appGuideModal.addEventListener('click', (e) => {
        if (e.target === this.headerElements.appGuideModal) this.closeAppGuide();
      });
    }

    // End sale confirmation
    if (this.headerElements.endSaleConfirm) {
      this.headerElements.endSaleConfirm.addEventListener('click', () => {
        // Validate-on-tap (v187): button is always enabled; mistyped input
        // surfaces the inline error here, valid input proceeds.
        if (!this._endSaleNameMatches()) {
          this._showEndSaleError();
          return;
        }
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
      // Route through the type-the-name confirmation, same as the menu's
      // End Sale Permanently. Without this, ending the sale from the
      // Paused screen would skip the guardrail.
      pausedEndSale.addEventListener('click', () => this.showEndSaleConfirm());
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

    // Join instruction sheet — Scan QR opens the in-app scanner. The
    // scanner detects ?join= URLs on its own and routes to the join flow,
    // so no mode flag is needed.
    if (this.headerElements.joinScanButton) {
      this.headerElements.joinScanButton.addEventListener('click', () => {
        this._closeJoinInstruction();
        this.showScreen('scan');
      });
    }

    // Join instruction sheet — manual code entry with auto-submit on 6 digits
    if (this.headerElements.joinCodeInput) {
      this.headerElements.joinCodeInput.addEventListener('input', (e) => {
        // Strip non-digits defensively (paste, autofill, etc.)
        const cleaned = e.target.value.replace(/\D/g, '').slice(0, 6);
        if (cleaned !== e.target.value) e.target.value = cleaned;
        this._clearJoinCodeStatus();
        if (cleaned.length === 6) this._submitJoinCode(cleaned);
      });
    }
    if (this.headerElements.joinInstructionModal) {
      this.headerElements.joinInstructionModal.addEventListener('click', (e) => {
        if (e.target === this.headerElements.joinInstructionModal) {
          this._closeJoinInstruction();
        }
      });
    }

    // Setup menu — open/close + items (What's New, Share Feedback)
    if (this.headerElements.setupMenuBtn) {
      this.headerElements.setupMenuBtn.addEventListener('click', () => {
        // Past Sales row hides when archive is empty.
        if (this.headerElements.setupMenuPastSales && typeof ArchiveDB !== 'undefined') {
          this.headerElements.setupMenuPastSales.hidden = true;
          ArchiveDB.count().then(n => {
            if (this.headerElements.setupMenuPastSales) this.headerElements.setupMenuPastSales.hidden = n === 0;
          }).catch(() => {});
        }
        this.headerElements.setupMenuModal.classList.add('visible');
      });
    }
    if (this.headerElements.setupMenuModal) {
      this.headerElements.setupMenuModal.addEventListener('click', (e) => {
        if (e.target === this.headerElements.setupMenuModal) {
          this._closeSetupMenu();
        }
      });
    }
    if (this.headerElements.setupMenuAppGuide) {
      this.headerElements.setupMenuAppGuide.addEventListener('click', () => {
        this._closeSetupMenu();
        this.openAppGuide();
      });
    }
    if (this.headerElements.setupMenuFeedback) {
      this.headerElements.setupMenuFeedback.addEventListener('click', () => {
        this._closeSetupMenu();
        // Opens the feedback Google Form in a new tab.
        window.open(
          'https://docs.google.com/forms/d/e/1FAIpQLSf6XbPVyTISA1ED2Xp4ESGCXW7kE6eJsOIUamTOEonpqzxdXQ/viewform',
          '_blank',
          'noopener'
        );
      });
    }
    if (this.headerElements.setupMenuVersionLabel && typeof APP_VERSION !== 'undefined') {
      this.headerElements.setupMenuVersionLabel.textContent = `Version ${APP_VERSION}`;
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
    // v209: target the label span, not the <li>. Setting textContent on
    // the <li> wiped the icon span every time the menu opened — that's why
    // End Day kept appearing iconless after v207/v208.
    if (this.headerElements.menuEndDayLabel) {
      this.headerElements.menuEndDayLabel.textContent = (sale && sale.status === 'paused') ? 'Resume Day' : 'End Day';
    }
    // Show Consignor Payouts when consignors exist; otherwise show
    // "Add Consignor" in the same slot — same flow as Setup, just from
    // the in-sale menu (v211). Reuses App.openConsignorSheet(null).
    const hasConsignors = sale && sale.consignors && sale.consignors.length > 0;
    if (this.headerElements.menuPayouts) {
      this.headerElements.menuPayouts.hidden = !hasConsignors;
    }
    if (this.headerElements.menuAddConsignor) {
      this.headerElements.menuAddConsignor.hidden = hasConsignors;
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
   * Close the setup menu sheet (no-active-sale state)
   */
  _closeSetupMenu() {
    if (this.headerElements.setupMenuModal) {
      this.headerElements.setupMenuModal.classList.remove('visible');
    }
  },

  /**
   * Refresh archive-aware UI affordances. Called whenever the user lands on
   * a screen that surfaces past-sales chrome:
   *   - Setup screen body card (#setup-past-sales-section)
   *   - Setup hamburger row (already gated in its open handler)
   *   - Dashboard ended-banner "View Past Estate Sales" link
   *
   * Async; the affordances stay hidden until the count comes back. Cheap
   * IDB count() call — runs in a few ms.
   */
  refreshArchiveAffordances() {
    if (typeof ArchiveDB === 'undefined') return;
    // Reset to hidden first so a stale state doesn't flash.
    if (this.headerElements.setupPastSalesSection) {
      this.headerElements.setupPastSalesSection.hidden = true;
    }
    if (this.headerElements.dashboardViewPastSales) {
      this.headerElements.dashboardViewPastSales.hidden = true;
    }
    if (this.headerElements.dashboardEndedSep) {
      this.headerElements.dashboardEndedSep.hidden = true;
    }
    ArchiveDB.count().then(n => {
      if (this.headerElements.setupPastSalesSection) {
        this.headerElements.setupPastSalesSection.hidden = n === 0;
      }
      if (this.headerElements.setupPastSalesCount) {
        this.headerElements.setupPastSalesCount.textContent = String(n);
      }
      // Dashboard banner: the View Past Estate Sales link AND the dot
      // separator both appear only when the sale is ended and there's
      // at least one archive entry to view. Otherwise Export sits alone.
      const sale = Storage.getSale();
      const isEnded = sale && sale.status === 'ended';
      const showPastLink = isEnded && n > 0;
      if (this.headerElements.dashboardViewPastSales) {
        this.headerElements.dashboardViewPastSales.hidden = !showPastLink;
      }
      if (this.headerElements.dashboardEndedSep) {
        this.headerElements.dashboardEndedSep.hidden = !showPastLink;
      }
    }).catch(() => {});
  },

  // ── Export Sale Data (v188) ──

  /**
   * App-level inline error helper (mirrors Checkout._showFieldError).
   * Used by the export entry points where Checkout's helper isn't in scope.
   */
  _showFieldError(id, message) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
    clearTimeout(el._hideTimer);
    el._hideTimer = setTimeout(() => { el.hidden = true; }, 2500);
  },

  /**
   * Trigger the CSV export flow. v190: validates pre-flight (sale exists,
   * has transactions), pulls fresh from sync to keep counts accurate, then
   * opens the day-picker sheet.
   *
   * v193 adds an optional saleContext for past-sale exports:
   *   undefined / null  → use the live sale + transactions + consignors
   *                       (today's behavior; pulls from sync first)
   *   { sale, transactions, consignors }
   *                     → use the snapshot exactly as given. Does NOT pull
   *                       from sync (the snapshot is frozen by definition).
   */
  async exportSaleData(errorElementId, saleContext) {
    const errId = errorElementId || 'menu-export-error';
    const isPast = !!saleContext;

    const sale = isPast ? saleContext.sale : Storage.getSale();
    if (!sale) {
      this._showFieldError(errId, 'No estate sale yet — start one first.');
      return;
    }

    // Sync pull — only for live exports. Past sales are immutable snapshots.
    if (!isPast && typeof Sync !== 'undefined' && Sync.isSynced(sale)) {
      try {
        await Sync.pullInvoices(sale);
      } catch (err) {
        console.warn('[export] sync pull failed, using local cache:', err.message);
      }
    }

    const transactions = isPast ? (saleContext.transactions || []) : Storage.getTransactions();
    if (transactions.length === 0) {
      this._showFieldError(errId, 'No transactions to export yet.');
      return;
    }

    // Stash the context the picker needs — _executeExport reads from this.
    this._exportContext = isPast
      ? { sale, transactions, consignors: saleContext.consignors || [] }
      : null;

    this._renderExportSheet(sale, transactions);
    document.getElementById('export-modal').classList.add('visible');
  },

  /**
   * Render the day-picker rows for the current sale.
   * Picker rows = union of scheduleDays + any orphan saleDay values found
   * on transactions (defends against dayOverride-baked saleDays that
   * exceed schedule length). Selection state defaults to "all checked"
   * (excluding zero-invoice days, which are unselectable).
   */
  _renderExportSheet(sale, transactions) {
    const list = document.getElementById('export-day-list');
    if (!list) return;

    // Sale-name subtitle so the user knows which sale's data this is.
    const subtitle = document.getElementById('export-sale-name');
    if (subtitle) {
      subtitle.textContent = (sale && sale.name) ? sale.name : '';
    }

    // Per-day invoice counts. Coerce missing saleDay to 1 to match
    // Storage.exportSaleCSV's column-write fallback.
    const countsByDay = {};
    transactions.forEach(t => {
      const d = t.saleDay || 1;
      countsByDay[d] = (countsByDay[d] || 0) + 1;
    });

    const scheduleDays = sale.scheduleDays || [];
    const scheduleDayMap = {};
    scheduleDays.forEach(d => { scheduleDayMap[d.day] = d; });

    // Union of schedule + orphan saleDay values from transactions.
    const allDayKeys = new Set(scheduleDays.map(d => d.day));
    Object.keys(countsByDay).forEach(k => allDayKeys.add(parseInt(k, 10)));
    const dayList = Array.from(allDayKeys).sort((a, b) => a - b);

    // Default selection: every day that has at least one invoice.
    this._exportSelection = new Set(dayList.filter(d => (countsByDay[d] || 0) > 0));

    list.innerHTML = dayList.map(day => {
      const count = countsByDay[day] || 0;
      const dayMeta = scheduleDayMap[day];
      const dateLabel = dayMeta ? Utils.formatShortDate(dayMeta.date) : '';
      const label = dateLabel ? `Day ${day} · ${dateLabel}` : `Day ${day}`;
      const hint = count === 1 ? '1 invoice' : `${count} invoices`;
      const selected = this._exportSelection.has(day);
      const disabled = count === 0;
      const cls = ['ec-picker-item'];
      if (selected) cls.push('ec-picker-item--selected');
      return `
        <li class="${cls.join(' ')}" data-day="${day}" role="checkbox"
            aria-checked="${selected}" ${disabled ? 'aria-disabled="true"' : ''}>
          <span class="ec-picker-item__label">${label}</span>
          <span class="ec-picker-item__hint">${hint}</span>
          <span class="ec-picker-item__check" aria-hidden="true">✓</span>
        </li>
      `;
    }).join('');

    list.querySelectorAll('.ec-picker-item').forEach(row => {
      row.addEventListener('click', () => {
        if (row.getAttribute('aria-disabled') === 'true') return;
        const day = parseInt(row.dataset.day, 10);
        this._toggleExportDay(day);
      });
    });

    this._updateExportCTA();
    this._updateExportToggleAllLabel();
  },

  _toggleExportDay(day) {
    if (this._exportSelection.has(day)) {
      this._exportSelection.delete(day);
    } else {
      this._exportSelection.add(day);
    }
    const row = document.querySelector(`#export-day-list [data-day="${day}"]`);
    if (row) {
      const selected = this._exportSelection.has(day);
      row.classList.toggle('ec-picker-item--selected', selected);
      row.setAttribute('aria-checked', selected);
    }
    this._updateExportCTA();
    this._updateExportToggleAllLabel();
  },

  /**
   * Toggle every selectable (non-disabled) row at once. If any are
   * unselected, select all. If all are selected, select none.
   */
  _toggleExportAll() {
    const rows = document.querySelectorAll('#export-day-list .ec-picker-item');
    const selectableDays = [];
    rows.forEach(row => {
      if (row.getAttribute('aria-disabled') !== 'true') {
        selectableDays.push(parseInt(row.dataset.day, 10));
      }
    });
    const allSelected = selectableDays.every(d => this._exportSelection.has(d));
    if (allSelected) {
      selectableDays.forEach(d => this._exportSelection.delete(d));
    } else {
      selectableDays.forEach(d => this._exportSelection.add(d));
    }
    rows.forEach(row => {
      const day = parseInt(row.dataset.day, 10);
      const selected = this._exportSelection.has(day);
      row.classList.toggle('ec-picker-item--selected', selected);
      row.setAttribute('aria-checked', selected);
    });
    this._updateExportCTA();
    this._updateExportToggleAllLabel();
  },

  _updateExportToggleAllLabel() {
    const link = document.getElementById('export-toggle-all');
    if (!link) return;
    const rows = document.querySelectorAll('#export-day-list .ec-picker-item:not([aria-disabled="true"])');
    const allSelected = Array.from(rows).every(r => this._exportSelection.has(parseInt(r.dataset.day, 10)));
    link.textContent = allSelected ? 'Deselect All' : 'Select All';
  },

  _updateExportCTA() {
    const btn = document.getElementById('export-confirm');
    if (!btn) return;
    const transactions = this._exportContext
      ? this._exportContext.transactions
      : Storage.getTransactions();
    const selectedCount = transactions.filter(t => this._exportSelection.has(t.saleDay || 1)).length;
    btn.disabled = selectedCount === 0;
    if (selectedCount === 0) {
      btn.textContent = 'Export';
    } else if (selectedCount === 1) {
      btn.textContent = 'Export 1 Invoice';
    } else {
      btn.textContent = `Export ${selectedCount} Invoices`;
    }
  },

  _closeExportSheet() {
    const modal = document.getElementById('export-modal');
    if (modal) modal.classList.remove('visible');
    // If the user dismissed the picker without exporting, drop the past-sale
    // context so the next live export doesn't pick it up.
    this._exportContext = null;
  },

  /**
   * Generate and share the CSV. daysFilter is null (export all) or an
   * array of selected day numbers. v190: split out from exportSaleData so
   * the picker confirm can call it. v193: routes through the snapshot CSV
   * builder when an export context is set (past-sale export).
   */
  async _executeExport(daysFilter) {
    const ctx = this._exportContext;
    let csv, filename;
    if (ctx) {
      csv = Storage.exportSaleCSVFromSnapshot(ctx.transactions, ctx.consignors, daysFilter);
      filename = Storage.exportFilename(ctx.sale ? ctx.sale.name : null);
    } else {
      csv = Storage.exportSaleCSV(daysFilter);
      filename = Storage.exportFilename();
    }
    // Clear the context so a subsequent live export doesn't accidentally inherit it.
    this._exportContext = null;
    const file = new File([csv], filename, { type: 'text/csv' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Estate Sale Export' });
      } catch (err) {
        if (err.name !== 'AbortError' && err.name !== 'NotAllowedError') {
          console.warn('[export] share failed:', err.message);
        }
      }
      return;
    }

    // Fallback: trigger an anchor download via a Blob URL.
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  // ── Edit Sale Sheet ──

  // Track whether an input is actively being edited in the Edit Sale sheet
  _editSaleEditing: false,

  /**
   * Persist edits made inside the Edit Sale sheet — local + remote.
   * Local save is the source of truth; the sync.patchSale call propagates
   * the synced fields (name, discounts) to other devices on this shared sale.
   * dayOverride stays per-device and is not sent (worker schema doesn't have
   * a column for it). Fire-and-forget; errors are logged but don't block.
   */
  _persistEditSale(sale) {
    Storage.saveSale(sale);
    if (typeof Sync !== 'undefined' && Sync.isSynced(sale)) {
      Sync.patchSale(sale.id, sale.shareCode, {
        name: sale.name,
        discounts: sale.discounts
      }).catch(err => console.warn('[sync] edit-sale patch failed:', err.message));
    }
  },

  /**
   * Open the edit sale sheet and render its content
   */
  openEditSale() {
    const sale = Storage.getSale();
    if (!sale) return;
    this._editSaleEditing = false;
    // v209: reset Edit Mode state on each open
    this._editScheduleMode = false;
    this._armedDay = null;
    this._editConsignorsMode = false;
    this._armedConsignor = null;
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
  /**
   * Render the Edit Estate Sale Details sheet.
   *
   * v209: rebuilt to mirror the Setup screen's grouped-card layout. Each
   * section is an eyebrow `.ec-section-header` above an `.ec-card`, with
   * input rows inside the card and action rows (`.ec-card__row--action`)
   * at the bottom. Discount Schedule reuses the `.discount-row` styling
   * from Setup; Consignors reuses `.consignor-list__item`. The bespoke
   * `.edit-sale__section` / `.edit-sale__row` patterns are retired.
   *
   * The `×`-per-row delete affordance is replaced with the standard Edit
   * Mode pattern (matching Setup §1.4.I): a "Remove" link sits next to
   * "+ Add Day" / "+ Add Consignor"; tapping enters batch-delete mode.
   */
  renderEditSale(sale) {
    const currentDay = Utils.getSaleDay(sale.startDate, sale);
    const discounts = sale.discounts || {};
    const days = Object.keys(discounts).map(Number).sort((a, b) => a - b);
    const consignors = sale.consignors || [];

    let html = '';

    // Details card (Sale Name + Current Day — both tap-to-edit)
    html += `
      <span class="ec-section-header">Details</span>
      <div class="ec-card setup-card">
        <div class="ec-card__row edit-sale__split-row">
          <span class="edit-sale__label">Sale Name</span>
          <span class="edit-sale__value" id="edit-sale-name">${Utils.escapeHtml(sale.name)}</span>
        </div>
        <div class="ec-card__row edit-sale__split-row">
          <span class="edit-sale__label">Current Day</span>
          <span class="edit-sale__value" id="edit-sale-day">Day ${currentDay}</span>
        </div>
      </div>
    `;

    // Discount Schedule — reuse .discount-row pattern from Setup. Edit Mode
    // is driven by the _editScheduleMode flag; armed-row state via _armedDay.
    const editingSchedule = this._editScheduleMode;
    const armedDay = this._armedDay;
    let scheduleRows = '';
    days.forEach(d => {
      const isCompleted = d <= currentDay;
      const armed = editingSchedule && armedDay === d;
      const handleHtml = (editingSchedule && !isCompleted)
        ? `<button class="row-edit-handle" data-arm-day="${d}" type="button" aria-label="Remove Day ${d}"></button>`
        : (editingSchedule
            ? `<span class="row-edit-handle row-edit-handle--disabled" aria-hidden="true"></span>`
            : '');
      const rightHtml = armed
        ? `<button class="row-edit-confirm" data-confirm-day="${d}" type="button">Remove</button>`
        : `<span class="discount-row__value" data-edit-discount="${d}">${discounts[d]}%</span>`;
      scheduleRows += `
        <div class="discount-row" data-day-index="${d}">
          <div class="discount-row__content">
            ${handleHtml}
            <span class="discount-row__label">Day ${d}</span>
            <div class="discount-row__right">${rightHtml}</div>
          </div>
        </div>
      `;
    });
    const scheduleEditingClass = editingSchedule ? ' discount-list--editing' : '';
    const removeScheduleHidden = days.filter(d => d > currentDay).length === 0 ? 'hidden' : '';
    html += `
      <span class="ec-section-header">Discount Schedule</span>
      <div class="ec-card setup-card">
        <div class="discount-list${scheduleEditingClass}">${scheduleRows}</div>
        <div class="ec-card__row ec-card__row--action ec-card__row--split">
          <button class="ec-link-primary" id="edit-sale-add-day" type="button">+ Add Day</button>
          <button class="ec-link-destructive" id="edit-sale-schedule-edit" type="button" ${removeScheduleHidden}>${editingSchedule ? 'Done' : 'Remove'}</button>
        </div>
      </div>
    `;

    // Consignors — reuse .consignor-list__item rows + Edit Mode pattern.
    const editingConsignors = this._editConsignorsMode;
    const armedConsignor = this._armedConsignor;
    let consignorRows = '';
    if (consignors.length === 0) {
      consignorRows = `<div class="ec-card__row edit-sale__empty">No consignors added</div>`;
    } else {
      consignors.forEach(c => {
        const payoutLabel = c.payoutType === 'percentage'
          ? `${c.payoutValue}% to consignor`
          : `$${c.payoutValue} fee per item`;
        const armed = editingConsignors && armedConsignor === c.id;
        const handleHtml = editingConsignors
          ? `<button class="row-edit-handle" data-arm-consignor="${c.id}" type="button" aria-label="Remove ${Utils.escapeHtml(c.name)}"></button>`
          : '';
        const rightHtml = armed
          ? `<button class="row-edit-confirm" data-confirm-consignor="${c.id}" type="button">Remove</button>`
          : `<span class="consignor-list__payout">${payoutLabel}</span>`;
        consignorRows += `
          <div class="consignor-list__item" data-consignor-id="${c.id}">
            ${handleHtml}
            <span class="consignor-list__dot" style="background: ${c.color}"></span>
            <span class="consignor-list__name">${Utils.escapeHtml(c.name)}</span>
            ${rightHtml}
          </div>
        `;
      });
    }
    const consignorEditingClass = editingConsignors ? ' consignor-list--editing' : '';
    const removeConsignorsHidden = consignors.length === 0 ? 'hidden' : '';
    html += `
      <span class="ec-section-header">Consignors</span>
      <div class="ec-card setup-card">
        <div class="consignor-list${consignorEditingClass}">${consignorRows}</div>
        <div class="ec-card__row ec-card__row--action ec-card__row--split">
          <button class="ec-link-primary" id="edit-sale-add-consignor" type="button">+ Add Consignor</button>
          <button class="ec-link-destructive" id="edit-sale-consignors-edit" type="button" ${removeConsignorsHidden}>${editingConsignors ? 'Done' : 'Remove'}</button>
        </div>
      </div>
    `;

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
        input.className = 'ec-input';
        input.value = sale.name;
        input.maxLength = 50;
        nameEl.replaceWith(input);
        input.focus({ preventScroll: true });
        this._setEditSaleEditing(true);
        const save = () => {
          const val = input.value.trim();
          if (val) sale.name = val;
          this._persistEditSale(sale);
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
        select.className = 'ec-input';
        days.forEach(d => {
          const opt = document.createElement('option');
          opt.value = d;
          opt.textContent = `Day ${d}`;
          if (d === currentDay) opt.selected = true;
          select.appendChild(opt);
        });
        dayEl.replaceWith(select);
        select.focus({ preventScroll: true });
        this._setEditSaleEditing(true);
        select.addEventListener('change', () => {
          sale.dayOverride = parseInt(select.value);
          this._persistEditSale(sale);
          this._setEditSaleEditing(false);
          this.renderEditSale(sale);
        });
        select.addEventListener('blur', () => {
          this._setEditSaleEditing(false);
          this.renderEditSale(sale);
        });
      });
    }

    // Discount percentage tap to edit (only when NOT in edit mode)
    if (!this._editScheduleMode) {
      content.querySelectorAll('[data-edit-discount]').forEach(el => {
        el.addEventListener('click', () => {
          const day = parseInt(el.dataset.editDiscount);
          const input = document.createElement('input');
          input.type = 'number';
          input.className = 'ec-input ec-input--compact';
          input.value = sale.discounts[day] || 0;
          input.min = 0;
          input.max = 100;
          el.replaceWith(input);
          input.focus({ preventScroll: true });
          input.select();
          this._setEditSaleEditing(true);
          const save = () => {
            const val = parseInt(input.value);
            if (!isNaN(val) && val >= 0 && val <= 100) {
              sale.discounts[day] = val;
            }
            this._persistEditSale(sale);
            this._setEditSaleEditing(false);
            this.renderEditSale(sale);
          };
          input.addEventListener('blur', save);
          input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); });
        });
      });
    }

    // Schedule Edit Mode toggle (Remove ↔ Done)
    const scheduleEditBtn = content.querySelector('#edit-sale-schedule-edit');
    if (scheduleEditBtn) {
      scheduleEditBtn.addEventListener('click', () => {
        this._editScheduleMode = !this._editScheduleMode;
        this._armedDay = null;
        this.renderEditSale(sale);
      });
    }

    // Schedule arm/confirm (Edit Mode batch-delete pattern)
    content.querySelectorAll('[data-arm-day]').forEach(btn => {
      btn.addEventListener('click', () => {
        const d = parseInt(btn.dataset.armDay);
        this._armedDay = (this._armedDay === d) ? null : d;
        this.renderEditSale(sale);
      });
    });
    content.querySelectorAll('[data-confirm-day]').forEach(btn => {
      btn.addEventListener('click', () => {
        const day = parseInt(btn.dataset.confirmDay);
        delete sale.discounts[day];
        // Renumber so day keys stay 1..N consecutive
        const remaining = Object.keys(sale.discounts).map(Number).sort((a, b) => a - b);
        const newDiscounts = {};
        remaining.forEach((oldKey, i) => { newDiscounts[i + 1] = sale.discounts[oldKey]; });
        sale.discounts = newDiscounts;
        const maxDay = remaining.length;
        if (sale.dayOverride && sale.dayOverride > maxDay) sale.dayOverride = maxDay;

        this._armedDay = null;
        // Auto-exit edit mode if no removable days remain
        const currentDay = Utils.getSaleDay(sale.startDate, sale);
        const removable = Object.keys(sale.discounts).map(Number).filter(d => d > currentDay);
        if (removable.length === 0) this._editScheduleMode = false;

        this._persistEditSale(sale);
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
        sale.discounts[nextDay] = Math.min(100, lastDiscount + 25);
        this._persistEditSale(sale);
        this.renderEditSale(sale);
      });
    }

    // Consignors Edit Mode toggle
    const consignorsEditBtn = content.querySelector('#edit-sale-consignors-edit');
    if (consignorsEditBtn) {
      consignorsEditBtn.addEventListener('click', () => {
        this._editConsignorsMode = !this._editConsignorsMode;
        this._armedConsignor = null;
        this.renderEditSale(sale);
      });
    }

    // Consignor arm/confirm
    content.querySelectorAll('[data-arm-consignor]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.armConsignor;
        this._armedConsignor = (this._armedConsignor === id) ? null : id;
        this.renderEditSale(sale);
      });
    });
    content.querySelectorAll('[data-confirm-consignor]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.confirmConsignor;
        Storage.deleteConsignor(id);
        if (typeof Sync !== 'undefined' && Sync.isSynced(sale)) {
          const fresh = Storage.getSale();
          Sync.patchSale(fresh.id, fresh.shareCode, { consignors: fresh.consignors || [] })
            .catch(err => console.warn('[sync] edit-sale remove consignor failed:', err.message));
        }
        // Sale object is local, but Storage.deleteConsignor mutated storage —
        // re-read for the next render.
        sale.consignors = (Storage.getSale() || sale).consignors || [];
        this._armedConsignor = null;
        if (sale.consignors.length === 0) this._editConsignorsMode = false;
        this.renderEditSale(sale);
      });
    });

    // Consignor: Add button
    const addConsignorBtn = content.querySelector('#edit-sale-add-consignor');
    if (addConsignorBtn) {
      addConsignorBtn.addEventListener('click', () => this.openConsignorSheet(null));
    }

    // Consignor: tap row to edit (only when NOT in edit mode)
    if (!this._editConsignorsMode) {
      content.querySelectorAll('[data-consignor-id]').forEach(el => {
        el.addEventListener('click', () => {
          const id = el.dataset.consignorId;
          const consignor = (sale.consignors || []).find(c => c.id === id);
          if (consignor) this.openConsignorSheet(consignor);
        });
      });
    }
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
      this._setConsignorColor(consignor.color);
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
      this._setConsignorColor(defaultColor);
    }

    this._updateConsignorPayoutUI();
    modal.classList.add('visible');
  },

  /**
   * Currently-selected color in the Add/Edit Consignor sheet. Persisted on
   * the App instance because the color picker is now a separate sheet that
   * opens and closes — we need somewhere to hold the value between those
   * two surfaces. Read by _saveConsignor.
   */
  _consignorSelectedColor: null,

  _setConsignorColor(color) {
    this._consignorSelectedColor = color;
    const dot = document.getElementById('consignor-color-current');
    if (dot) dot.style.background = color;
  },

  /**
   * Open the color picker bottom sheet. Renders the 10 swatches with the
   * currently-selected one highlighted.
   */
  _openConsignorColorPicker() {
    const modal = document.getElementById('consignor-color-picker-modal');
    const grid = document.getElementById('consignor-color-picker-grid');
    if (!modal || !grid) return;

    const selected = this._consignorSelectedColor;
    grid.innerHTML = CONSIGNOR_COLORS.map(color => {
      const sel = color === selected ? ' ec-color-dot--selected' : '';
      return `<div class="ec-color-dot${sel}" data-color="${color}" style="background: ${color}"></div>`;
    }).join('');

    grid.querySelectorAll('.ec-color-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        this._setConsignorColor(dot.dataset.color);
        modal.classList.remove('visible');
      });
    });

    modal.classList.add('visible');
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
    const color = this._consignorSelectedColor || CONSIGNOR_COLORS[0];

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
    // v211: if Add Item is open under the consignor sheet, refresh the chip
    // so its label flips from "Add a consignor" → "Select consignor".
    const addItem = document.getElementById('add-item-modal');
    if (addItem && addItem.classList.contains('visible') && typeof Checkout !== 'undefined') {
      Checkout._updateAddItemConsignorDisplay();
    }
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

  /**
   * Populate the version label at the bottom of the menu sheet. v204:
   * the per-version history content is no longer rendered into the UI —
   * VERSION_HISTORY in js/version.js stays as the engineering changelog
   * but the user-facing surface is now the App Guide (static FAQs).
   */
  _initVersionLabel() {
    if (this.headerElements.menuVersionLabel && typeof APP_VERSION !== 'undefined') {
      this.headerElements.menuVersionLabel.textContent = `Version ${APP_VERSION}`;
    }
  },

  openAppGuide() {
    if (this.headerElements.appGuideModal) {
      this.headerElements.appGuideModal.classList.add('visible');
    }
  },

  closeAppGuide() {
    if (this.headerElements.appGuideModal) {
      this.headerElements.appGuideModal.classList.remove('visible');
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
    const payoutType = document.getElementById('consignor-payout-type');
    const payoutValue = document.getElementById('consignor-payout-value');

    saveBtn.addEventListener('click', () => this._saveConsignor());
    deleteBtn.addEventListener('click', () => this._deleteConsignor());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('visible');
    });
    payoutType.addEventListener('change', () => this._updateConsignorPayoutUI());
    payoutValue.addEventListener('input', () => this._updateConsignorPayoutUI());

    // Color chip → opens the color picker bottom sheet
    const colorBtn = document.getElementById('consignor-color-btn');
    if (colorBtn) {
      colorBtn.addEventListener('click', () => this._openConsignorColorPicker());
    }
    const colorPickerModal = document.getElementById('consignor-color-picker-modal');
    if (colorPickerModal) {
      colorPickerModal.addEventListener('click', (e) => {
        if (e.target === colorPickerModal) colorPickerModal.classList.remove('visible');
      });
    }
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
    // Button is always tappable — validation happens on tap, not on input.
    // Error appears only when the user actually tries to confirm with a
    // mistyped name (v187). No live error while typing.
    const error = document.getElementById('end-sale-confirm-error');
    if (error) {
      error.hidden = true;
      error.textContent = '';
    }
    this.headerElements.endSaleConfirmModal.classList.add('visible');
    setTimeout(() => { if (input) input.focus({ preventScroll: true }); }, 100);
  },

  /**
   * Validate the typed name against the sale name. Case-insensitive,
   * trim-tolerant. Returns true if match.
   */
  _endSaleNameMatches() {
    const sale = Storage.getSale();
    const saleName = sale ? (sale.name || '').trim().toLowerCase() : '';
    const input = document.getElementById('end-sale-confirm-input');
    const typed = input ? input.value.trim().toLowerCase() : '';
    return saleName.length > 0 && typed === saleName;
  },

  /**
   * Show the inline error under the End Sale input. Only called from the
   * confirm-button click handler when the typed name doesn't match.
   */
  _showEndSaleError() {
    const sale = Storage.getSale();
    const saleName = sale ? sale.name : '';
    const error = document.getElementById('end-sale-confirm-error');
    if (!error) return;
    error.textContent = `Doesn't match — type "${saleName}" to confirm.`;
    error.hidden = false;
  },

  /**
   * Bind the input to clear the error as soon as the user starts typing
   * again after a failed confirm. No live validation otherwise.
   */
  _bindEndSaleConfirmInput() {
    if (this._endSaleConfirmInputBound) return;
    this._endSaleConfirmInputBound = true;
    const input = document.getElementById('end-sale-confirm-input');
    const error = document.getElementById('end-sale-confirm-error');
    if (!input || !error) return;
    input.addEventListener('input', () => {
      if (!error.hidden) {
        error.hidden = true;
        error.textContent = '';
      }
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
    // v203: remote-driven navigations use replaceState so two devices
    // ping-ponging end-day/resume don't pollute the back stack with entries
    // the user never navigated to themselves.
    if (newStatus === 'paused') {
      this.showScreen('paused', null, { replace: true });
    } else if (newStatus === 'active') {
      // Someone resumed; if we were on the paused screen, go back to checkout.
      if (this.currentScreen === 'paused') {
        this.showScreen('checkout', null, { replace: true });
      }
    } else if (newStatus === 'ended') {
      // Snapshot into the local archive so this device gets a Past Sales entry
      // even though it didn't initiate the end-sale. Fire-and-forget — if IDB
      // is unavailable, the alert + nav still happen.
      if (typeof ArchiveDB !== 'undefined') {
        ArchiveDB.archiveCurrentSale().catch(err =>
          console.warn('[archive] remote end-sale archive failed:', err.message));
      }
      // Drop the active cart but keep the sale + transactions for review.
      Storage.clearCart();
      Storage.clearCustomerCounter();
      alert('This sale was ended on another device. You can still review past invoices on the dashboard.');
      this.showScreen('dashboard', null, { replace: true });
    } else if (newStatus === 'purged') {
      // The sale was deleted from the cloud on another device. Strip the
      // _synced flag so future polls skip it (otherwise we'd 404-loop), drop
      // the cart, warn once, send the user to the dashboard for a final read.
      const local = Storage.getSale();
      if (local) {
        local._synced = false;
        Storage.saveSale(local);
      }
      if (this._stopSyncPoll) {
        this._stopSyncPoll();
        this._stopSyncPoll = null;
      }
      Storage.clearCart();
      Storage.clearCustomerCounter();
      alert('This sale was deleted on another device. The local copy is no longer connected to the cloud.');
      this.showScreen(local ? 'dashboard' : 'setup', null, { replace: true });
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
    if (typeof PastSales !== 'undefined') PastSales.init();
  },

  /**
   * Route to appropriate screen based on app state.
   *
   * v203 — Resolution order:
   *   1. `?join=<data>` query param wins (onboarding flow takes precedence over
   *      hash routing). The handler eventually calls cleanJoinUrl + showScreen.
   *   2. `location.hash` is parsed and validated against current state. Valid
   *      hash → show that screen. Invalid hash (e.g. #/checkout with no sale)
   *      → fall back to the default route. Either way, we use replaceState so
   *      the cold-load URL is canonicalized without polluting history.
   *   3. No hash → use the default route based on sale status.
   */
  route() {
    // Check for join parameter first
    const urlParams = new URLSearchParams(window.location.search);
    const joinData = urlParams.get('join');
    if (joinData) {
      this.handleJoinUrl(joinData);
      return;
    }

    const parsed = this._parseHash(window.location.hash);
    const target = (parsed && this._isHashTargetValid(parsed))
      ? parsed
      : this._defaultRoute();
    this.showScreen(target.screen, target.id, { replace: true });
  },

  /**
   * Switch to a different screen.
   *
   * v203 signature: `showScreen(screenName, data, opts)` where `opts` is:
   *   { fromPopstate?: boolean, replace?: boolean }
   *
   *   fromPopstate — set by the popstate listener. Skips the hash sync (we're
   *     already navigating via the browser) and skips the _previousScreen
   *     write (popstate IS going back; we shouldn't record the popped-from
   *     screen as "previous").
   *   replace — use history.replaceState instead of pushState. Used by:
   *     remote sync handlers (avoid polluting history with another device's
   *     activity), the join flow, fallback bounces, and cold-load init.
   */
  showScreen(screenName, data, opts) {
    const options = opts || {};
    const fromPopstate = !!options.fromPopstate;
    const replace = !!options.replace;

    // Cleanup before leaving current screen
    if (this.currentScreen === 'scan') {
      try { Scan.stop(); } catch (e) { /* safe — scanner may not have started */ }
    }
    // Stop background sync polling when leaving any screen that polls
    if (this._stopSyncPoll) {
      this._stopSyncPoll();
      this._stopSyncPoll = null;
    }

    // Track previous screen so transient-screen back buttons (Scan, Payment)
    // can return the user to where they came from. NOT updated on popstate —
    // popstate IS going back, so the popped-from screen shouldn't become the
    // new "previous."
    if (!fromPopstate && this.currentScreen && this.currentScreen !== screenName) {
      this._previousScreen = this.currentScreen;
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
        this.refreshArchiveAffordances();
      } else if (screenName === 'qr') {
        QR.render(data);
      } else if (screenName === 'scan') {
        Scan.onActivate();
      } else if (screenName === 'payment') {
        Payment.render(data);
      } else if (screenName === 'dashboard') {
        Dashboard.resetFilters();
        Dashboard.render(data);
        this.refreshArchiveAffordances();
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
      } else if (screenName === 'past-sales') {
        if (typeof PastSales !== 'undefined') PastSales.renderList();
      } else if (screenName === 'past-sale-detail') {
        if (typeof PastSales !== 'undefined') PastSales.renderDetail(data);
      }

    }

    // v203: sync URL hash to the screen we just navigated to. Skipped on
    // popstate (browser already updated the URL).
    if (!fromPopstate) {
      this._syncHashToScreen(screenName, data, replace);
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
   * v163: no global header to show/hide. Menu lives per-screen. This method
   * just refreshes the per-screen content (SHARED chips, menu sheet sale
   * block, dashboard large title) any time the active screen changes.
   */
  updateHeader(screenName) {
    const sale = Storage.getSale();
    if (!sale) return;
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

    // SHARED chips embedded in each screen's hero/title block (v163)
    const isShared = !!sale.isShared;
    ['shared-badge-checkout', 'shared-badge-dashboard', 'shared-badge-paused'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.hidden = !isShared;
    });

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
    if (menuSaleName) menuSaleName.textContent = sale.name || 'Estate Sale';
    if (menuSaleMeta) menuSaleMeta.textContent = metaText;

    // Dashboard large title block
    const dashTitle = document.getElementById('dashboard-large-title');
    const dashSubtitle = document.getElementById('dashboard-large-subtitle');
    if (dashTitle) dashTitle.textContent = sale.name || 'Estate Sale';
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

    // v174: don't flip isShared just because the user opened the Share Sale
    // sheet — that produced a SHARED badge before anyone actually joined.
    // The flag is set in confirmJoinSale on the joining device. Showing
    // SHARED on the originator after a real join needs a backend device-count
    // signal (logged in BACKLOG.md).

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
    this.headerElements.joinSaleConfirm.textContent = hasExistingSale ? 'Replace & Join' : 'Join Estate Sale';

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
    if (this.headerElements.joinCodeInput) {
      this.headerElements.joinCodeInput.value = '';
    }
    this._clearJoinCodeStatus();
    this._joinCodeInFlight = false;
    this.headerElements.joinInstructionModal.classList.add('visible');
  },

  _closeJoinInstruction() {
    this.headerElements.joinInstructionModal.classList.remove('visible');
    this._clearJoinCodeStatus();
  },

  _clearJoinCodeStatus() {
    const el = this.headerElements.joinCodeStatus;
    if (!el) return;
    el.hidden = true;
    el.textContent = '';
    el.classList.remove('join-code-status--error');
  },

  _showJoinCodeStatus(message, isError = false) {
    const el = this.headerElements.joinCodeStatus;
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
    el.classList.toggle('join-code-status--error', isError);
  },

  /**
   * Submit a 6-digit code from the join instruction sheet.
   * Defensive: trim + uppercase so legacy alphanumeric codes typed by hand
   * still resolve, even though new codes are pure digits.
   */
  async _submitJoinCode(rawCode) {
    if (this._joinCodeInFlight) return;
    const code = rawCode.trim().toUpperCase();
    if (code.length !== 6) return;

    this._joinCodeInFlight = true;
    this._showJoinCodeStatus('Looking up sale…', false);

    try {
      const remote = await Sync.fetchSaleByCode(code);
      if (!remote || !remote.shareCode) {
        throw new Error('No sale data');
      }

      // Blur the input so the iOS keyboard dismisses before the next sheet opens
      if (this.headerElements.joinCodeInput) this.headerElements.joinCodeInput.blur();

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

      this._closeJoinInstruction();
      const sale = Storage.getSale();
      this.showJoinConfirmation(this.pendingJoinData, !!sale);
    } catch (err) {
      console.warn('[join] code lookup failed:', err.message);
      this._showJoinCodeStatus("That code isn't active. Check with the organizer.", true);
      if (this.headerElements.joinCodeInput) {
        this.headerElements.joinCodeInput.value = '';
        this.headerElements.joinCodeInput.focus({ preventScroll: true });
      }
    } finally {
      this._joinCodeInFlight = false;
    }
  },

  /**
   * Clean the ?join= parameter from the URL
   */
  cleanJoinUrl() {
    // v203: preserve the hash. Earlier this stripped both the ?join= query
    // AND the fragment, which broke hash routing for any flow where a hash
    // happened to be present at join time.
    window.history.replaceState({}, '', window.location.pathname + window.location.hash);
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

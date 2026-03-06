/**
 * speech.js - Speech-to-Text Module for Estate Checkout
 * Uses Web Speech API to parse prices from spoken input
 *
 * Parsing rules:
 * - Number words converted to digits (one → 1, twenty → 20, etc.)
 * - X-fifty pattern: "seven fifty" → $7.50 (when X < 100)
 * - Hundred pattern: "two hundred" → $200, "three hundred fifty" → $350
 * - Description is everything before the price portion
 * - Filler words stripped: dollars, dollar, bucks, and, cents
 */

const Speech = {
  recognition: null,
  isListening: false,
  isSupported: false,
  waitingForResult: false,
  resultTimeout: null,
  processingHardTimeout: null,
  consecutiveFailures: 0,
  micPermissionState: 'prompt', // 'granted', 'denied', or 'prompt'
  buttonPressTime: null,
  buttonReleaseTime: null,
  _descMode: false,
  _descCallback: null,
  _recognitionStartedAt: null, // timestamp when recognition.start() was called
  _hasReceivedOnstart: false, // true after onstart fires (mic hardware ready)
  _noSpeechRetried: false, // prevent infinite retry loop for early no-speech
  _addItemMode: false, // true when speech triggered from Add Item sheet mic

  // Timeout before giving up on result (ms)
  RESULT_TIMEOUT: 5000,
  // Hard safety timeout for processing overlay (ms)
  PROCESSING_HARD_TIMEOUT: 8000,
  // Quick-tap threshold — under this duration, show hold guidance (ms)
  QUICK_TAP_THRESHOLD: 800,
  // Grace period for iOS early no-speech errors (ms)
  IOS_NO_SPEECH_GRACE: 2000,
  // localStorage keys
  MIC_TOOLTIP_KEY: 'estate_mic_tooltip_seen',
  MIC_PERMISSION_KEY: 'estate_mic_permission',

  // Tips for struggling users (indexed by failure count - 1)
  failureTips: [
    'Hold the button, speak clearly, then release.',
    'Try speaking slower and closer to the microphone.',
    'Say the item and price like: "blue vase fifteen dollars"',
    'Make sure you\'re in a quiet area. Background noise can interfere.',
    'Having trouble? Use the number pad instead — tap CANCEL and enter the price manually.'
  ],

  // Number word mappings
  numberWords: {
    'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4,
    'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9,
    'ten': 10, 'eleven': 11, 'twelve': 12, 'thirteen': 13,
    'fourteen': 14, 'fifteen': 15, 'sixteen': 16, 'seventeen': 17,
    'eighteen': 18, 'nineteen': 19, 'twenty': 20, 'thirty': 30,
    'forty': 40, 'fifty': 50, 'sixty': 60, 'seventy': 70,
    'eighty': 80, 'ninety': 90, 'hundred': 100
  },

  // Words to strip from transcript
  fillerWords: ['dollars', 'dollar', 'bucks', 'buck', 'and', 'cents', 'cent', 'a'],

  /**
   * Initialize speech recognition
   */
  init() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      this.isSupported = false;
      this.hideButton();
      return;
    }

    this.isSupported = true;
    this.ensureRecognition();

    this.cacheElements();
    this.bindEvents();
    this.checkPermissionState();
  },

  /**
   * Create (or recreate) the SpeechRecognition instance and bind its handlers.
   * Called on init and before each listening session to ensure iOS Safari
   * fully releases the microphone hardware between sessions.
   */
  ensureRecognition() {
    if (this.recognition) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-US';

    this.recognition.onstart = () => {
      this._hasReceivedOnstart = true;
      if (this.waitingForResult) {
        this.startResultTimeout();
      }
    };

    this.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      this.clearResultTimeout();
      this.waitingForResult = false;
      this.handleResult(transcript);
    };

    this.recognition.onerror = (event) => {
      // iOS fires no-speech almost instantly before mic hardware initializes.
      // Silently retry once if within the grace period.
      if (event.error === 'no-speech' && this._recognitionStartedAt &&
          (Date.now() - this._recognitionStartedAt) < this.IOS_NO_SPEECH_GRACE &&
          !this._noSpeechRetried) {
        this._noSpeechRetried = true;
        this.isListening = false;
        // Destroy and recreate to reset iOS audio state
        this.recognition = null;
        setTimeout(() => {
          if (this._descMode) {
            this.doStartDescriptionListening();
          } else {
            this.ensureRecognition();
            if (!this.recognition) return;
            try {
              this.recognition.start();
              this.isListening = true;
              this._recognitionStartedAt = Date.now();
            } catch (e) {}
          }
        }, 300);
        return;
      }

      this.clearResultTimeout();
      this.clearProcessingHardTimeout();
      this.isListening = false;
      this.waitingForResult = false;
      this._noSpeechRetried = false;
      const wasDescMode = this._descMode;
      this._descMode = false;
      this._descCallback = null;
      this.hideProcessing();
      this.updateMicUI(false);

      if (event.error === 'not-allowed') {
        this.showPermissionDeniedModal();
      } else if (event.error === 'no-speech') {
        if (!wasDescMode && this.isQuickTap()) {
          this.showQuickTapModal();
        } else if (!wasDescMode) {
          this.showFailModalWithTip('', 'no-speech');
        }
      } else if (event.error === 'network') {
        this.showFailModalWithTip('', 'network');
      } else if (event.error !== 'aborted') {
        this.showFailModalWithTip('', 'error');
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.clearResultTimeout();
      this.updateMicUI(false);

      if (this.waitingForResult) {
        this.waitingForResult = false;
        const wasDescMode = this._descMode;
        this._descMode = false;
        this._descCallback = null;
        this.hideProcessing();
        if (!wasDescMode && this.isQuickTap()) {
          this.showQuickTapModal();
        } else if (!wasDescMode) {
          this.showFailModalWithTip('', 'no-speech');
        }
      }
    };
  },

  /**
   * Check microphone permission state on init
   */
  async checkPermissionState() {
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const result = await navigator.permissions.query({ name: 'microphone' });
        this.micPermissionState = result.state;

        // Listen for permission changes (user might change in settings)
        result.addEventListener('change', () => {
          this.micPermissionState = result.state;
          if (result.state === 'granted') {
            localStorage.setItem(this.MIC_PERMISSION_KEY, 'granted');
          }
        });
        return;
      } catch (e) {
        // Permission API not available (iOS) — fall through to localStorage
      }
    }

    // Fallback for iOS: check persisted permission state
    const persisted = localStorage.getItem(this.MIC_PERMISSION_KEY);
    if (persisted === 'granted') {
      this.micPermissionState = 'granted';
    }
  },

  /**
   * Cache DOM elements
   */
  cacheElements() {
    this.elements = {
      processingOverlay: document.getElementById('speech-processing'),
      confirmModal: document.getElementById('speech-confirm-modal'),
      confirmDesc: document.getElementById('speech-confirm-desc'),
      confirmPrice: document.getElementById('speech-confirm-price'),
      confirmButton: document.getElementById('speech-confirm-btn'),
      editButton: document.getElementById('speech-edit-btn'),
      cancelButton: document.getElementById('speech-cancel-btn'),
      failModal: document.getElementById('speech-fail-modal'),
      failHeard: document.getElementById('speech-fail-heard'),
      failTranscript: document.getElementById('speech-fail-transcript'),
      failTip: document.getElementById('speech-fail-tip'),
      retryButton: document.getElementById('speech-retry-btn'),
      failCancelButton: document.getElementById('speech-fail-cancel-btn'),
      addItemMic: document.getElementById('add-item-mic'),
      permissionModal: document.getElementById('speech-permission-modal'),
      permissionTitle: document.getElementById('speech-permission-title'),
      permissionBody: document.getElementById('speech-permission-body'),
      permissionAllowBtn: document.getElementById('speech-permission-allow'),
      permissionDismissBtn: document.getElementById('speech-permission-dismiss'),
      micGuideModal: document.getElementById('mic-guide-modal'),
      micGuideBtn: document.getElementById('mic-guide-btn')
    };
  },

  /**
   * Bind mic button events using pointer events for cross-device support
   */
  bindEvents() {
    // Bind confirmation modal buttons
    if (this.elements.confirmButton) {
      this.elements.confirmButton.addEventListener('click', () => this.confirmAdd());
    }
    if (this.elements.editButton) {
      this.elements.editButton.addEventListener('click', () => this.editItem());
    }
    if (this.elements.cancelButton) {
      this.elements.cancelButton.addEventListener('click', () => this.hideConfirmModal());
    }
    if (this.elements.retryButton) {
      this.elements.retryButton.addEventListener('click', () => this.retryListening());
    }
    if (this.elements.failCancelButton) {
      this.elements.failCancelButton.addEventListener('click', () => this.hideFailModal());
    }

    // Close modals on overlay click
    if (this.elements.confirmModal) {
      this.elements.confirmModal.addEventListener('click', (e) => {
        if (e.target === this.elements.confirmModal) {
          this.hideConfirmModal();
        }
      });
    }
    if (this.elements.failModal) {
      this.elements.failModal.addEventListener('click', (e) => {
        if (e.target === this.elements.failModal) {
          this.hideFailModal();
        }
      });
    }

    // Permission modal buttons
    if (this.elements.permissionAllowBtn) {
      this.elements.permissionAllowBtn.addEventListener('click', () => {
        this.requestMicrophonePermission();
      });
    }
    if (this.elements.permissionDismissBtn) {
      this.elements.permissionDismissBtn.addEventListener('click', () => {
        this.hidePermissionModal();
      });
    }
    if (this.elements.permissionModal) {
      this.elements.permissionModal.addEventListener('click', (e) => {
        if (e.target === this.elements.permissionModal) {
          this.hidePermissionModal();
        }
      });
    }

    // Mic guide sheet dismiss
    if (this.elements.micGuideBtn) {
      this.elements.micGuideBtn.addEventListener('click', () => {
        this.hideMicGuide();
      });
    }
    if (this.elements.micGuideModal) {
      this.elements.micGuideModal.addEventListener('click', (e) => {
        if (e.target === this.elements.micGuideModal) {
          this.hideMicGuide();
        }
      });
    }

    // Add Item sheet mic button — hold-to-speak
    if (this.elements.addItemMic) {
      this.elements.addItemMic.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.elements.addItemMic.classList.add('listening');
        this._addItemMode = true;
        this.startListening();
      });

      const stopHandler = () => {
        this.elements.addItemMic.classList.remove('listening');
        this.onButtonRelease();
      };

      this.elements.addItemMic.addEventListener('pointerup', stopHandler);
      this.elements.addItemMic.addEventListener('pointerleave', stopHandler);
      this.elements.addItemMic.addEventListener('pointercancel', stopHandler);

      // Prevent iOS long-press context menu
      this.elements.addItemMic.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    // Release microphone when page loses focus
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.forceStopRecognition();
      }
    });

    window.addEventListener('pagehide', () => {
      this.forceStopRecognition();
    });
  },

  /**
   * Start listening (checks permission state first)
   */
  async startListening() {
    this.ensureRecognition();
    if (!this.recognition || this.isListening) return;

    // Check permission state
    if (this.micPermissionState === 'denied') {
      // Permission was previously denied - show settings message
      this.showPermissionDeniedModal(true);
      return;
    }

    if (this.micPermissionState === 'prompt') {
      // Permission not yet asked - show custom modal instead of starting recording
      this.showPermissionModal();
      return;
    }

    // Permission is granted - start recording normally
    this.doStartListening();
  },

  /**
   * Actually start the speech recognition (called after permission is confirmed)
   */
  doStartListening() {
    this.ensureRecognition();
    if (!this.recognition || this.isListening) return;

    // Show guide sheet on first mic use after permission grant (one-time)
    if (!localStorage.getItem(this.MIC_TOOLTIP_KEY)) {
      this.showMicGuide();
      return; // Don't start recognition — user reads guide first, then presses again
    }

    // Track button press time for quick-tap detection
    this.buttonPressTime = Date.now();
    this.buttonReleaseTime = null;

    try {
      this._recognitionStartedAt = Date.now();
      this._hasReceivedOnstart = false;
      this._noSpeechRetried = false;
      this.recognition.start();
      this.isListening = true;
      this.waitingForResult = false;
      this.updateMicUI(true);
    } catch (e) {
      // Recognition might already be running
    }
  },

  /**
   * Start description-only speech capture (tap-to-listen, no price parsing)
   * @param {function} callback - receives the transcript string
   */
  startDescriptionCapture(callback) {
    this.ensureRecognition();
    if (!this.recognition || this.isListening) return;

    this._descMode = true;
    this._descCallback = callback;

    if (this.micPermissionState === 'denied') {
      this._descMode = false;
      this._descCallback = null;
      this.showPermissionDeniedModal(true);
      return;
    }

    if (this.micPermissionState === 'prompt') {
      this.showPermissionModal();
      return;
    }

    this.doStartDescriptionListening();
  },

  /**
   * Start recognition for description-only mode (tap, not hold)
   */
  doStartDescriptionListening() {
    this.ensureRecognition();
    if (!this.recognition || this.isListening) return;

    this.buttonPressTime = Date.now();
    this.buttonReleaseTime = Date.now();

    try {
      this._recognitionStartedAt = Date.now();
      this._hasReceivedOnstart = false;
      this._noSpeechRetried = false;
      this.recognition.start();
      this.isListening = true;
      this.waitingForResult = true;
      this.showProcessing();
    } catch (e) {}
  },

  /**
   * Don't stop recognition - let it end naturally after detecting silence
   */
  onButtonRelease() {
    if (!this.isListening) return;

    // Track release time for quick-tap detection
    this.buttonReleaseTime = Date.now();

    // Update UI to show we're processing
    this.updateMicUI(false);
    this.showProcessing();
    this.waitingForResult = true;

    // Timeout will be started by recognition.onstart (after permission is granted)
    // This prevents timeout racing with permission popup
  },

  /**
   * Start the result timeout (called from onstart after mic is active)
   */
  startResultTimeout() {
    this.resultTimeout = setTimeout(() => {
      if (this.waitingForResult) {
        this.waitingForResult = false;
        try {
          this.recognition.stop();
        } catch (e) {}
        this.hideProcessing();
        this.showFailModalWithTip('', 'timeout');
      }
    }, this.RESULT_TIMEOUT);
  },

  /**
   * Update mic button UI state
   */
  updateMicUI(isListening) {
    if (this.elements.addItemMic) {
      this.elements.addItemMic.classList.toggle('listening', isListening);
    }
  },

  /**
   * Clear the result timeout
   */
  clearResultTimeout() {
    if (this.resultTimeout) {
      clearTimeout(this.resultTimeout);
      this.resultTimeout = null;
    }
  },

  /**
   * Force stop listening (for cancellation)
   */
  forceStopListening() {
    this.clearResultTimeout();
    this.waitingForResult = false;
    this.isListening = false;
    this.updateMicUI(false);
    this.hideProcessing();
    try {
      if (this.recognition) this.recognition.stop();
    } catch (e) {}
  },

  /**
   * Force stop all recognition activity and clean up UI completely
   * Used when page loses focus or needs immediate cleanup
   */
  forceStopRecognition() {
    // Clear all timeouts
    this.clearResultTimeout();
    this.clearProcessingHardTimeout();

    // Reset state
    this.waitingForResult = false;
    this.isListening = false;
    this.buttonPressTime = null;
    this.buttonReleaseTime = null;
    this._descMode = false;
    this._descCallback = null;
    this._recognitionStartedAt = null;
    this._hasReceivedOnstart = false;
    this._noSpeechRetried = false;
    this._addItemMode = false;

    // Hide all overlays and modals
    this.hideProcessing();
    this.hideConfirmModal();
    this.hideFailModal();
    this.hidePermissionModal();
    this.hideMicGuide();

    // Update mic UI
    this.updateMicUI(false);

    // Abort and destroy recognition instance so iOS Safari releases the mic hardware
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch (e) {}
      this.recognition = null;
    }

    // iOS Safari audio session release hint
    try { document.activeElement?.blur(); } catch (e) {}
  },

  /**
   * Clear the hard processing timeout
   */
  clearProcessingHardTimeout() {
    if (this.processingHardTimeout) {
      clearTimeout(this.processingHardTimeout);
      this.processingHardTimeout = null;
    }
  },

  /**
   * Handle speech recognition result
   */
  handleResult(transcript) {
    this.clearProcessingHardTimeout();
    this.hideProcessing();

    // Description-only mode: return raw transcript, no price parsing
    if (this._descMode) {
      const callback = this._descCallback;
      this._descMode = false;
      this._descCallback = null;
      this.consecutiveFailures = 0;
      if (callback) callback(transcript.trim());
      return;
    }

    const result = this.parse(transcript);

    if (result.price > 0) {
      // Success - reset failure counter
      this.consecutiveFailures = 0;

      // Add Item sheet mode: populate fields directly, skip confirm modal
      if (this._addItemMode) {
        this._addItemMode = false;
        Checkout.priceInput = result.price.toString();
        Checkout.updatePriceDisplay();
        if (Checkout.elements.addItemDesc) Checkout.elements.addItemDesc.value = result.description;
        return;
      }

      this.pendingResult = result;
      this.showConfirmModal(result);
    } else {
      this._addItemMode = false;
      this.showFailModalWithTip(transcript, 'parse');
    }
  },

  /**
   * Show processing overlay with hard safety timeout
   */
  showProcessing() {
    if (this.elements.processingOverlay) {
      this.elements.processingOverlay.hidden = false;
    }

    // Hard safety timeout - processing should never stay visible more than 8 seconds
    this.clearProcessingHardTimeout();
    this.processingHardTimeout = setTimeout(() => {
      if (this.waitingForResult) {
        this.waitingForResult = false;
        this.isListening = false;
        this.clearResultTimeout();
        this.hideProcessing();
        this.updateMicUI(false);
        this.showFailModalWithTip('', 'timeout');
      }
    }, this.PROCESSING_HARD_TIMEOUT);
  },

  /**
   * Hide processing overlay
   */
  hideProcessing() {
    this.clearProcessingHardTimeout();
    if (this.elements.processingOverlay) {
      this.elements.processingOverlay.hidden = true;
    }
  },

  /**
   * Parse a transcript into description and price
   * Exported for console testing: Speech.parse("blue vase fifteen dollars")
   */
  parse(transcript) {
    let text = transcript.toLowerCase().trim();

    // Handle direct numeric input (speech API sometimes returns digits)
    // Matches: "$25", "$5.50", "25", "5.50", "$1,000", "1,000"
    const directNumber = text.match(/^\$?([\d,]+(?:\.\d{1,2})?)\s*$/);
    if (directNumber) {
      const priceStr = directNumber[1].replace(/,/g, '');
      return { price: parseFloat(priceStr), description: '' };
    }

    // Check for $-prefixed price anywhere in the transcript
    // e.g., "rug $25" or "blue vase $5.50" or "lamp $1,000"
    const dollarMatch = text.match(/^(.+?)\s*\$([\d,]+(?:\.\d{1,2})?)\s*$/);
    if (dollarMatch) {
      const description = dollarMatch[1].trim();
      const priceStr = dollarMatch[2].replace(/,/g, '');
      return { price: parseFloat(priceStr), description: description };
    }

    // Also check for $ at the start with description after (less common but possible)
    const dollarStartMatch = text.match(/^\$([\d,]+(?:\.\d{1,2})?)\s+(.+)$/);
    if (dollarStartMatch) {
      const priceStr = dollarStartMatch[1].replace(/,/g, '');
      const description = dollarStartMatch[2].trim();
      return { price: parseFloat(priceStr), description: description };
    }

    // Tokenize the transcript
    let tokens = text.split(/\s+/);

    // Filter out filler words but keep track of positions
    tokens = tokens.filter(t => !this.fillerWords.includes(t));

    // Convert number words to numeric values
    const numericTokens = this.tokenizeNumbers(tokens);

    // Find the price portion (working backwards from end)
    const priceResult = this.extractPrice(numericTokens);

    if (priceResult.price <= 0) {
      return { price: 0, description: '' };
    }

    // Everything before the price is the description
    const descTokens = numericTokens.slice(0, priceResult.startIndex);
    const description = descTokens
      .map(t => t.original)
      .join(' ')
      .trim();

    return {
      price: priceResult.price,
      description: description
    };
  },

  /**
   * Convert tokens to include numeric values where applicable
   */
  tokenizeNumbers(tokens) {
    return tokens.map(token => {
      const numericValue = this.numberWords[token];
      if (numericValue !== undefined) {
        return { original: token, value: numericValue, isNumber: true };
      }

      // Check if it's a direct number
      const parsed = parseFloat(token);
      if (!isNaN(parsed)) {
        return { original: token, value: parsed, isNumber: true };
      }

      return { original: token, value: null, isNumber: false };
    });
  },

  /**
   * Extract price from the end of tokenized array
   * Returns { price: number, startIndex: number }
   */
  extractPrice(tokens) {
    if (tokens.length === 0) {
      return { price: 0, startIndex: 0 };
    }

    // Work backwards to find price patterns
    let i = tokens.length - 1;
    let price = 0;
    let startIndex = tokens.length;

    // Pattern 1: Single number at the end
    if (tokens[i].isNumber) {
      // Check for "X fifty" pattern (X < 100, cents pattern)
      // e.g., "seven fifty" → 7.50, "fifteen fifty" → 15.50
      if (i >= 1 && tokens[i].value === 50 && tokens[i - 1].isNumber) {
        const prevValue = tokens[i - 1].value;

        // Check if this is a "hundred fifty" pattern
        if (i >= 2 && tokens[i - 2].isNumber) {
          const beforePrev = tokens[i - 2].value;
          // "two hundred fifty" → 250 (hundred pattern)
          if (prevValue === 100) {
            price = beforePrev * 100 + 50;
            startIndex = i - 2;
            return { price, startIndex };
          }
          // "three hundred fifty" style where prevValue != 100
          // Should not happen in normal speech, but handle anyway
        }

        // "X fifty" where X < 100 means X dollars and 50 cents
        if (prevValue < 100 && prevValue !== 100) {
          price = prevValue + 0.50;
          startIndex = i - 1;
          return { price, startIndex };
        }
      }

      // Check for "X twenty-five" or other cents patterns (25, 75, etc.)
      if (i >= 1 && tokens[i - 1].isNumber && tokens[i].value < 100) {
        const prevValue = tokens[i - 1].value;
        const currentValue = tokens[i].value;

        // Check for hundred pattern first: "two hundred" or "two hundred fifty"
        if (prevValue === 100 && i >= 2 && tokens[i - 2].isNumber) {
          // "X hundred Y" → X*100 + Y
          price = tokens[i - 2].value * 100 + currentValue;
          startIndex = i - 2;
          return { price, startIndex };
        }

        // "fifteen" alone → $15.00 (not $0.15)
        // But "seven fifty" → $7.50
        // And "twenty five" alone → $25 (compound number, not cents)

        // Detect compound numbers: twenty five → 25, thirty two → 32
        if (prevValue >= 20 && prevValue <= 90 && prevValue % 10 === 0 && currentValue < 10) {
          // This is a compound like "twenty five" → 25
          price = prevValue + currentValue;
          startIndex = i - 1;
          return { price, startIndex };
        }

        // X fifty/twenty-five etc where X is small → cents pattern
        if (prevValue < 100 && (currentValue === 25 || currentValue === 50 || currentValue === 75)) {
          price = prevValue + (currentValue / 100);
          startIndex = i - 1;
          return { price, startIndex };
        }
      }

      // Check for "hundred" pattern: "two hundred"
      if (tokens[i].value === 100 && i >= 1 && tokens[i - 1].isNumber) {
        price = tokens[i - 1].value * 100;
        startIndex = i - 1;
        return { price, startIndex };
      }

      // Single number: treat as whole dollars
      price = tokens[i].value;
      startIndex = i;
      return { price, startIndex };
    }

    return { price: 0, startIndex: tokens.length };
  },

  /**
   * Show confirmation modal with parsed result
   */
  showConfirmModal(result) {
    if (!this.elements.confirmModal) return;

    const descText = result.description
      ? `Add "${result.description}"`
      : 'Add item';
    const priceText = Utils.formatCurrency(result.price);

    this.elements.confirmDesc.textContent = descText;
    this.elements.confirmPrice.textContent = priceText;
    this.elements.confirmModal.classList.add('visible');
  },

  /**
   * Hide confirmation modal
   */
  hideConfirmModal() {
    if (this.elements.confirmModal) {
      this.elements.confirmModal.classList.remove('visible');
    }
    this.pendingResult = null;
  },

  /**
   * Show parse failure modal with contextual tip
   */
  showFailModalWithTip(transcript, errorType) {
    if (!this.elements.failModal) return;

    // Increment failure counter
    this.consecutiveFailures++;

    // Set the transcript text
    if (transcript) {
      this.elements.failTranscript.textContent = `"${transcript}"`;
      if (this.elements.failHeard) {
        this.elements.failHeard.style.display = '';
      }
    } else {
      this.elements.failTranscript.textContent = '';
      if (this.elements.failHeard) {
        this.elements.failHeard.style.display = 'none';
      }
    }

    // Set the tip based on error type and failure count
    let tip = this.getTipForFailure(errorType);
    if (this.elements.failTip) {
      this.elements.failTip.textContent = tip;
    }

    this.elements.failModal.classList.add('visible');
  },

  /**
   * Get appropriate tip based on error type and failure count
   */
  getTipForFailure(errorType) {
    // Error-specific messages take priority
    if (errorType === 'no-speech' || errorType === 'timeout') {
      return 'No speech detected. Make sure your microphone is working and try again.';
    }
    if (errorType === 'network') {
      return 'Speech recognition requires an internet connection. Use the number pad while offline.';
    }
    if (errorType === 'not-supported') {
      return 'Speech recognition isn\'t supported on this browser. Use the number pad to enter prices.';
    }

    // Progressive tips based on failure count
    const tipIndex = Math.min(this.consecutiveFailures - 1, this.failureTips.length - 1);
    return this.failureTips[tipIndex];
  },

  /**
   * Show parse failure modal (legacy, calls new method)
   */
  showFailModal(transcript) {
    this.showFailModalWithTip(transcript, 'parse');
  },

  /**
   * Hide parse failure modal and reset UI state
   */
  hideFailModal() {
    if (this.elements.failModal) {
      this.elements.failModal.classList.remove('visible');
    }

    // Reset retry button visibility (may have been hidden for permission errors)
    if (this.elements.retryButton) {
      this.elements.retryButton.style.display = '';
    }

    // Reset title to default
    const title = document.getElementById('speech-fail-title');
    if (title) {
      title.textContent = 'Couldn\'t understand that';
    }
  },

  /**
   * Confirm and add the item
   */
  confirmAdd() {
    if (!this.pendingResult) return;

    const { price, description } = this.pendingResult;

    // Populate the Add Item sheet fields instead of auto-adding
    Checkout.priceInput = price.toString();
    Checkout.updatePriceDisplay();
    if (Checkout.elements.addItemDesc) Checkout.elements.addItemDesc.value = description;
    if (Checkout.elements.addItemModal) Checkout.elements.addItemModal.classList.add('visible');
    setTimeout(() => {
      if (Checkout.elements.addItemDesc) Checkout.elements.addItemDesc.focus();
    }, 100);

    this.hideConfirmModal();
  },

  /**
   * Edit mode - populate fields and let user adjust
   */
  editItem() {
    // Both confirm and edit now populate the Add Item sheet
    this.confirmAdd();
  },

  /**
   * Retry after failure - highlight button instead of auto-starting
   */
  retryListening() {
    this.hideFailModal();
    this.highlightMicButton();
  },

  /**
   * Highlight the mic button to draw attention to it
   */
  highlightMicButton() {
    if (!this.elements.addItemMic) return;
    // Ensure the Add Item sheet is visible so user can see the mic
    if (Checkout.elements.addItemModal) {
      Checkout.elements.addItemModal.classList.add('visible');
    }
    // Brief pulse to draw attention
    this.elements.addItemMic.classList.add('listening');
    setTimeout(() => {
      this.elements.addItemMic.classList.remove('listening');
    }, 600);
  },

  /**
   * Show permission denied modal
   * @param {boolean} previouslyDenied - true if permission was denied earlier
   */
  showPermissionDeniedModal(previouslyDenied = false) {
    if (!this.elements.failModal) return;

    // Hide "Heard:" section
    if (this.elements.failHeard) {
      this.elements.failHeard.style.display = 'none';
    }

    // Hide "Try Again" button for permission errors
    if (this.elements.retryButton) {
      this.elements.retryButton.style.display = 'none';
    }

    // Set appropriate message
    const title = document.getElementById('speech-fail-title');
    if (title) {
      title.textContent = 'Microphone access required';
    }

    if (this.elements.failTip) {
      if (previouslyDenied) {
        this.elements.failTip.textContent =
          'Microphone access was previously denied. To re-enable, go to your browser\'s site settings for this page and allow microphone access. Or use the number pad to enter prices.';
      } else {
        this.elements.failTip.textContent =
          'To use voice input, allow microphone access in your browser settings. Or use the number pad to enter prices.';
      }
    }

    this.elements.failModal.classList.add('visible');
  },

  /**
   * Show error flash
   */
  showError(message) {
    Checkout.showFlash('error', message);
  },

  /**
   * Hide the mic button if speech is not supported
   */
  hideButton() {
    // Hide the Add Item sheet mic button if speech not supported
    const addItemMic = document.getElementById('add-item-mic');
    if (addItemMic) addItemMic.style.display = 'none';
  },

  /**
   * Show the permission request modal
   */
  showPermissionModal() {
    if (!this.elements.permissionModal) return;

    // Reset to default content
    if (this.elements.permissionTitle) {
      this.elements.permissionTitle.textContent = 'Voice Input';
    }
    if (this.elements.permissionBody) {
      this.elements.permissionBody.textContent = 'Voice input needs microphone access to work.';
    }

    this.elements.permissionModal.classList.add('visible');
  },

  /**
   * Hide the permission request modal
   */
  hidePermissionModal() {
    if (this.elements.permissionModal) {
      this.elements.permissionModal.classList.remove('visible');
    }
    // Clean up description mode if user dismissed without granting
    this._descMode = false;
    this._descCallback = null;
  },

  /**
   * Request microphone permission via getUserMedia
   * This triggers the browser's native permission popup
   */
  async requestMicrophonePermission() {
    this.hidePermissionModal();

    try {
      // Request mic access - this triggers the browser's permission popup
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Permission granted - stop the stream immediately (we just needed the permission)
      stream.getTracks().forEach(track => track.stop());

      // Update and persist permission state
      this.micPermissionState = 'granted';
      localStorage.setItem(this.MIC_PERMISSION_KEY, 'granted');

      // If in description mode, auto-start listening now that permission is granted
      if (this._descMode) {
        this.doStartDescriptionListening();
        return;
      }

      // Highlight the Speak button to indicate it's ready
      this.highlightMicButton();

    } catch (e) {
      // Permission denied or error — clean up description mode
      this._descMode = false;
      this._descCallback = null;
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        this.micPermissionState = 'denied';
        this.showPermissionDeniedModal(false);
      } else {
        // Other error (e.g., no microphone available)
        this.showPermissionDeniedModal(false);
      }
    }
  },

  /**
   * Check if the recording was too short (quick tap instead of hold)
   */
  isQuickTap() {
    if (!this.buttonPressTime || !this.buttonReleaseTime) return false;
    // Don't treat as quick-tap if mic hardware never initialized (iOS slow start)
    if (!this._hasReceivedOnstart) return false;
    return (this.buttonReleaseTime - this.buttonPressTime) < this.QUICK_TAP_THRESHOLD;
  },

  /**
   * Show quick-tap guidance modal (reuses fail modal with custom copy)
   */
  showQuickTapModal() {
    if (!this.elements.failModal) return;

    // Hide "Heard:" section
    if (this.elements.failHeard) {
      this.elements.failHeard.style.display = 'none';
    }

    // Set title
    const title = document.getElementById('speech-fail-title');
    if (title) {
      title.textContent = 'Hold the button longer';
    }

    // Set guidance text
    if (this.elements.failTip) {
      this.elements.failTip.textContent =
        'Press and hold \uD83C\uDFA4 Speak while you say the price. Try something like \u201Ctwenty five dollars\u201D or \u201Clamp ten dollars.\u201D';
    }

    // Hide "Try Again" — user needs to learn the hold gesture first
    if (this.elements.retryButton) {
      this.elements.retryButton.style.display = 'none';
    }

    this.elements.failModal.classList.add('visible');
  },

  /**
   * Show mic guide sheet (one-time, on first mic use after permission grant)
   */
  showMicGuide() {
    if (!this.elements.micGuideModal) return;
    this.elements.micGuideModal.classList.add('visible');
  },

  /**
   * Hide mic guide sheet and mark as seen (only sets flag if actually visible)
   */
  hideMicGuide() {
    if (!this.elements.micGuideModal) return;

    const wasVisible = this.elements.micGuideModal.classList.contains('visible');
    this.elements.micGuideModal.classList.remove('visible');

    // Only mark as seen if the guide was actually displayed
    if (wasVisible) {
      localStorage.setItem(this.MIC_TOOLTIP_KEY, '1');
    }
  }
};

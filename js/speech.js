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
  consecutiveFailures: 0,

  // Timeout before giving up on result (ms)
  RESULT_TIMEOUT: 5000,

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
    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-US';

    this.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      this.clearResultTimeout();
      this.waitingForResult = false;
      this.handleResult(transcript);
    };

    this.recognition.onerror = (event) => {
      this.clearResultTimeout();
      this.isListening = false;
      this.waitingForResult = false;
      this.hideProcessing();
      this.updateMicUI(false);

      if (event.error === 'no-speech') {
        this.showFailModalWithTip('', 'no-speech');
      } else if (event.error === 'network') {
        this.showFailModalWithTip('', 'network');
      } else if (event.error !== 'aborted') {
        this.showFailModalWithTip('', 'error');
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      // If we were waiting for a result and didn't get one, show failure
      if (this.waitingForResult) {
        this.clearResultTimeout();
        this.waitingForResult = false;
        this.hideProcessing();
        this.updateMicUI(false);
        this.showFailModalWithTip('', 'no-speech');
      }
    };

    this.cacheElements();
    this.bindEvents();
  },

  /**
   * Cache DOM elements
   */
  cacheElements() {
    this.elements = {
      micButton: document.getElementById('mic-button'),
      micStatus: document.getElementById('mic-status'),
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
      failCancelButton: document.getElementById('speech-fail-cancel-btn')
    };
  },

  /**
   * Bind mic button events using pointer events for cross-device support
   */
  bindEvents() {
    const btn = this.elements.micButton;
    if (!btn) return;

    // Use pointer events for cross-device compatibility
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.startListening();
    });

    btn.addEventListener('pointerup', (e) => {
      e.preventDefault();
      this.onButtonRelease();
    });

    btn.addEventListener('pointerleave', (e) => {
      if (this.isListening) {
        this.onButtonRelease();
      }
    });

    btn.addEventListener('pointercancel', (e) => {
      if (this.isListening) {
        this.onButtonRelease();
      }
    });

    // Prevent context menu on long press (mobile)
    btn.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

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
  },

  /**
   * Start listening
   */
  startListening() {
    if (!this.recognition || this.isListening) return;

    try {
      this.recognition.start();
      this.isListening = true;
      this.waitingForResult = false;
      this.updateMicUI(true);
    } catch (e) {
      // Recognition might already be running
    }
  },

  /**
   * Called when user releases the mic button
   * Don't stop recognition - let it end naturally after detecting silence
   */
  onButtonRelease() {
    if (!this.isListening) return;

    // Update UI to show we're processing
    this.updateMicUI(false);
    this.showProcessing();
    this.waitingForResult = true;

    // Safety timeout - if no result in 5 seconds, fail gracefully
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
    if (this.elements.micButton) {
      if (isListening) {
        this.elements.micButton.classList.add('listening');
      } else {
        this.elements.micButton.classList.remove('listening');
      }
    }
    if (this.elements.micStatus) {
      this.elements.micStatus.hidden = !isListening;
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
   * Handle speech recognition result
   */
  handleResult(transcript) {
    this.hideProcessing();
    const result = this.parse(transcript);

    if (result.price > 0) {
      // Success - reset failure counter
      this.consecutiveFailures = 0;
      this.pendingResult = result;
      this.showConfirmModal(result);
    } else {
      this.showFailModalWithTip(transcript, 'parse');
    }
  },

  /**
   * Show processing overlay
   */
  showProcessing() {
    if (this.elements.processingOverlay) {
      this.elements.processingOverlay.hidden = false;
    }
  },

  /**
   * Hide processing overlay
   */
  hideProcessing() {
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
   * Hide parse failure modal
   */
  hideFailModal() {
    if (this.elements.failModal) {
      this.elements.failModal.classList.remove('visible');
    }
  },

  /**
   * Confirm and add the item
   */
  confirmAdd() {
    if (!this.pendingResult) return;

    const { price, description } = this.pendingResult;

    // Set the price and description in checkout
    Checkout.priceInput = price.toString();
    Checkout.updatePriceDisplay();
    Checkout.elements.descriptionInput.value = description;

    // Add the item
    Checkout.addItem();

    this.hideConfirmModal();
  },

  /**
   * Edit mode - populate fields and let user adjust
   */
  editItem() {
    if (!this.pendingResult) return;

    const { price, description } = this.pendingResult;

    // Populate the checkout fields
    Checkout.priceInput = price.toString();
    Checkout.updatePriceDisplay();
    Checkout.elements.descriptionInput.value = description;

    this.hideConfirmModal();
  },

  /**
   * Retry listening after failure
   */
  retryListening() {
    this.hideFailModal();
    // Small delay to let modal close
    setTimeout(() => {
      this.startListening();
    }, 100);
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
    if (this.elements && this.elements.micButton) {
      this.elements.micButton.style.display = 'none';
    } else {
      const btn = document.getElementById('mic-button');
      if (btn) btn.style.display = 'none';
    }
  }
};

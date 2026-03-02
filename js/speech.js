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
      this.handleResult(transcript);
    };

    this.recognition.onerror = (event) => {
      this.stopListening();
      if (event.error === 'no-speech') {
        this.showError("Didn't catch that — try again");
      } else if (event.error !== 'aborted') {
        this.showError("Didn't catch that — try again");
      }
    };

    this.recognition.onend = () => {
      this.stopListening();
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
      confirmModal: document.getElementById('speech-confirm-modal'),
      confirmDesc: document.getElementById('speech-confirm-desc'),
      confirmPrice: document.getElementById('speech-confirm-price'),
      confirmButton: document.getElementById('speech-confirm-btn'),
      editButton: document.getElementById('speech-edit-btn'),
      cancelButton: document.getElementById('speech-cancel-btn'),
      failModal: document.getElementById('speech-fail-modal'),
      failTranscript: document.getElementById('speech-fail-transcript'),
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
      this.stopListening();
    });

    btn.addEventListener('pointerleave', (e) => {
      if (this.isListening) {
        this.stopListening();
      }
    });

    btn.addEventListener('pointercancel', (e) => {
      if (this.isListening) {
        this.stopListening();
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
      this.elements.micButton.classList.add('listening');
    } catch (e) {
      // Recognition might already be running
    }
  },

  /**
   * Stop listening
   */
  stopListening() {
    if (!this.recognition) return;

    try {
      this.recognition.stop();
    } catch (e) {
      // Ignore errors when stopping
    }

    this.isListening = false;
    if (this.elements.micButton) {
      this.elements.micButton.classList.remove('listening');
    }
  },

  /**
   * Handle speech recognition result
   */
  handleResult(transcript) {
    const result = this.parse(transcript);

    if (result.price > 0) {
      this.pendingResult = result;
      this.showConfirmModal(result);
    } else {
      this.showFailModal(transcript);
    }
  },

  /**
   * Parse a transcript into description and price
   * Exported for console testing: Speech.parse("blue vase fifteen dollars")
   */
  parse(transcript) {
    let text = transcript.toLowerCase().trim();

    // Handle direct numeric input (speech API sometimes returns digits)
    const directNumber = text.match(/^\$?(\d+(?:\.\d{1,2})?)\s*$/);
    if (directNumber) {
      return { price: parseFloat(directNumber[1]), description: '' };
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
   * Show parse failure modal
   */
  showFailModal(transcript) {
    if (!this.elements.failModal) return;

    this.elements.failTranscript.textContent = `"${transcript}"`;
    this.elements.failModal.classList.add('visible');
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

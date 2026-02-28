/**
 * speech.js - Speech-to-Text Module for Estate Checkout
 * Uses Web Speech API to parse prices from spoken input
 *
 * TODO: Full implementation in next session
 * This is a stub that sets up the structure
 */

const Speech = {
  recognition: null,
  isListening: false,

  /**
   * Initialize speech recognition
   */
  init() {
    // Check for browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.log('Speech recognition not supported');
      this.hideButton();
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-US';

    this.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      this.parseAndFill(transcript);
    };

    this.recognition.onerror = (event) => {
      console.error('Speech error:', event.error);
      this.stopListening();
    };

    this.recognition.onend = () => {
      this.stopListening();
    };

    this.bindEvents();
  },

  /**
   * Bind mic button events
   */
  bindEvents() {
    const micButton = document.getElementById('mic-button');
    if (!micButton) return;

    // Press and hold to speak
    micButton.addEventListener('mousedown', () => this.startListening());
    micButton.addEventListener('mouseup', () => this.stopListening());
    micButton.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.startListening();
    });
    micButton.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.stopListening();
    });
  },

  /**
   * Start listening
   */
  startListening() {
    if (!this.recognition || this.isListening) return;

    try {
      this.recognition.start();
      this.isListening = true;
      document.getElementById('mic-button').classList.add('listening');
    } catch (e) {
      console.error('Failed to start speech recognition:', e);
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
    document.getElementById('mic-button').classList.remove('listening');
  },

  /**
   * Parse transcript and fill price/description
   * Examples:
   *   "blue vase fifteen dollars" -> description: "blue vase", price: 15.00
   *   "twenty-five fifty" -> price: 25.50
   *   "twelve" -> price: 12.00
   */
  parseAndFill(transcript) {
    const result = this.parsePrice(transcript);

    if (result.price > 0) {
      Checkout.setPriceFromSpeech(result.price, result.description);
    }
  },

  /**
   * Parse a price from a transcript
   * Returns { price: number, description: string }
   */
  parsePrice(transcript) {
    // TODO: Implement full parsing logic
    // For now, basic implementation

    let text = transcript.toLowerCase().trim();
    let price = 0;
    let description = '';

    // Common patterns to match
    const dollarPatterns = [
      /(\d+(?:\.\d{2})?)\s*dollars?/i,
      /\$(\d+(?:\.\d{2})?)/i,
      /(\d+)\s*(?:fifty|25|75)?\s*(?:cents?)?$/i
    ];

    // Try to extract dollar amount
    for (const pattern of dollarPatterns) {
      const match = text.match(pattern);
      if (match) {
        price = parseFloat(match[1]);
        // Remove the price part to get description
        description = text.replace(match[0], '').trim();
        break;
      }
    }

    // If no dollar pattern found, try to parse numbers
    if (price === 0) {
      const numberMatch = text.match(/(\d+(?:\.\d+)?)/);
      if (numberMatch) {
        price = parseFloat(numberMatch[1]);
        description = text.replace(numberMatch[0], '').trim();
      }
    }

    return { price, description };
  },

  /**
   * Hide the mic button if speech is not supported
   */
  hideButton() {
    const micButton = document.getElementById('mic-button');
    if (micButton) {
      micButton.style.display = 'none';
    }
  }
};

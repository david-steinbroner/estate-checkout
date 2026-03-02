/**
 * onboarding.js - First-Run Walkthrough for Estate Checkout
 * Shows introductory cards on first launch. Structured for future flow selection
 * (e.g., single-person vs. two-person checkout flows).
 */

const Onboarding = {
  STORAGE_KEY: 'estate_onboarding_seen',

  // Card sets — named for future flow selection
  cardSets: {
    single: [
      {
        icon: '📋',
        title: 'Set Up Your Sale',
        body: 'Name your sale, set your discount schedule, and tap Start Sale. Discounts apply automatically each day \u2014 no math needed.'
      },
      {
        icon: '💰',
        title: 'Ring Up Items',
        body: 'Tap in prices and hit Add Item. You can also tap \uD83C\uDFA4 Speak to say prices out loud. When the customer is done, tap Create Ticket.'
      },
      {
        icon: '✅',
        title: 'Mark It Paid',
        body: 'Open the Dashboard to see all your tickets. Tap a ticket and hit Mark as Paid when you collect payment. That\u2019s it!'
      }
    ]
  },

  currentCardIndex: 0,
  currentCards: [],

  // DOM element references
  elements: {},

  /**
   * Initialize onboarding module
   */
  init() {
    this.cacheElements();
    this.bindEvents();
  },

  /**
   * Cache DOM element references
   */
  cacheElements() {
    this.elements = {
      overlay: document.getElementById('onboarding-overlay'),
      card: document.getElementById('onboarding-card'),
      howItWorks: document.getElementById('setup-how-it-works')
    };
  },

  /**
   * Bind event listeners
   */
  bindEvents() {
    // "How It Works" link on setup screen
    if (this.elements.howItWorks) {
      this.elements.howItWorks.addEventListener('click', (e) => {
        e.preventDefault();
        this.show('single');
      });
    }

    // Backdrop click dismisses
    if (this.elements.overlay) {
      this.elements.overlay.addEventListener('click', (e) => {
        if (e.target === this.elements.overlay) {
          this.dismiss();
        }
      });
    }
  },

  /**
   * Check if onboarding should show on first launch
   */
  shouldShow() {
    return !localStorage.getItem(this.STORAGE_KEY);
  },

  /**
   * Show the walkthrough overlay
   */
  show(cardSetName) {
    this.currentCards = this.cardSets[cardSetName || 'single'];
    this.currentCardIndex = 0;
    this.renderCard(0);
    this.elements.overlay.classList.add('visible');
  },

  /**
   * Render a card by index
   */
  renderCard(index) {
    const card = this.currentCards[index];
    const isLast = index === this.currentCards.length - 1;

    // Step indicator dots
    const dots = this.currentCards.map((_, i) =>
      `<span class="onboarding__dot${i === index ? ' onboarding__dot--active' : ''}"></span>`
    ).join('');

    this.elements.card.innerHTML = `
      <div class="onboarding__dots">${dots}</div>
      <div class="onboarding__icon">${card.icon}</div>
      <h2 class="onboarding__title">${card.title}</h2>
      <p class="onboarding__body">${card.body}</p>
      <button class="onboarding__next" id="onboarding-next">${isLast ? 'Get Started' : 'Next'}</button>
      <button class="onboarding__skip" id="onboarding-skip">Skip</button>
    `;

    // Bind card button events (re-bound each render since innerHTML replaces them)
    document.getElementById('onboarding-next').addEventListener('click', () => {
      if (isLast) {
        this.dismiss();
      } else {
        this.currentCardIndex++;
        this.animateToCard(this.currentCardIndex);
      }
    });

    document.getElementById('onboarding-skip').addEventListener('click', () => {
      this.dismiss();
    });
  },

  /**
   * Animate transition between cards (fade out → swap → fade in)
   */
  animateToCard(index) {
    this.elements.card.classList.add('onboarding__card--fading');
    setTimeout(() => {
      this.renderCard(index);
      this.elements.card.classList.remove('onboarding__card--fading');
    }, 150);
  },

  /**
   * Dismiss the overlay and mark as seen
   */
  dismiss() {
    this.elements.overlay.classList.remove('visible');
    this.markSeen();
  },

  /**
   * Set localStorage flag so onboarding doesn't show again
   */
  markSeen() {
    localStorage.setItem(this.STORAGE_KEY, '1');
  }
};

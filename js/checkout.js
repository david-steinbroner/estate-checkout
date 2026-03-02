/**
 * checkout.js - Checkout Pad Logic for Estate Checkout
 * Handles number pad input, item list, and running total
 */

const Checkout = {
  // Current price being entered (stored as string for display)
  priceInput: '',

  // Current cart items
  items: [],

  // Current sale config (loaded from storage)
  sale: null,

  // Current discount percentage
  currentDiscount: 0,

  // Track "no description" prompts shown this session (not persisted)
  noDescPromptCount: 0,
  noDescPromptTimeout: null,

  // Track if we're in the middle of adding from prompt
  pendingAddWithoutDesc: false,

  // DOM element references
  elements: {},

  /**
   * Initialize the checkout pad
   */
  init() {
    this.cacheElements();
    this.bindEvents();
    this.loadSale();
    this.loadCart();
    this.render();
  },

  /**
   * Cache DOM element references for performance
   */
  cacheElements() {
    this.elements = {
      saleName: document.getElementById('sale-name'),
      saleDay: document.getElementById('sale-day'),
      discountBadge: document.getElementById('discount-badge'),
      itemList: document.getElementById('item-list'),
      runningTotal: document.getElementById('running-total'),
      runningSavings: document.getElementById('running-savings'),
      descriptionInput: document.getElementById('description-input'),
      priceDisplay: document.getElementById('price-display'),
      numpad: document.getElementById('numpad'),
      addButton: document.getElementById('add-button'),
      doneButton: document.getElementById('done-button'),
      clearButton: document.getElementById('clear-button'),
      clearModal: document.getElementById('clear-modal'),
      clearCancel: document.getElementById('clear-cancel'),
      clearConfirm: document.getElementById('clear-confirm'),
      collectPaymentsButton: document.getElementById('collect-payments-button'),
      dashboardButton: document.getElementById('checkout-dashboard-button'),
      endSaleButton: document.getElementById('end-sale-button'),
      endSaleModal: document.getElementById('end-sale-modal'),
      endSaleCancel: document.getElementById('end-sale-cancel'),
      endSaleConfirm: document.getElementById('end-sale-confirm'),
      flashSuccess: document.getElementById('flash-success'),
      flashError: document.getElementById('flash-error'),
      descPrompt: document.getElementById('desc-prompt'),
      descPromptAdd: document.getElementById('desc-prompt-add'),
      descPromptDesc: document.getElementById('desc-prompt-desc')
    };
  },

  /**
   * Bind event listeners
   */
  bindEvents() {
    // Number pad buttons
    this.elements.numpad.addEventListener('click', (e) => {
      const button = e.target.closest('.numpad__button');
      if (!button) return;

      const value = button.dataset.value;
      this.handleNumpadInput(value);
    });

    // Add button
    this.elements.addButton.addEventListener('click', () => {
      this.addItem();
    });

    // Done button
    this.elements.doneButton.addEventListener('click', () => {
      this.finishCheckout();
    });

    // Clear button
    this.elements.clearButton.addEventListener('click', () => {
      this.showClearModal();
    });

    // Clear modal cancel
    this.elements.clearCancel.addEventListener('click', () => {
      this.hideClearModal();
    });

    // Clear modal confirm
    this.elements.clearConfirm.addEventListener('click', () => {
      this.clearAll();
      this.hideClearModal();
    });

    // Close modal on overlay click
    this.elements.clearModal.addEventListener('click', (e) => {
      if (e.target === this.elements.clearModal) {
        this.hideClearModal();
      }
    });

    // Collect payments button - navigate to QR scan
    this.elements.collectPaymentsButton.addEventListener('click', () => {
      App.showScreen('scan');
    });

    // Dashboard button - navigate to dashboard
    this.elements.dashboardButton.addEventListener('click', () => {
      App.showScreen('dashboard', 'checkout');
    });

    // End sale button
    this.elements.endSaleButton.addEventListener('click', () => {
      this.showEndSaleModal();
    });

    // End sale modal cancel
    this.elements.endSaleCancel.addEventListener('click', () => {
      this.hideEndSaleModal();
    });

    // End sale modal confirm (stop propagation to prevent double-fire)
    this.elements.endSaleConfirm.addEventListener('click', (e) => {
      e.stopPropagation();
      this.endSale();
    });

    // Close end sale modal on overlay click
    this.elements.endSaleModal.addEventListener('click', (e) => {
      if (e.target === this.elements.endSaleModal) {
        this.hideEndSaleModal();
      }
    });

    // Description prompt buttons
    if (this.elements.descPromptAdd) {
      this.elements.descPromptAdd.addEventListener('click', () => {
        this.confirmAddWithoutDesc();
      });
    }

    if (this.elements.descPromptDesc) {
      this.elements.descPromptDesc.addEventListener('click', () => {
        this.focusDescription();
      });
    }

    // Description prompt overlay backdrop tap (add without description)
    if (this.elements.descPrompt) {
      this.elements.descPrompt.addEventListener('click', (e) => {
        // Only trigger if clicking the overlay itself, not the sheet
        if (e.target === this.elements.descPrompt) {
          this.confirmAddWithoutDesc();
        }
      });
    }
  },

  /**
   * Load sale configuration
   */
  loadSale() {
    this.sale = Storage.getSale();

    if (this.sale) {
      const dayNumber = Utils.getSaleDay(this.sale.startDate);
      this.currentDiscount = Utils.getDiscountForDay(this.sale, dayNumber);

      this.elements.saleName.textContent = this.sale.name;
      this.elements.saleDay.textContent = `Day ${dayNumber}`;

      if (this.currentDiscount > 0) {
        this.elements.discountBadge.textContent = `${this.currentDiscount}% off`;
        this.elements.discountBadge.classList.remove('header__discount--none');
      } else {
        this.elements.discountBadge.textContent = 'No discount';
        this.elements.discountBadge.classList.add('header__discount--none');
      }
    } else {
      // No active sale - use defaults for demo/testing
      this.elements.saleName.textContent = 'Estate Sale';
      this.elements.saleDay.textContent = 'Day 1';
      this.elements.discountBadge.textContent = 'No discount';
      this.elements.discountBadge.classList.add('header__discount--none');
    }
  },

  /**
   * Load cart from storage (for persistence across refreshes)
   */
  loadCart() {
    this.items = Storage.getCart();
  },

  /**
   * Handle number pad input
   */
  handleNumpadInput(value) {
    if (value === 'backspace') {
      this.priceInput = this.priceInput.slice(0, -1);
    } else if (value === '.') {
      // Only allow one decimal point
      if (!this.priceInput.includes('.')) {
        this.priceInput += value;
      }
    } else {
      // Prevent more than 2 decimal places
      const parts = this.priceInput.split('.');
      if (parts.length === 2 && parts[1].length >= 2) {
        return;
      }
      // Prevent leading zeros (except for "0.")
      if (this.priceInput === '0' && value !== '.') {
        this.priceInput = value;
      } else {
        this.priceInput += value;
      }
    }

    this.updatePriceDisplay();
  },

  /**
   * Update the price display
   */
  updatePriceDisplay() {
    const price = parseFloat(this.priceInput) || 0;
    this.elements.priceDisplay.textContent = Utils.formatCurrency(price);
  },

  /**
   * Add an item to the cart
   */
  addItem() {
    const price = parseFloat(this.priceInput);

    if (!price || price <= 0) {
      this.showFlash('error', 'Enter a price');
      return;
    }

    const description = this.elements.descriptionInput.value.trim();

    // Check if no description and we should prompt (first 3 times)
    if (!description && !this.pendingAddWithoutDesc && this.noDescPromptCount < 3) {
      this.showDescPrompt();
      return;
    }

    // Reset pending flag
    this.pendingAddWithoutDesc = false;

    const discountedPrice = Utils.applyDiscount(price, this.currentDiscount);

    const item = {
      id: Utils.generateId(),
      description: description,
      originalPrice: price,
      finalPrice: discountedPrice,
      discount: this.currentDiscount
    };

    this.items.push(item);
    Storage.saveCart(this.items);

    // Clear inputs
    this.priceInput = '';
    this.elements.descriptionInput.value = '';
    this.updatePriceDisplay();

    // Show feedback
    this.showFlash('success', 'Added!');

    // Re-render
    this.render();
  },

  /**
   * Remove an item from the cart
   */
  removeItem(itemId) {
    this.items = this.items.filter(item => item.id !== itemId);
    Storage.saveCart(this.items);
    this.render();
  },

  /**
   * Render the item list and running total
   */
  render() {
    this.renderItemList();
    this.renderRunningTotal();
    this.updateDoneButton();
  },

  /**
   * Render the item list
   */
  renderItemList() {
    if (this.items.length === 0) {
      this.elements.itemList.innerHTML = '<li class="item-list__empty">No items yet</li>';
      return;
    }

    const html = this.items.map(item => {
      const showOriginal = item.discount > 0;
      const hasDesc = item.description && item.description.trim().length > 0;

      return `
        <li class="item-row" data-id="${item.id}">
          ${hasDesc ? `<span class="item-row__desc">${this.escapeHtml(item.description)}</span>` : ''}
          <div class="item-row__prices${hasDesc ? '' : ' item-row__prices--full'}">
            ${showOriginal ? `<span class="item-row__original">${Utils.formatCurrency(item.originalPrice)}</span>` : ''}
            <span class="item-row__final">${Utils.formatCurrency(item.finalPrice)}</span>
          </div>
          <button class="item-row__remove" data-remove="${item.id}" aria-label="Remove item">×</button>
        </li>
      `;
    }).join('');

    this.elements.itemList.innerHTML = html;

    // Bind remove buttons
    this.elements.itemList.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.removeItem(btn.dataset.remove);
      });
    });

    // Scroll to bottom to show newest item
    this.elements.itemList.parentElement.scrollTop = this.elements.itemList.parentElement.scrollHeight;
  },

  /**
   * Render the running total and savings
   */
  renderRunningTotal() {
    const total = this.items.reduce((sum, item) => sum + item.finalPrice, 0);
    const originalTotal = this.items.reduce((sum, item) => sum + item.originalPrice, 0);
    const savings = originalTotal - total;

    this.elements.runningTotal.textContent = Utils.formatCurrency(total);

    // Only show savings if there's a discount active and items in cart
    if (savings > 0 && this.currentDiscount > 0) {
      this.elements.runningSavings.textContent = `Saved: ${Utils.formatCurrency(savings)}`;
      this.elements.runningSavings.style.display = '';
    } else {
      this.elements.runningSavings.textContent = '';
      this.elements.runningSavings.style.display = 'none';
    }
  },

  /**
   * Update done button state
   */
  updateDoneButton() {
    this.elements.doneButton.disabled = this.items.length === 0;
  },

  /**
   * Show the clear confirmation modal
   */
  showClearModal() {
    if (this.items.length === 0) return;
    this.elements.clearModal.classList.add('visible');
  },

  /**
   * Hide the clear confirmation modal
   */
  hideClearModal() {
    this.elements.clearModal.classList.remove('visible');
  },

  /**
   * Clear all items
   */
  clearAll() {
    this.items = [];
    Storage.clearCart();
    this.priceInput = '';
    this.elements.descriptionInput.value = '';
    this.updatePriceDisplay();
    this.render();
  },

  /**
   * Show the end sale confirmation modal
   */
  showEndSaleModal() {
    this.elements.endSaleModal.classList.add('visible');
  },

  /**
   * Hide the end sale confirmation modal
   */
  hideEndSaleModal() {
    this.elements.endSaleModal.classList.remove('visible');
  },

  /**
   * End the current sale and return to setup
   */
  endSale() {
    // Guard against double execution
    if (this._endingSale) return;
    this._endingSale = true;

    // Hide modal
    this.hideEndSaleModal();

    // Clear local state
    this.items = [];
    this.sale = null;
    this.currentDiscount = 0;
    this.priceInput = '';

    // Clear UI inputs
    if (this.elements.descriptionInput) {
      this.elements.descriptionInput.value = '';
    }
    this.updatePriceDisplay();
    this.render();

    // Clear storage
    SaleSetup.endSale();

    // Navigate to setup
    App.showScreen('setup');

    this._endingSale = false;
  },

  /**
   * Finish checkout and generate QR
   */
  finishCheckout() {
    if (this.items.length === 0) return;

    // Get next customer number (auto-increments per sale)
    const customerNumber = Storage.getNextCustomerNumber();

    // Save transaction for dashboard
    const transaction = {
      id: Utils.generateId(),
      timestamp: Utils.getTimestamp(),
      customerNumber: customerNumber,
      items: [...this.items],
      total: this.items.reduce((sum, item) => sum + item.finalPrice, 0),
      discount: this.currentDiscount,
      saleDay: this.sale ? Utils.getSaleDay(this.sale.startDate) : 1,
      // New status fields
      status: 'unpaid',
      paidAt: null,
      voidedAt: null,
      reopenedFrom: this.reopenedFromCustomer || null
    };

    // Clear reopened tracking
    this.reopenedFromCustomer = null;

    Storage.saveTransaction(transaction);

    // Clear cart after creating transaction (prevents duplicates)
    this.items = [];
    Storage.saveCart([]);

    // Navigate to QR screen
    App.showScreen('qr', transaction);
  },

  /**
   * Show the "no description" prompt
   */
  showDescPrompt() {
    if (!this.elements.descPrompt) return;

    this.elements.descPrompt.hidden = false;

    // Auto-dismiss after 3 seconds (add without description)
    this.noDescPromptTimeout = setTimeout(() => {
      this.confirmAddWithoutDesc();
    }, 3000);
  },

  /**
   * Hide the "no description" prompt
   */
  hideDescPrompt() {
    if (!this.elements.descPrompt) return;

    this.elements.descPrompt.hidden = true;

    // Clear timeout if set
    if (this.noDescPromptTimeout) {
      clearTimeout(this.noDescPromptTimeout);
      this.noDescPromptTimeout = null;
    }
  },

  /**
   * Confirm adding without description
   */
  confirmAddWithoutDesc() {
    this.hideDescPrompt();
    this.noDescPromptCount++;
    this.pendingAddWithoutDesc = true;
    this.addItem();
  },

  /**
   * Focus the description input instead of adding
   */
  focusDescription() {
    this.hideDescPrompt();
    this.elements.descriptionInput.focus();
  },

  /**
   * Show flash feedback
   */
  showFlash(type, message) {
    const flash = type === 'success' ? this.elements.flashSuccess : this.elements.flashError;
    flash.textContent = message;
    flash.classList.add('visible');

    setTimeout(() => {
      flash.classList.remove('visible');
    }, 800);
  },

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * Set price from speech input (called by speech.js)
   */
  setPriceFromSpeech(price, description) {
    this.priceInput = price.toString();
    this.updatePriceDisplay();

    if (description) {
      this.elements.descriptionInput.value = description;
    }
  }
};

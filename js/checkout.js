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
      descriptionInput: document.getElementById('description-input'),
      priceDisplay: document.getElementById('price-display'),
      numpad: document.getElementById('numpad'),
      addButton: document.getElementById('add-button'),
      doneButton: document.getElementById('done-button'),
      clearButton: document.getElementById('clear-button'),
      clearModal: document.getElementById('clear-modal'),
      clearCancel: document.getElementById('clear-cancel'),
      clearConfirm: document.getElementById('clear-confirm'),
      flashSuccess: document.getElementById('flash-success'),
      flashError: document.getElementById('flash-error')
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
      const desc = item.description || '(no description)';

      return `
        <li class="item-row" data-id="${item.id}">
          <span class="item-row__desc">${this.escapeHtml(desc)}</span>
          <div class="item-row__prices">
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
   * Render the running total
   */
  renderRunningTotal() {
    const total = this.items.reduce((sum, item) => sum + item.finalPrice, 0);
    this.elements.runningTotal.textContent = Utils.formatCurrency(total);
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
   * Finish checkout and generate QR
   */
  finishCheckout() {
    if (this.items.length === 0) return;

    // Save transaction for dashboard
    const transaction = {
      id: Utils.generateId(),
      timestamp: Utils.getTimestamp(),
      items: [...this.items],
      total: this.items.reduce((sum, item) => sum + item.finalPrice, 0),
      discount: this.currentDiscount,
      saleDay: this.sale ? Utils.getSaleDay(this.sale.startDate) : 1
    };

    Storage.saveTransaction(transaction);

    // Navigate to QR screen (will be implemented later)
    // For now, just show a flash
    this.showFlash('success', 'Checkout complete!');

    // TODO: App.showScreen('qr', transaction);
    console.log('Transaction saved:', transaction);
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

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

  // Track if we're in the middle of adding from prompt
  pendingAddWithoutDesc: false,

  // Reuse customer number when reopening a transaction (prevents void loop incrementing)
  reuseCustomerNumber: null,

  // Track if current cart has been saved as a transaction (prevents duplicates)
  transactionSaved: false,

  // Last transaction created (for re-navigation when transactionSaved is true)
  lastTransaction: null,

  // Item sheet state
  isSheetOpen: false,

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
      itemList: document.getElementById('item-list'),
      itemListContainer: document.getElementById('item-list-container'),
      itemListHint: document.getElementById('item-list-hint'),
      itemSheetBackdrop: document.getElementById('item-sheet-backdrop'),
      itemSheetList: document.getElementById('item-sheet-list'),
      itemSheetTitle: document.getElementById('item-sheet-title'),
      itemSheetClose: document.getElementById('item-sheet-close'),
      itemSheetDone: document.getElementById('item-sheet-done'),
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

    // Tap inline item list to open sheet
    if (this.elements.itemListContainer) {
      this.elements.itemListContainer.addEventListener('click', () => {
        if (this.items.length > 0) {
          this.openItemSheet();
        }
      });
    }

    // Hint strip tap to open sheet
    if (this.elements.itemListHint) {
      this.elements.itemListHint.addEventListener('click', () => {
        if (this.items.length > 0) {
          this.openItemSheet();
        }
      });
    }

    // Item sheet close/done/backdrop
    if (this.elements.itemSheetClose) {
      this.elements.itemSheetClose.addEventListener('click', () => {
        this.closeItemSheet();
      });
    }

    if (this.elements.itemSheetDone) {
      this.elements.itemSheetDone.addEventListener('click', () => {
        this.closeItemSheet();
      });
    }

    if (this.elements.itemSheetBackdrop) {
      this.elements.itemSheetBackdrop.addEventListener('click', (e) => {
        if (e.target === this.elements.itemSheetBackdrop) {
          this.closeItemSheet();
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
    } else {
      // No active sale - use defaults for demo/testing
      this.currentDiscount = 0;
    }
    // Header content is now updated by App.updateHeaderContent()
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
    // Close item sheet before adding
    this.closeItemSheet();

    const price = parseFloat(this.priceInput);

    if (!price || price <= 0) {
      this.showFlash('error', 'Enter a price');
      return;
    }

    const description = this.elements.descriptionInput.value.trim();

    // Prompt if no description entered (unless bypassed via speech or confirm)
    if (!description && !this.pendingAddWithoutDesc) {
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

    // Reset transaction saved flag (cart was modified)
    this.transactionSaved = false;

    // Clear inputs
    this.priceInput = '';
    this.elements.descriptionInput.value = '';
    this.updatePriceDisplay();

    // Re-render
    this.render();

    // Flash the newly added item row in the inline list
    const rows = this.elements.itemList.querySelectorAll('.item-row');
    if (rows.length > 0) {
      const lastRow = rows[rows.length - 1];
      lastRow.classList.add('item-row--just-added');
      lastRow.addEventListener('animationend', () => {
        lastRow.classList.remove('item-row--just-added');
      }, { once: true });
    }
  },

  /**
   * Remove an item from the cart
   */
  removeItem(itemId) {
    this.items = this.items.filter(item => item.id !== itemId);
    Storage.saveCart(this.items);

    // Reset transaction saved flag (cart was modified)
    this.transactionSaved = false;

    this.render();

    // Update sheet if open; close if cart is now empty
    if (this.isSheetOpen) {
      if (this.items.length === 0) {
        this.closeItemSheet();
      } else {
        this.renderItemSheet();
      }
    }
  },

  /**
   * Render the item list and running total
   */
  render() {
    this.renderItemList();
    this.renderRunningTotal();
    this.updateDoneButton();
    this.checkItemOverflow();
  },

  /**
   * Render the item list
   */
  renderItemList() {
    if (this.items.length === 0) {
      this.elements.itemList.innerHTML = '<li class="item-list__empty">No items yet</li>';
      return;
    }

    const html = this.items.map((item, index) => {
      const showOriginal = item.discount > 0;
      const hasDesc = item.description && item.description.trim().length > 0;
      const descClass = hasDesc ? 'item-row__desc' : 'item-row__desc item-row__desc--empty';
      const descText = hasDesc ? Utils.escapeHtml(item.description) : 'No description';

      return `
        <li class="item-row" data-id="${item.id}">
          <span class="item-row__number">${index + 1}.</span>
          <span class="${descClass}">${descText}</span>
          <div class="item-row__prices">
            ${showOriginal ? `<span class="item-row__original">${Utils.formatCurrency(item.originalPrice)}</span>` : ''}
            <span class="item-row__final">${Utils.formatCurrency(item.finalPrice)}</span>
          </div>
          <button class="item-row__remove" data-remove="${item.id}" aria-label="Remove item">×</button>
        </li>
      `;
    }).join('');

    this.elements.itemList.innerHTML = html;

    // Scroll to bottom to show newest item
    this.elements.itemListContainer.scrollTop = this.elements.itemListContainer.scrollHeight;
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
   * Open item list sheet with all items and remove buttons
   */
  openItemSheet() {
    if (this.isSheetOpen || this.items.length === 0) return;
    this.isSheetOpen = true;
    this.renderItemSheet();
    this.elements.itemSheetBackdrop.hidden = false;
  },

  /**
   * Close item list sheet
   */
  closeItemSheet() {
    if (!this.isSheetOpen) return;
    this.isSheetOpen = false;
    this.elements.itemSheetBackdrop.hidden = true;
  },

  /**
   * Render the item sheet contents
   */
  renderItemSheet() {
    this.elements.itemSheetTitle.textContent = `All Items (${this.items.length})`;

    const html = this.items.map((item, index) => {
      const showOriginal = item.discount > 0;
      const hasDesc = item.description && item.description.trim().length > 0;
      const descClass = hasDesc ? 'item-row__desc' : 'item-row__desc item-row__desc--empty';
      const descText = hasDesc ? Utils.escapeHtml(item.description) : 'No description';

      return `
        <li class="item-row" data-id="${item.id}">
          <span class="item-row__number">${index + 1}.</span>
          <span class="${descClass}">${descText}</span>
          <div class="item-row__prices">
            ${showOriginal ? `<span class="item-row__original">${Utils.formatCurrency(item.originalPrice)}</span>` : ''}
            <span class="item-row__final">${Utils.formatCurrency(item.finalPrice)}</span>
          </div>
          <button class="item-row__remove" data-remove="${item.id}" aria-label="Remove item">×</button>
        </li>
      `;
    }).join('');

    this.elements.itemSheetList.innerHTML = html;

    // Bind remove buttons in sheet
    this.elements.itemSheetList.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeItem(btn.dataset.remove);
      });
    });
  },

  /**
   * Check if items overflow inline view and show/hide hint strip
   */
  checkItemOverflow() {
    const container = this.elements.itemListContainer;
    const overflows = container.scrollHeight > container.clientHeight;
    if (overflows && this.items.length > 0) {
      this.elements.itemListHint.textContent = `View all ${this.items.length} items ›`;
      this.elements.itemListHint.classList.add('visible');
    } else if (this.items.length > 0) {
      // Even if they fit, show hint as a way to access sheet for remove
      this.elements.itemListHint.textContent = `${this.items.length} item${this.items.length === 1 ? '' : 's'} — tap to edit`;
      this.elements.itemListHint.classList.add('visible');
    } else {
      this.elements.itemListHint.classList.remove('visible');
    }
  },

  /**
   * Show the clear confirmation modal
   */
  showClearModal() {
    if (this.items.length === 0) return;
    this.closeItemSheet();
    this.elements.clearModal.classList.add('visible');
  },

  /**
   * Hide the clear confirmation modal
   */
  hideClearModal() {
    this.elements.clearModal.classList.remove('visible');
  },

  /**
   * Clear all items (used by NEW CUSTOMER and CLEAR ALL)
   */
  clearAll() {
    this.closeItemSheet();
    this.items = [];
    Storage.clearCart();
    this.priceInput = '';
    this.elements.descriptionInput.value = '';
    this.transactionSaved = false;
    this.lastTransaction = null;
    this.reuseCustomerNumber = null;
    this.updatePriceDisplay();
    this.render();
  },

  /**
   * End the current sale and return to setup
   */
  endSale() {
    // Guard against double execution
    if (this._endingSale) return;
    this._endingSale = true;

    // Clear local state
    this.items = [];
    this.sale = null;
    this.currentDiscount = 0;
    this.priceInput = '';
    this.transactionSaved = false;
    this.lastTransaction = null;
    this.reuseCustomerNumber = null;

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
    this.closeItemSheet();

    // If already saved (no modifications), re-navigate to QR with existing transaction
    if (this.transactionSaved && this.lastTransaction) {
      App.showScreen('qr', this.lastTransaction);
      return;
    }

    // Reuse customer number if reopening, otherwise get next
    const customerNumber = this.reuseCustomerNumber || Storage.getNextCustomerNumber();
    this.reuseCustomerNumber = null;

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
      status: 'pending',
      paidAt: null,
      voidedAt: null,
      reopenedFrom: this.reopenedFromCustomer || null
    };

    // Clear reopened tracking
    this.reopenedFromCustomer = null;

    Storage.saveTransaction(transaction);

    // Store transaction for re-navigation and mark as saved
    this.lastTransaction = transaction;
    this.transactionSaved = true;

    // DON'T clear cart here - let BACK return to items for review
    // Cart is cleared only by NEW CUSTOMER

    // Navigate to QR screen
    App.showScreen('qr', transaction);
  },

  /**
   * Show the "no description" prompt
   */
  showDescPrompt() {
    if (!this.elements.descPrompt) return;

    this.elements.descPrompt.classList.add('visible');
  },

  /**
   * Hide the "no description" prompt
   */
  hideDescPrompt() {
    if (!this.elements.descPrompt) return;

    this.elements.descPrompt.classList.remove('visible');
  },

  /**
   * Confirm adding without description
   */
  confirmAddWithoutDesc() {
    this.hideDescPrompt();
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

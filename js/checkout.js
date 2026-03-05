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

  // Ticket-level discount ({ type: 'percent'|'dollar', value: number } or null)
  ticketDiscount: null,

  // Track if we're in the middle of adding from prompt
  pendingAddWithoutDesc: false,

  // Pending price for description entry sheet
  pendingPrice: null,

  // Reuse customer number when reopening a transaction (prevents void loop incrementing)
  reuseCustomerNumber: null,

  // Current order number (for hint strip display)
  currentOrderNumber: null,

  // Custom order name (set via sheet title editing)
  orderCustomName: '',

  // Track if current cart has been saved as a transaction (prevents duplicates)
  transactionSaved: false,

  // Last transaction created (for re-navigation when transactionSaved is true)
  lastTransaction: null,

  // Item sheet state
  isSheetOpen: false,

  // Haggle sheet state — which item is being haggled
  haggleItemId: null,

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
    this.updateOrderNamePlaceholder();
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
      itemSheetSubtitle: document.getElementById('item-sheet-subtitle'),
      itemSheetClose: document.getElementById('item-sheet-close'),
      itemSheetDone: document.getElementById('item-sheet-done'),
      runningTotal: document.getElementById('running-total'),
      runningTotalBar: document.getElementById('running-total-bar'),
      runningTotalDot: document.getElementById('running-total-dot'),
      runningTotalChevron: document.getElementById('running-total-chevron'),
      runningTotalExpanded: document.getElementById('running-total-expanded'),
      runningTotalBreakdown: document.getElementById('running-total-breakdown'),
      runningTotalActions: document.getElementById('running-total-actions'),
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
      descPromptDesc: document.getElementById('desc-prompt-desc'),
      descEntryModal: document.getElementById('desc-entry-modal'),
      descEntryTitle: document.getElementById('desc-entry-title'),
      descEntryInput: document.getElementById('desc-entry-input'),
      descEntryConfirm: document.getElementById('desc-entry-confirm'),
      descEditModal: document.getElementById('desc-edit-modal'),
      descEditTitle: document.getElementById('desc-edit-title'),
      descEditInput: document.getElementById('desc-edit-input'),
      descEditSave: document.getElementById('desc-edit-save'),
      descEditCancel: document.getElementById('desc-edit-cancel'),
      // Haggle sheet
      haggleModal: document.getElementById('haggle-modal'),
      haggleTitle: document.getElementById('haggle-title'),
      haggleBreakdown: document.getElementById('haggle-breakdown'),
      haggleInput: document.getElementById('haggle-input'),
      hagglePreview: document.getElementById('haggle-preview'),
      haggleApply: document.getElementById('haggle-apply'),
      haggleRemove: document.getElementById('haggle-remove'),
      haggleCancel: document.getElementById('haggle-cancel'),
      // Ticket discount sheet
      ticketDiscountModal: document.getElementById('ticket-discount-modal'),
      ticketDiscountInput: document.getElementById('ticket-discount-input'),
      ticketDiscountPreview: document.getElementById('ticket-discount-preview'),
      ticketDiscountApply: document.getElementById('ticket-discount-apply'),
      ticketDiscountRemove: document.getElementById('ticket-discount-remove'),
      ticketDiscountCancel: document.getElementById('ticket-discount-cancel')
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

    // Description entry sheet
    if (this.elements.descEntryConfirm) {
      this.elements.descEntryConfirm.addEventListener('click', () => {
        this.confirmDescEntry();
      });
    }
    if (this.elements.descEntryInput) {
      this.elements.descEntryInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.confirmDescEntry();
      });
    }
    if (this.elements.descEntryModal) {
      this.elements.descEntryModal.addEventListener('click', (e) => {
        if (e.target === this.elements.descEntryModal) {
          this.hideDescEntry();
        }
      });
    }

    // Description edit sheet (editing existing item descriptions)
    if (this.elements.descEditSave) {
      this.elements.descEditSave.addEventListener('click', () => this.saveDescEdit());
    }
    if (this.elements.descEditCancel) {
      this.elements.descEditCancel.addEventListener('click', () => this.closeDescEdit());
    }
    if (this.elements.descEditInput) {
      this.elements.descEditInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.saveDescEdit();
      });
    }
    if (this.elements.descEditModal) {
      this.elements.descEditModal.addEventListener('click', (e) => {
        if (e.target === this.elements.descEditModal) this.closeDescEdit();
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
        this.openItemSheet();
      });
    }

    // Item sheet title tap to rename
    if (this.elements.itemSheetTitle) {
      this.elements.itemSheetTitle.addEventListener('click', () => {
        this.startEditingOrderName();
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

    // Haggle sheet events
    if (this.elements.haggleApply) {
      this.elements.haggleApply.addEventListener('click', () => this.applyHaggle());
    }
    if (this.elements.haggleRemove) {
      this.elements.haggleRemove.addEventListener('click', () => this.removeHaggle());
    }
    if (this.elements.haggleCancel) {
      this.elements.haggleCancel.addEventListener('click', () => this.closeHaggleSheet());
    }
    if (this.elements.haggleModal) {
      this.elements.haggleModal.addEventListener('click', (e) => {
        if (e.target === this.elements.haggleModal) this.closeHaggleSheet();
      });
      // Live preview on input/type change
      this.elements.haggleInput.addEventListener('input', () => this.updateHagglePreview());
      document.querySelectorAll('input[name="haggle-type"]').forEach(radio => {
        radio.addEventListener('change', () => this.updateHagglePreview());
      });
    }

    // Running total expand/collapse
    if (this.elements.runningTotalBar) {
      this.elements.runningTotalBar.addEventListener('click', (e) => {
        // Don't toggle if clicking inside actions (buttons)
        if (e.target.closest('.running-total__actions')) return;
        this.toggleTotalExpand();
      });
    }

    // Ticket discount sheet events
    if (this.elements.ticketDiscountApply) {
      this.elements.ticketDiscountApply.addEventListener('click', () => this.applyTicketDiscount());
    }
    if (this.elements.ticketDiscountRemove) {
      this.elements.ticketDiscountRemove.addEventListener('click', () => this.removeTicketDiscount());
    }
    if (this.elements.ticketDiscountCancel) {
      this.elements.ticketDiscountCancel.addEventListener('click', () => this.closeTicketDiscountSheet());
    }
    if (this.elements.ticketDiscountModal) {
      this.elements.ticketDiscountModal.addEventListener('click', (e) => {
        if (e.target === this.elements.ticketDiscountModal) this.closeTicketDiscountSheet();
      });
      this.elements.ticketDiscountInput.addEventListener('input', () => this.updateTicketDiscountPreview());
      document.querySelectorAll('input[name="ticket-discount-type"]').forEach(radio => {
        radio.addEventListener('change', () => this.updateTicketDiscountPreview());
      });
    }
  },

  /**
   * Load sale configuration
   */
  loadSale() {
    this.sale = Storage.getSale();

    if (this.sale) {
      const dayNumber = Utils.getSaleDay(this.sale.startDate, this.sale);
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
    const cart = Storage.getCart();
    this.items = cart.items;
    this.ticketDiscount = cart.ticketDiscount;

    // Migrate old items missing new discount fields
    this.items.forEach(item => {
      if (item.dayDiscount === undefined) {
        item.dayDiscount = item.discount || 0;
        item.dayDiscountedPrice = item.finalPrice;
        item.haggleType = null;
        item.haggleValue = null;
        delete item.discount;
      }
    });
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

    const description = '';

    // Prompt if no description entered (unless bypassed via speech or confirm)
    if (!description && !this.pendingAddWithoutDesc) {
      this.showDescPrompt();
      return;
    }

    // Reset pending flag
    this.pendingAddWithoutDesc = false;

    const dayDiscountedPrice = Utils.applyDiscount(price, this.currentDiscount);

    const item = {
      id: Utils.generateId(),
      description: description,
      originalPrice: price,
      dayDiscount: this.currentDiscount,
      dayDiscountedPrice: dayDiscountedPrice,
      haggleType: null,
      haggleValue: null,
      finalPrice: dayDiscountedPrice
    };

    this.items.push(item);
    this.saveCart();

    // Reset transaction saved flag (cart was modified)
    this.transactionSaved = false;

    // Clear inputs
    this.priceInput = '';
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
    this.saveCart();

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
    this.updateOrderNamePlaceholder();
  },

  /**
   * Update the hint strip text with order number and item count
   */
  updateOrderNamePlaceholder() {
    if (!this.elements.itemListHint) return;
    const num = this.reuseCustomerNumber || Storage.peekNextCustomerNumber();
    this.currentOrderNumber = num;
    const name = this.orderCustomName || `Order #${num}`;
    const count = this.items.length;
    if (count === 0) {
      this.elements.itemListHint.textContent = `${name} · tap to name`;
    } else if (count === 1) {
      this.elements.itemListHint.textContent = `${name} · 1 item`;
    } else {
      this.elements.itemListHint.textContent = `${name} · ${count} items`;
    }
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
      const hasDesc = item.description && item.description.trim().length > 0;
      const descClass = hasDesc ? 'item-row__desc' : 'item-row__desc item-row__desc--empty';
      const descText = hasDesc ? Utils.escapeHtml(item.description) : 'No description';

      return `
        <li class="item-row" data-id="${item.id}">
          <span class="item-row__number">${index + 1}.</span>
          <span class="${descClass}">${descText}</span>
          <div class="item-row__prices">
            ${this.renderItemPrices(item)}
          </div>
        </li>
      `;
    }).join('');

    this.elements.itemList.innerHTML = html;

    // Scroll to bottom to show newest item
    this.elements.itemListContainer.scrollTop = this.elements.itemListContainer.scrollHeight;
  },

  /**
   * Render price display for an item with stacking discount display
   * Shows: original → day discount → haggle (if applicable)
   */
  renderItemPrices(item) {
    const hasHaggle = item.haggleType && item.haggleValue;
    const hasDayDiscount = item.dayDiscount > 0;

    if (hasHaggle) {
      // Show full stacking: ~~original~~ ~~day-discounted~~ final
      return `
        <span class="item-row__original">${Utils.formatCurrency(item.originalPrice)}</span>
        ${hasDayDiscount ? `<span class="item-row__day-price">${Utils.formatCurrency(item.dayDiscountedPrice)}</span>` : ''}
        <span class="item-row__final">${Utils.formatCurrency(item.finalPrice)}</span>
      `;
    } else if (hasDayDiscount) {
      // Day discount only: ~~original~~ final
      return `
        <span class="item-row__original">${Utils.formatCurrency(item.originalPrice)}</span>
        <span class="item-row__final">${Utils.formatCurrency(item.finalPrice)}</span>
      `;
    } else {
      // No discounts
      return `<span class="item-row__final">${Utils.formatCurrency(item.finalPrice)}</span>`;
    }
  },

  /**
   * Render the running total and savings
   */
  // Total bar expanded state
  totalExpanded: false,

  renderRunningTotal() {
    const subtotal = this.items.reduce((sum, item) => sum + item.finalPrice, 0);
    const total = Utils.applyTicketDiscount(subtotal, this.ticketDiscount);

    // Collapsed: just the total
    this.elements.runningTotal.textContent = Utils.formatCurrency(total);

    // Dot indicator when ticket discount is active
    const hasTD = this.ticketDiscount && this.ticketDiscount.value && this.items.length > 0;
    if (this.elements.runningTotalDot) {
      this.elements.runningTotalDot.hidden = !hasTD;
    }

    // Expanded breakdown
    this.renderTotalBreakdown();
  },

  renderTotalBreakdown() {
    if (!this.elements.runningTotalBreakdown) return;

    const originalTotal = this.items.reduce((sum, item) => sum + item.originalPrice, 0);
    const dayDiscountedTotal = this.items.reduce((sum, item) => sum + (item.dayDiscountedPrice !== undefined ? item.dayDiscountedPrice : item.finalPrice), 0);
    const subtotal = this.items.reduce((sum, item) => sum + item.finalPrice, 0);
    const total = Utils.applyTicketDiscount(subtotal, this.ticketDiscount);
    const savings = originalTotal - total;

    const dayDiscount = originalTotal - dayDiscountedTotal;
    const haggleAdjustment = dayDiscountedTotal - subtotal;
    const ticketDiscountAmount = subtotal - total;
    const hasTD = this.ticketDiscount && this.ticketDiscount.value;

    let rows = '';

    if (this.items.length === 0) {
      rows = '<div class="running-total__breakdown-row">No items yet</div>';
    } else {
      rows += `<div class="running-total__breakdown-row"><span>Original total</span><span>${Utils.formatCurrency(originalTotal)}</span></div>`;

      if (dayDiscount > 0.005) {
        rows += `<div class="running-total__breakdown-row"><span>Day discount (${this.currentDiscount}%)</span><span>-${Utils.formatCurrency(dayDiscount)}</span></div>`;
      }
      if (Math.abs(haggleAdjustment) > 0.005) {
        rows += `<div class="running-total__breakdown-row"><span>Item adjustments</span><span>-${Utils.formatCurrency(Math.abs(haggleAdjustment))}</span></div>`;
      }

      if (hasTD) {
        rows += `<hr class="running-total__breakdown-divider">`;
        rows += `<div class="running-total__breakdown-row"><span>Subtotal</span><span>${Utils.formatCurrency(subtotal)}</span></div>`;
        const tdLabel = this.ticketDiscount.type === 'percent'
          ? `Ticket discount (${this.ticketDiscount.value}%)`
          : `Ticket discount`;
        rows += `<div class="running-total__breakdown-row"><span>${tdLabel}</span><span>-${Utils.formatCurrency(ticketDiscountAmount)}</span></div>`;
      }

      rows += `<div class="running-total__breakdown-row running-total__breakdown-row--total"><span>Total</span><span>${Utils.formatCurrency(total)}</span></div>`;

      if (savings > 0.005) {
        rows += `<div class="running-total__breakdown-row running-total__breakdown-row--saved"><span>Saved</span><span>${Utils.formatCurrency(savings)}</span></div>`;
      }
    }

    this.elements.runningTotalBreakdown.innerHTML = rows;

    // Ticket discount button in expanded view
    if (this.items.length > 0) {
      const btnLabel = hasTD ? 'Edit Ticket Discount' : 'Add Ticket Discount';
      let actionsHtml = `<button class="running-total__ticket-btn" id="total-ticket-btn">${btnLabel}</button>`;
      if (hasTD) {
        actionsHtml += `<button class="running-total__ticket-remove" id="total-ticket-remove">Remove</button>`;
      }
      this.elements.runningTotalActions.innerHTML = actionsHtml;

      // Bind buttons
      const ticketBtn = document.getElementById('total-ticket-btn');
      if (ticketBtn) ticketBtn.addEventListener('click', (e) => { e.stopPropagation(); this.openTicketDiscountSheet(); });
      const removeBtn = document.getElementById('total-ticket-remove');
      if (removeBtn) removeBtn.addEventListener('click', (e) => { e.stopPropagation(); this.removeTicketDiscount(); });
    } else {
      this.elements.runningTotalActions.innerHTML = '';
    }
  },

  toggleTotalExpand() {
    this.totalExpanded = !this.totalExpanded;
    if (this.elements.runningTotalExpanded) {
      this.elements.runningTotalExpanded.hidden = !this.totalExpanded;
    }
    if (this.elements.runningTotalChevron) {
      this.elements.runningTotalChevron.textContent = this.totalExpanded ? '▴' : '▾';
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
    if (this.isSheetOpen) return;
    this.isSheetOpen = true;
    this.renderItemSheet();
    this.elements.itemSheetBackdrop.classList.add('visible');
  },

  /**
   * Close item list sheet
   */
  closeItemSheet() {
    if (!this.isSheetOpen) return;
    this.isSheetOpen = false;
    this.elements.itemSheetBackdrop.classList.remove('visible');
  },

  /**
   * Render the item sheet contents
   */
  renderItemSheet() {
    const num = this.currentOrderNumber || Storage.peekNextCustomerNumber();
    const titleText = this.orderCustomName || `Order #${num}`;
    this.elements.itemSheetTitle.textContent = titleText;
    this.elements.itemSheetSubtitle.textContent = `All items (${this.items.length}) · tap title to rename`;

    if (this.items.length === 0) {
      this.elements.itemSheetList.innerHTML = '<li class="item-list__empty">No items yet</li>';
    } else {
      const html = this.items.map((item, index) => {
        const hasDesc = item.description && item.description.trim().length > 0;
        const descClass = hasDesc ? 'item-row__desc' : 'item-row__desc item-row__desc--empty';
        const descText = hasDesc ? Utils.escapeHtml(item.description) : 'No description';
        const haggleClass = (item.haggleType && item.haggleValue) ? ' item-row--haggled' : '';

        return `
          <li class="item-row${haggleClass}" data-id="${item.id}">
            <span class="item-row__number">${index + 1}.</span>
            <span class="${descClass}" data-edit-desc="${item.id}">${descText}</span>
            <div class="item-row__prices" data-edit-price="${item.id}">
              ${this.renderItemPrices(item)}
            </div>
            <button class="item-row__remove" data-remove="${item.id}" aria-label="Remove item">×</button>
          </li>
        `;
      }).join('');

      this.elements.itemSheetList.innerHTML = html;
    }

    // Bind remove buttons in sheet
    this.elements.itemSheetList.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeItem(btn.dataset.remove);
      });
    });

    // Bind tap-to-edit-description on desc spans
    this.elements.itemSheetList.querySelectorAll('[data-edit-desc]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openDescEdit(el.dataset.editDesc);
      });
    });

    // Bind tap-to-haggle on price area
    this.elements.itemSheetList.querySelectorAll('[data-edit-price]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openHaggleSheet(el.dataset.editPrice);
      });
    });
  },

  /**
   * Replace sheet title with an inline input for renaming the order
   */
  startEditingOrderName() {
    const titleEl = this.elements.itemSheetTitle;
    if (titleEl.querySelector('input')) return; // already editing

    const num = this.currentOrderNumber || Storage.peekNextCustomerNumber();
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'sheet__title-input';
    input.value = this.orderCustomName;
    input.placeholder = `Order #${num}`;
    input.maxLength = 30;

    titleEl.textContent = '';
    titleEl.appendChild(input);
    input.focus();

    const finish = () => {
      this.orderCustomName = input.value.trim();
      this.renderItemSheet();
      this.updateOrderNamePlaceholder();
    };

    input.addEventListener('blur', finish);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') input.blur();
    });
  },

  /**
   * Check item overflow (hint strip is always visible; text managed by updateOrderNamePlaceholder)
   */
  checkItemOverflow() {
    // Hint strip is always visible; text is set by updateOrderNamePlaceholder()
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
    this.ticketDiscount = null;
    Storage.clearCart();
    this.priceInput = '';
    this.orderCustomName = '';
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
    this.ticketDiscount = null;
    this.priceInput = '';
    this.orderCustomName = '';
    this.transactionSaved = false;
    this.lastTransaction = null;
    this.reuseCustomerNumber = null;

    // Clear UI inputs
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
    const subtotal = this.items.reduce((sum, item) => sum + item.finalPrice, 0);
    const total = Utils.applyTicketDiscount(subtotal, this.ticketDiscount);

    const transaction = {
      id: Utils.generateId(),
      timestamp: Utils.getTimestamp(),
      customerNumber: customerNumber,
      orderName: this.orderCustomName || '',
      items: [...this.items],
      subtotal: subtotal,
      total: total,
      ticketDiscount: this.ticketDiscount || null,
      discount: this.currentDiscount,
      saleDay: this.sale ? Utils.getSaleDay(this.sale.startDate, this.sale) : 1,
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
   * Show the description entry sheet for the pending price
   */
  focusDescription() {
    this.hideDescPrompt();
    this.pendingPrice = parseFloat(this.priceInput);
    if (!this.pendingPrice || this.pendingPrice <= 0) return;

    this.elements.descEntryTitle.textContent = `Item — ${Utils.formatCurrency(this.pendingPrice)}`;
    this.elements.descEntryInput.value = '';
    this.elements.descEntryModal.classList.add('visible');

    // Delay focus slightly so the sheet animation completes and keyboard avoidance kicks in
    setTimeout(() => this.elements.descEntryInput.focus(), 100);
  },

  /**
   * Confirm description entry and add item to cart
   */
  confirmDescEntry() {
    const description = this.elements.descEntryInput.value.trim();
    this.hideDescEntry();

    const price = this.pendingPrice;
    this.pendingPrice = null;
    if (!price || price <= 0) return;

    const dayDiscountedPrice = Utils.applyDiscount(price, this.currentDiscount);

    const item = {
      id: Utils.generateId(),
      description: description,
      originalPrice: price,
      dayDiscount: this.currentDiscount,
      dayDiscountedPrice: dayDiscountedPrice,
      haggleType: null,
      haggleValue: null,
      finalPrice: dayDiscountedPrice
    };

    this.items.push(item);
    this.saveCart();
    this.transactionSaved = false;

    this.priceInput = '';
    this.updatePriceDisplay();
    this.render();
    this.showFlash('success', 'Added!');
  },

  /**
   * Hide the description entry sheet
   */
  hideDescEntry() {
    if (!this.elements.descEntryModal) return;
    this.elements.descEntryModal.classList.remove('visible');
  },

  // ── Edit Description Sheet (for existing items) ──

  /**
   * Open the description edit sheet for an existing item
   */
  openDescEdit(itemId) {
    const item = this.items.find(i => i.id === itemId);
    if (!item) return;

    this.closeItemSheet();
    this._editDescItemId = itemId;

    const desc = item.description || '';
    const price = Utils.formatCurrency(item.finalPrice);
    this.elements.descEditTitle.textContent = `Edit Description — ${price}`;
    this.elements.descEditInput.value = desc;
    this.elements.descEditModal.classList.add('visible');
    setTimeout(() => this.elements.descEditInput.focus(), 100);
  },

  /**
   * Save the edited description and return to item sheet
   */
  saveDescEdit() {
    const item = this.items.find(i => i.id === this._editDescItemId);
    if (item) {
      item.description = this.elements.descEditInput.value.trim();
      this.saveCart();
      this.transactionSaved = false;
      this.render();
    }
    this._editDescItemId = null;
    this.elements.descEditModal.classList.remove('visible');
    if (this.items.length > 0) this.openItemSheet();
  },

  /**
   * Close the description edit sheet without saving
   */
  closeDescEdit() {
    this._editDescItemId = null;
    this.elements.descEditModal.classList.remove('visible');
    if (this.items.length > 0) this.openItemSheet();
  },

  /**
   * Save cart to storage (items + ticketDiscount)
   */
  saveCart() {
    Storage.saveCart(this.items, this.ticketDiscount);
  },

  // ── Haggle Sheet ──

  /**
   * Open the haggle sheet for a specific item
   */
  openHaggleSheet(itemId) {
    const item = this.items.find(i => i.id === itemId);
    if (!item) return;

    this.closeItemSheet();
    this.haggleItemId = itemId;

    // Set title and breakdown
    const desc = item.description || 'Item';
    const hasDayDiscount = item.dayDiscount > 0;
    let breakdown = `${Utils.escapeHtml(desc)} — ${Utils.formatCurrency(item.originalPrice)}`;
    if (hasDayDiscount) {
      breakdown += ` → ${Utils.formatCurrency(item.dayDiscountedPrice)} (${item.dayDiscount}% day discount)`;
    }
    this.elements.haggleTitle.textContent = 'Adjust Price';
    this.elements.haggleBreakdown.innerHTML = breakdown;

    // Pre-fill if item already has a haggle
    if (item.haggleType && item.haggleValue) {
      document.querySelector(`input[name="haggle-type"][value="${item.haggleType}"]`).checked = true;
      this.elements.haggleInput.value = item.haggleValue;
      this.elements.haggleRemove.hidden = false;
    } else {
      document.querySelector('input[name="haggle-type"][value="newprice"]').checked = true;
      this.elements.haggleInput.value = '';
      this.elements.haggleRemove.hidden = true;
    }

    this.updateHagglePreview();
    this.elements.haggleModal.classList.add('visible');
    this.elements.haggleInput.focus();
  },

  /**
   * Update haggle preview based on current input
   */
  updateHagglePreview() {
    const item = this.items.find(i => i.id === this.haggleItemId);
    if (!item) return;

    const type = document.querySelector('input[name="haggle-type"]:checked')?.value;
    const rawValue = parseFloat(this.elements.haggleInput.value) || 0;

    const newFinal = Utils.applyHaggle(item.dayDiscountedPrice, type, rawValue);
    this.elements.hagglePreview.textContent = `New price: ${Utils.formatCurrency(newFinal)}`;
  },

  /**
   * Apply the haggle discount to the item
   */
  applyHaggle() {
    const item = this.items.find(i => i.id === this.haggleItemId);
    if (!item) return;

    const type = document.querySelector('input[name="haggle-type"]:checked')?.value;
    const rawValue = parseFloat(this.elements.haggleInput.value) || 0;

    if (!rawValue) {
      this.showFlash('error', 'Enter a value');
      return;
    }

    item.haggleType = type;
    item.haggleValue = rawValue;
    item.finalPrice = Utils.applyHaggle(item.dayDiscountedPrice, type, rawValue);

    this.saveCart();
    this.transactionSaved = false;
    this.closeHaggleSheet();
    this.render();
    this.showFlash('success', 'Discount applied!');
  },

  /**
   * Remove haggle discount from the current item
   */
  removeHaggle() {
    const item = this.items.find(i => i.id === this.haggleItemId);
    if (!item) return;

    item.haggleType = null;
    item.haggleValue = null;
    item.finalPrice = item.dayDiscountedPrice;

    this.saveCart();
    this.transactionSaved = false;
    this.closeHaggleSheet();
    this.render();
    this.showFlash('success', 'Discount removed');
  },

  /**
   * Close the haggle sheet
   */
  closeHaggleSheet() {
    this.haggleItemId = null;
    this.elements.haggleModal.classList.remove('visible');
    // Reopen item sheet (was closed when haggle opened)
    if (this.items.length > 0) this.openItemSheet();
  },

  // ── Ticket Discount Sheet ──

  /**
   * Open the ticket discount sheet
   */
  openTicketDiscountSheet() {
    const subtotal = this.items.reduce((sum, item) => sum + item.finalPrice, 0);

    // Pre-fill if ticket discount exists
    if (this.ticketDiscount && this.ticketDiscount.value) {
      document.querySelector(`input[name="ticket-discount-type"][value="${this.ticketDiscount.type}"]`).checked = true;
      this.elements.ticketDiscountInput.value = this.ticketDiscount.value;
      this.elements.ticketDiscountRemove.hidden = false;
    } else {
      document.querySelector('input[name="ticket-discount-type"][value="percent"]').checked = true;
      this.elements.ticketDiscountInput.value = '';
      this.elements.ticketDiscountRemove.hidden = true;
    }

    this.updateTicketDiscountPreview();
    this.elements.ticketDiscountModal.classList.add('visible');
    this.elements.ticketDiscountInput.focus();
  },

  /**
   * Update ticket discount preview
   */
  updateTicketDiscountPreview() {
    const subtotal = this.items.reduce((sum, item) => sum + item.finalPrice, 0);
    const type = document.querySelector('input[name="ticket-discount-type"]:checked')?.value;
    const rawValue = parseFloat(this.elements.ticketDiscountInput.value) || 0;

    const newTotal = Utils.applyTicketDiscount(subtotal, { type, value: rawValue });
    this.elements.ticketDiscountPreview.textContent = `Total: ${Utils.formatCurrency(newTotal)}`;
  },

  /**
   * Apply the ticket discount
   */
  applyTicketDiscount() {
    const type = document.querySelector('input[name="ticket-discount-type"]:checked')?.value;
    const rawValue = parseFloat(this.elements.ticketDiscountInput.value) || 0;

    if (!rawValue) {
      this.showFlash('error', 'Enter a value');
      return;
    }

    this.ticketDiscount = { type, value: rawValue };
    this.saveCart();
    this.transactionSaved = false;
    this.closeTicketDiscountSheet();
    this.render();
    this.showFlash('success', 'Ticket discount applied!');
  },

  /**
   * Remove the ticket discount
   */
  removeTicketDiscount() {
    this.ticketDiscount = null;
    this.saveCart();
    this.transactionSaved = false;
    this.closeTicketDiscountSheet();
    this.render();
    this.showFlash('success', 'Ticket discount removed');
  },

  /**
   * Close the ticket discount sheet
   */
  closeTicketDiscountSheet() {
    this.elements.ticketDiscountModal.classList.remove('visible');
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

  }
};

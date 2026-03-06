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

  // Invoice-level discount ({ type: 'percent'|'dollar', value: number } or null)
  ticketDiscount: null,


  // Reuse customer number when reopening a transaction (prevents void loop incrementing)
  reuseCustomerNumber: null,

  // Current invoice number (for total bar display)
  currentOrderNumber: null,

  // Custom invoice name (set via sheet title editing)
  orderCustomName: '',

  // Track if current cart has been saved as a transaction (prevents duplicates)
  transactionSaved: false,

  // Last transaction created (for re-navigation when transactionSaved is true)
  lastTransaction: null,

  // Draft transaction ID (for open invoice persistence on dashboard)
  draftTransactionId: null,

  // Editing state: tracks when editing an existing invoice (lazy voiding)
  editingInvoiceId: null,
  editingInvoiceDirty: false,

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
      runningTotalInfo: document.getElementById('running-total-info'),
      itemSheetBackdrop: document.getElementById('item-sheet-backdrop'),
      itemSheetList: document.getElementById('item-sheet-list'),
      itemSheetTitle: document.getElementById('item-sheet-title'),
      itemSheetSubtitle: document.getElementById('item-sheet-subtitle'),
      itemSheetDone: document.getElementById('item-sheet-done'),
      runningTotal: document.getElementById('running-total'),
      runningTotalBar: document.getElementById('running-total-bar'),
      addItemButton: document.getElementById('add-item-button'),
      doneButton: document.getElementById('done-button'),
      clearButton: document.getElementById('clear-button'),
      clearModal: document.getElementById('clear-modal'),
      clearCancel: document.getElementById('clear-cancel'),
      clearConfirm: document.getElementById('clear-confirm'),
      flashSuccess: document.getElementById('flash-success'),
      flashError: document.getElementById('flash-error'),
      // Add Item sheet
      addItemModal: document.getElementById('add-item-modal'),
      addItemDesc: document.getElementById('add-item-desc'),
      addItemPrice: document.getElementById('add-item-price'),
      addItemMic: document.getElementById('add-item-mic'),
      addItemConfirm: document.getElementById('add-item-confirm'),
      numpad: document.getElementById('numpad'),
      // Haggle sheet
      haggleModal: document.getElementById('haggle-modal'),
      haggleTitle: document.getElementById('haggle-title'),
      haggleBreakdown: document.getElementById('haggle-breakdown'),
      haggleInput: document.getElementById('haggle-input'),
      hagglePreview: document.getElementById('haggle-preview'),
      haggleApply: document.getElementById('haggle-apply'),
      haggleRemove: document.getElementById('haggle-remove'),
      haggleCancel: document.getElementById('haggle-cancel'),
      // Invoice discount sheet
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
    // Add Item button in action bar
    this.elements.addItemButton.addEventListener('click', () => {
      this.openAddItemSheet();
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

    // Add Item sheet events
    if (this.elements.numpad) {
      this.elements.numpad.addEventListener('click', (e) => {
        const button = e.target.closest('.numpad__button');
        if (!button) return;
        this.handleNumpadInput(button.dataset.value);
      });
    }
    if (this.elements.addItemConfirm) {
      this.elements.addItemConfirm.addEventListener('click', () => {
        this.confirmAddItem();
      });
    }
    // Mic button pointer events are bound in Speech.bindEvents()
    // (hold-to-speak with full price+description parsing)
    if (this.elements.addItemDesc) {
      this.elements.addItemDesc.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.elements.addItemDesc.blur();
        }
      });
    }
    if (this.elements.addItemModal) {
      this.elements.addItemModal.addEventListener('click', (e) => {
        if (e.target === this.elements.addItemModal) {
          this.closeAddItemSheet();
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

    // Total bar tap to open item sheet
    if (this.elements.runningTotalBar) {
      this.elements.runningTotalBar.addEventListener('click', () => {
        this.openItemSheet();
      });
    }

    // Item sheet title tap to rename
    if (this.elements.itemSheetTitle) {
      this.elements.itemSheetTitle.addEventListener('click', () => {
        this.startEditingOrderName();
      });
    }

    // Item sheet done/backdrop
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

    // Invoice discount sheet events
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

    // Reconnect draft transaction ID
    const draftId = Storage.getDraftTxnId();
    if (draftId) {
      const draft = Storage.getTransaction(draftId);
      if (draft && draft.status === 'open') {
        this.draftTransactionId = draftId;
      } else {
        // Draft no longer exists or isn't open — clean up
        Storage.clearDraftTxnId();
        this.draftTransactionId = null;
      }
    }
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
    if (this.elements.addItemPrice) {
      this.elements.addItemPrice.textContent = Utils.formatCurrency(price);
    }
  },

  /**
   * Open the Add Item bottom sheet
   */
  openAddItemSheet() {
    this.closeItemSheet();
    this.priceInput = '';
    this.updatePriceDisplay();
    if (this.elements.addItemDesc) this.elements.addItemDesc.value = '';
    if (this.elements.addItemModal) this.elements.addItemModal.classList.add('visible');
  },

  /**
   * Close the Add Item bottom sheet
   */
  closeAddItemSheet() {
    if (this.elements.addItemModal) this.elements.addItemModal.classList.remove('visible');
  },

  /**
   * Confirm adding item from the Add Item sheet
   */
  confirmAddItem() {
    this.checkEditDirty();

    const price = parseFloat(this.priceInput);
    if (!price || price <= 0) {
      this.showFlash('error', 'Enter a price');
      return;
    }

    const description = this.elements.addItemDesc ? this.elements.addItemDesc.value.trim() : '';
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
    this.saveDraftTransaction();
    this.transactionSaved = false;

    // Clear sheet inputs for next item
    this.priceInput = '';
    this.updatePriceDisplay();
    if (this.elements.addItemDesc) this.elements.addItemDesc.value = '';

    // Close sheet and re-render
    this.closeAddItemSheet();
    this.render();
    this.showFlash('success', 'Added!');

    // Flash the newly added item row
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
    this.checkEditDirty();
    this.items = this.items.filter(item => item.id !== itemId);
    this.saveCart();
    this.saveDraftTransaction();

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
   * Update the total bar text with invoice number and item count
   */
  updateOrderNamePlaceholder() {
    if (!this.elements.runningTotalInfo) return;
    const num = this.reuseCustomerNumber || Storage.peekNextCustomerNumber();
    this.currentOrderNumber = num;
    const name = this.orderCustomName || `Order #${num}`;
    const count = this.items.length;
    if (count === 0) {
      this.elements.runningTotalInfo.textContent = `${name} · tap to name`;
    } else if (count === 1) {
      this.elements.runningTotalInfo.textContent = `${name} · 1 item`;
    } else {
      this.elements.runningTotalInfo.textContent = `${name} · ${count} items`;
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
  renderRunningTotal() {
    const subtotal = this.items.reduce((sum, item) => sum + item.finalPrice, 0);
    const total = Utils.applyTicketDiscount(subtotal, this.ticketDiscount);
    this.elements.runningTotal.textContent = Utils.formatCurrency(total);
  },

  /**
   * Update done button state and text
   */
  updateDoneButton() {
    this.elements.doneButton.disabled = this.items.length === 0;
    this.updateDoneButtonText();
  },

  /**
   * Update done button text based on editing state
   */
  updateDoneButtonText() {
    if (this.transactionSaved && this.lastTransaction) {
      this.elements.doneButton.textContent = 'See Invoice';
    } else if (this.editingInvoiceId && !this.editingInvoiceDirty) {
      this.elements.doneButton.textContent = 'See Invoice';
    } else if (this.editingInvoiceDirty) {
      this.elements.doneButton.textContent = 'Create New Invoice';
    } else {
      this.elements.doneButton.textContent = 'Create Invoice';
    }
  },

  /**
   * Check if we're editing an invoice and this is the first mutation.
   * If so, void the original invoice and transition to "new order" mode.
   */
  checkEditDirty() {
    if (this.editingInvoiceId && !this.editingInvoiceDirty) {
      this.editingInvoiceDirty = true;
      // Void the original invoice now
      Storage.updateTransaction(this.editingInvoiceId, {
        status: 'void',
        voidedAt: Utils.getTimestamp(),
        voidReason: 'Edited'
      });
      this.editingInvoiceId = null;
      this.transactionSaved = false;
      this.lastTransaction = null;
      this.updateDoneButtonText();
    }
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

    // Bind tap-to-edit-description inline
    this.elements.itemSheetList.querySelectorAll('[data-edit-desc]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        this.startInlineDescEdit(el.dataset.editDesc, el);
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
   * Replace sheet title with an inline input for renaming the invoice
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
   * Check item overflow (total bar text managed by updateOrderNamePlaceholder)
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
    // Delete any open draft from dashboard
    if (this.draftTransactionId) {
      Storage.deleteTransaction(this.draftTransactionId);
      Storage.clearDraftTxnId();
      this.draftTransactionId = null;
    }
    this.items = [];
    this.ticketDiscount = null;
    Storage.clearCart();
    this.priceInput = '';
    this.orderCustomName = '';
    this.transactionSaved = false;
    this.lastTransaction = null;
    this.reuseCustomerNumber = null;
    this.editingInvoiceId = null;
    this.editingInvoiceDirty = false;
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

    // Delete any open draft
    if (this.draftTransactionId) {
      Storage.deleteTransaction(this.draftTransactionId);
      Storage.clearDraftTxnId();
      this.draftTransactionId = null;
    }

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
    this.editingInvoiceId = null;
    this.editingInvoiceDirty = false;

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

    // If editing an invoice but no changes made, just show the existing invoice
    if (this.editingInvoiceId && !this.editingInvoiceDirty) {
      const existingTxn = Storage.getTransaction(this.editingInvoiceId);
      if (existingTxn) {
        App.showScreen('qr', existingTxn);
        return;
      }
    }

    // Reuse customer number if reopening, otherwise get next
    const customerNumber = this.reuseCustomerNumber || Storage.getNextCustomerNumber();
    this.reuseCustomerNumber = null;

    // Save transaction for dashboard
    const subtotal = this.items.reduce((sum, item) => sum + item.finalPrice, 0);
    const total = Utils.applyTicketDiscount(subtotal, this.ticketDiscount);

    let transaction;

    if (this.draftTransactionId) {
      // Promote existing draft to unpaid
      Storage.updateTransaction(this.draftTransactionId, {
        status: 'unpaid',
        customerNumber: customerNumber,
        orderName: this.orderCustomName || '',
        items: [...this.items],
        subtotal: subtotal,
        total: total,
        ticketDiscount: this.ticketDiscount || null,
        discount: this.currentDiscount,
        saleDay: this.sale ? Utils.getSaleDay(this.sale.startDate, this.sale) : 1,
        reopenedFrom: this.reopenedFromCustomer || null
      });
      transaction = Storage.getTransaction(this.draftTransactionId);
      Storage.clearDraftTxnId();
      this.draftTransactionId = null;
    } else {
      // Fallback: create new transaction
      transaction = {
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
        status: 'unpaid',
        paidAt: null,
        voidedAt: null,
        reopenedFrom: this.reopenedFromCustomer || null
      };
      Storage.saveTransaction(transaction);
    }

    // Clear reopened tracking
    this.reopenedFromCustomer = null;

    // Store transaction for re-navigation and mark as saved
    this.lastTransaction = transaction;
    this.transactionSaved = true;
    this.editingInvoiceId = null;
    this.editingInvoiceDirty = false;
    this.updateDoneButtonText();

    // DON'T clear cart here - let BACK return to items for review
    // Cart is cleared only by NEW CUSTOMER

    // Navigate to QR screen
    App.showScreen('qr', transaction);
  },


  /**
   * Start inline editing of a description in the item sheet
   */
  startInlineDescEdit(itemId, descEl) {
    const item = this.items.find(i => i.id === itemId);
    if (!item) return;
    if (descEl.querySelector('input')) return; // already editing

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'item-row__desc-input';
    input.value = item.description || '';
    input.placeholder = 'Description';
    input.maxLength = 60;

    descEl.textContent = '';
    descEl.appendChild(input);
    input.focus();

    const finish = () => {
      const newDesc = input.value.trim();
      if (newDesc !== (item.description || '')) {
        this.checkEditDirty();
        item.description = newDesc;
        this.saveCart();
        this.saveDraftTransaction();
        this.transactionSaved = false;
        this.render();
      }
      this.renderItemSheet();
    };

    input.addEventListener('blur', finish);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') input.blur();
    });
  },

  /**
   * Save cart to storage (items + invoiceDiscount)
   */
  saveCart() {
    Storage.saveCart(this.items, this.ticketDiscount);
  },

  /**
   * Save or update the draft (open) transaction on the dashboard
   */
  saveDraftTransaction() {
    // If cart is empty, delete any existing draft
    if (this.items.length === 0) {
      if (this.draftTransactionId) {
        Storage.deleteTransaction(this.draftTransactionId);
        Storage.clearDraftTxnId();
        this.draftTransactionId = null;
      }
      return;
    }

    const subtotal = this.items.reduce((sum, item) => sum + item.finalPrice, 0);
    const total = Utils.applyTicketDiscount(subtotal, this.ticketDiscount);
    const num = this.reuseCustomerNumber || Storage.peekNextCustomerNumber();

    if (this.draftTransactionId) {
      // Update existing draft
      Storage.updateTransaction(this.draftTransactionId, {
        items: [...this.items],
        subtotal: subtotal,
        total: total,
        ticketDiscount: this.ticketDiscount || null,
        orderName: this.orderCustomName || '',
        discount: this.currentDiscount,
        saleDay: this.sale ? Utils.getSaleDay(this.sale.startDate, this.sale) : 1
      });
    } else {
      // Create new draft
      const customerNumber = Storage.peekNextCustomerNumber();
      const txn = {
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
        status: 'open',
        paidAt: null,
        voidedAt: null,
        reopenedFrom: null
      };
      Storage.saveTransaction(txn);
      this.draftTransactionId = txn.id;
      Storage.saveDraftTxnId(txn.id);
    }
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

    this.checkEditDirty();
    item.haggleType = type;
    item.haggleValue = rawValue;
    item.finalPrice = Utils.applyHaggle(item.dayDiscountedPrice, type, rawValue);

    this.saveCart();
    this.saveDraftTransaction();
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

    this.checkEditDirty();
    item.haggleType = null;
    item.haggleValue = null;
    item.finalPrice = item.dayDiscountedPrice;

    this.saveCart();
    this.saveDraftTransaction();
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

  // ── Invoice Discount Sheet ──

  /**
   * Open the invoice discount sheet
   */
  openTicketDiscountSheet() {
    const subtotal = this.items.reduce((sum, item) => sum + item.finalPrice, 0);

    // Pre-fill if invoice discount exists
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
   * Update invoice discount preview
   */
  updateTicketDiscountPreview() {
    const subtotal = this.items.reduce((sum, item) => sum + item.finalPrice, 0);
    const type = document.querySelector('input[name="ticket-discount-type"]:checked')?.value;
    const rawValue = parseFloat(this.elements.ticketDiscountInput.value) || 0;

    const newTotal = Utils.applyTicketDiscount(subtotal, { type, value: rawValue });
    this.elements.ticketDiscountPreview.textContent = `Total: ${Utils.formatCurrency(newTotal)}`;
  },

  /**
   * Apply the invoice discount
   */
  applyTicketDiscount() {
    const type = document.querySelector('input[name="ticket-discount-type"]:checked')?.value;
    const rawValue = parseFloat(this.elements.ticketDiscountInput.value) || 0;

    if (!rawValue) {
      this.showFlash('error', 'Enter a value');
      return;
    }

    this.checkEditDirty();
    this.ticketDiscount = { type, value: rawValue };
    this.saveCart();
    this.saveDraftTransaction();
    this.transactionSaved = false;
    this.closeTicketDiscountSheet();
    this.render();
    this.showFlash('success', 'Invoice discount applied!');
  },

  /**
   * Remove the invoice discount
   */
  removeTicketDiscount() {
    this.checkEditDirty();
    this.ticketDiscount = null;
    this.saveCart();
    this.saveDraftTransaction();
    this.transactionSaved = false;
    this.closeTicketDiscountSheet();
    this.render();
    this.showFlash('success', 'Invoice discount removed');
  },

  /**
   * Close the invoice discount sheet
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

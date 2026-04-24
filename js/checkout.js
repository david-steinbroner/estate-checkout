/**
 * checkout.js - Checkout Pad Logic for Estate Checkout
 * Handles number pad input, item list, and running total
 */

const EDIT_ICON_SVG = '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>';

const Checkout = {
  // Current price being entered (stored as string for display)
  priceInput: '',

  // Current quantity for Add Item sheet
  addItemQty: 1,

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

  // Selected consignor for Add Item sheet
  addItemConsignorId: null,

  // Consignor picker callback
  _consignorPickerCallback: null,

  // Item sheet state
  isSheetOpen: false,

  // Edit mode: index into this.items[] when editing, null when adding
  editingItemIndex: null,

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
      itemSheetClose: document.getElementById('item-sheet-close'),
      itemSheetTotal: document.getElementById('item-sheet-total'),
      itemSheetActions: document.getElementById('item-sheet-actions'),
      itemSheetClear: document.getElementById('item-sheet-clear'),
      runningTotal: document.getElementById('running-total'),
      runningTotalBar: document.getElementById('running-total-bar'),
      addItemButton: document.getElementById('add-item-button'),
      doneButton: document.getElementById('done-button'),
      clearButton: document.getElementById('clear-button'),
      orderActions: document.getElementById('order-actions'),
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
      addItemCancel: document.getElementById('add-item-cancel'),
      addItemQtyMinus: document.getElementById('add-item-qty-minus'),
      addItemQtyPlus: document.getElementById('add-item-qty-plus'),
      addItemQtyValue: document.getElementById('add-item-qty'),
      addItemConsignorRow: document.getElementById('add-item-consignor-btn'),
      addItemConsignorBtn: document.getElementById('add-item-consignor-btn'),
      addItemConsignorDot: document.getElementById('add-item-consignor-dot'),
      addItemConsignorName: document.getElementById('add-item-consignor-name'),
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
      ticketDiscountApply: document.getElementById('ticket-discount-apply'),
      ticketDiscountRemove: document.getElementById('ticket-discount-remove'),
      ticketDiscountCancel: document.getElementById('ticket-discount-cancel'),
      ticketDiscountSubtotal: document.getElementById('ticket-discount-subtotal'),
      ticketDiscountSavingsRow: document.getElementById('ticket-discount-savings-row'),
      ticketDiscountSavings: document.getElementById('ticket-discount-savings'),
      ticketDiscountNewTotal: document.getElementById('ticket-discount-new-total')
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
    if (this.elements.addItemCancel) {
      this.elements.addItemCancel.addEventListener('click', () => {
        this.priceInput = '';
        this.addItemQty = 1;
        this.updatePriceDisplay();
        this.updateQtyDisplay();
        if (this.elements.addItemDesc) this.elements.addItemDesc.value = '';
        this.closeAddItemSheet();
      });
    }
    if (this.elements.addItemQtyMinus) {
      this.elements.addItemQtyMinus.addEventListener('click', () => {
        if (this.addItemQty > 1) {
          this.addItemQty--;
          this.updateQtyDisplay();
          this.updatePriceDisplay();
        }
      });
    }
    if (this.elements.addItemQtyPlus) {
      this.elements.addItemQtyPlus.addEventListener('click', () => {
        if (this.addItemQty < 99) {
          this.addItemQty++;
          this.updateQtyDisplay();
          this.updatePriceDisplay();
        }
      });
    }
    // Consignor selector in Add Item sheet
    if (this.elements.addItemConsignorBtn) {
      this.elements.addItemConsignorBtn.addEventListener('click', () => {
        this.openConsignorPicker(this.addItemConsignorId, (id) => {
          this.addItemConsignorId = id;
          this._updateAddItemConsignorDisplay();
        });
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

    if (this.elements.itemSheetClose) {
      this.elements.itemSheetClose.addEventListener('click', () => {
        this.closeItemSheet();
      });
    }

    if (this.elements.itemSheetClear) {
      this.elements.itemSheetClear.addEventListener('click', () => {
        this.showClearModal();
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
        radio.addEventListener('change', () => {
          this.elements.ticketDiscountInput.value = '';
          const type = document.querySelector('input[name="ticket-discount-type"]:checked')?.value;
          this.elements.ticketDiscountInput.placeholder =
            type === 'percent' ? 'Percentage' : type === 'dollar' ? 'Amount' : 'New Price';
          this.updateTicketDiscountPreview();
          this.elements.ticketDiscountInput.focus();
        });
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

    // Migrate old items missing new discount/quantity fields
    this.items.forEach(item => {
      if (item.dayDiscount === undefined) {
        item.dayDiscount = item.discount || 0;
        item.dayDiscountedPrice = item.finalPrice;
        item.haggleType = null;
        item.haggleValue = null;
        delete item.discount;
      }
      item.quantity = item.quantity || 1;
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
   * Update the quantity stepper display
   */
  updateQtyDisplay() {
    if (this.elements.addItemQtyValue) {
      this.elements.addItemQtyValue.textContent = this.addItemQty;
    }
    if (this.elements.addItemQtyMinus) {
      this.elements.addItemQtyMinus.disabled = this.addItemQty <= 1;
    }
  },

  /**
   * Open the Add Item bottom sheet
   */
  openAddItemSheet() {
    this.closeItemSheet();
    this.editingItemIndex = null;
    this.priceInput = '';
    this.addItemQty = 1;
    this.updatePriceDisplay();
    this.updateQtyDisplay();
    if (this.elements.addItemDesc) this.elements.addItemDesc.value = '';

    // Show consignor row only if consignors exist
    const consignors = Storage.getConsignors();
    if (this.elements.addItemConsignorRow) {
      this.elements.addItemConsignorRow.hidden = consignors.length === 0;
    }
    // Keep last-used consignor if it still exists, else reset
    if (this.addItemConsignorId && !consignors.find(c => c.id === this.addItemConsignorId)) {
      this.addItemConsignorId = null;
    }
    this._updateAddItemConsignorDisplay();

    // Set title and button text for Add mode
    const confirmBtn = document.getElementById('add-item-confirm');
    if (confirmBtn) confirmBtn.textContent = 'Add Item';

    if (this.elements.addItemModal) this.elements.addItemModal.classList.add('visible');

    // Focus description field so keyboard appears
    setTimeout(() => {
      if (this.elements.addItemDesc) this.elements.addItemDesc.focus();
    }, 50);
  },

  /**
   * Close the Add Item bottom sheet
   */
  closeAddItemSheet() {
    if (this.elements.addItemModal) this.elements.addItemModal.classList.remove('visible');
    this.editingItemIndex = null;
    // Reset title and button text back to Add mode
    const confirmBtn = document.getElementById('add-item-confirm');
    if (confirmBtn) confirmBtn.textContent = 'Add Item';
    const sheetEl = document.querySelector('.add-item-sheet');
    if (sheetEl) {
      const titleEl = sheetEl.querySelector('.add-item__title');
      if (titleEl) titleEl.textContent = 'Add Item';
    }
  },

  /**
   * Open Add Item sheet in edit mode, pre-populated with existing item data
   */
  openEditItemSheet(index) {
    const item = this.items[index];
    if (!item) return;

    this.editingItemIndex = index;

    // Pre-populate fields
    this.priceInput = String(item.originalPrice);
    this.addItemQty = item.quantity || 1;
    this.addItemConsignorId = item.consignorId || null;

    this.updatePriceDisplay();
    this.updateQtyDisplay();
    if (this.elements.addItemDesc) this.elements.addItemDesc.value = item.description || '';

    // Show consignor row only if consignors exist
    const consignors = Storage.getConsignors();
    if (this.elements.addItemConsignorRow) {
      this.elements.addItemConsignorRow.hidden = consignors.length === 0;
    }
    this._updateAddItemConsignorDisplay();

    // Update title and button text for edit mode
    const confirmBtn = document.getElementById('add-item-confirm');
    if (confirmBtn) confirmBtn.textContent = 'Save Changes';

    if (this.elements.addItemModal) this.elements.addItemModal.classList.add('visible');

    // Focus description
    setTimeout(() => {
      if (this.elements.addItemDesc) this.elements.addItemDesc.focus();
    }, 50);
  },

  /**
   * Confirm adding or editing item from the Add Item sheet
   */
  /**
   * Show a brief inline error under a field, auto-hides after 2.5s
   */
  _showFieldError(id, message) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
    clearTimeout(el._hideTimer);
    el._hideTimer = setTimeout(() => { el.hidden = true; }, 2500);
  },

  confirmAddItem() {
    this.checkEditDirty();

    const price = parseFloat(this.priceInput);
    const description = this.elements.addItemDesc ? this.elements.addItemDesc.value.trim() : '';

    // Validate — description error takes priority when both empty
    if (!description) {
      this._showFieldError('add-item-desc-error', 'Enter an item description');
      return;
    }
    if (!price || price <= 0) {
      this._showFieldError('add-item-price-error', 'Enter a price');
      return;
    }
    const qty = this.addItemQty;
    const dayDiscountedPrice = Utils.applyDiscount(price, this.currentDiscount);
    const isEditing = this.editingItemIndex !== null;

    if (isEditing) {
      // Update existing item
      const existing = this.items[this.editingItemIndex];
      existing.description = description;
      existing.originalPrice = price;
      existing.quantity = qty;
      existing.dayDiscount = this.currentDiscount;
      existing.dayDiscountedPrice = dayDiscountedPrice;
      existing.haggleType = null;
      existing.haggleValue = null;
      existing.finalPrice = dayDiscountedPrice * qty;
      existing.consignorId = this.addItemConsignorId || null;
    } else {
      // Add new item
      const item = {
        id: Utils.generateId(),
        description: description,
        originalPrice: price,
        quantity: qty,
        dayDiscount: this.currentDiscount,
        dayDiscountedPrice: dayDiscountedPrice,
        haggleType: null,
        haggleValue: null,
        finalPrice: dayDiscountedPrice * qty,
        consignorId: this.addItemConsignorId || null
      };
      this.items.push(item);
    }

    this.saveCart();
    this.saveDraftTransaction();
    this.transactionSaved = false;

    // Clear sheet inputs for next item
    this.priceInput = '';
    this.addItemQty = 1;
    this.updatePriceDisplay();
    this.updateQtyDisplay();
    if (this.elements.addItemDesc) this.elements.addItemDesc.value = '';

    // Close sheet and re-render
    const wasEditing = isEditing;
    this.closeAddItemSheet();
    this.render();

    if (wasEditing) {
      this.showFlash('success', 'Updated!');
      // Re-open the item sheet to show changes
      this.openItemSheet();
    } else {
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
    const escapedName = Utils.escapeHtml(name);
    const pencil = `<span class="running-total__edit-hint">${EDIT_ICON_SVG}</span>`;
    if (count === 0) {
      this.elements.runningTotalInfo.innerHTML = `${escapedName} ${pencil}`;
    } else {
      const itemText = count === 1 ? '1 item' : `${count} items`;
      this.elements.runningTotalInfo.innerHTML = `${escapedName} · ${itemText} ${pencil}`;
    }
  },

  /**
   * Render the item list
   */
  renderItemList() {
    if (this.items.length === 0) {
      this.elements.itemList.innerHTML = `
        <li class="item-list__empty">
          <span class="item-list__empty-icon" aria-hidden="true">
            <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
              <rect x="10" y="8" width="28" height="34" rx="3"/>
              <path d="M16 18h16M16 26h16M16 34h10"/>
            </svg>
          </span>
          <span class="item-list__empty-heading">No items yet</span>
          <span class="item-list__empty-helper">Tap <strong>Add Item</strong> to start this order.</span>
        </li>`;
      return;
    }

    const consignors = Storage.getConsignors();
    const html = this.items.map((item, index) => {
      const hasDesc = item.description && item.description.trim().length > 0;
      const descClass = hasDesc ? 'item-row__desc' : 'item-row__desc item-row__desc--empty';
      let descText = hasDesc ? Utils.escapeHtml(item.description) : 'No description';
      const qty = item.quantity || 1;
      if (qty > 1) descText += ` <span class="item-row__qty">x${qty}</span>`;

      let dotHtml = '';
      if (item.consignorId) {
        const c = consignors.find(x => x.id === item.consignorId);
        if (c) dotHtml = `<span class="item-row__consignor-dot" style="background: ${c.color}"></span>`;
      }

      return `
        <li class="item-row" data-id="${item.id}">
          ${dotHtml}
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
    if (this.elements.orderActions) {
      this.elements.orderActions.hidden = this.items.length === 0;
    }
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
    this.elements.itemSheetTitle.innerHTML = `${Utils.escapeHtml(titleText)} <span class="edit-icon">${EDIT_ICON_SVG}</span>`;
    const totalQty = this.items.reduce((sum, i) => sum + (i.quantity || 1), 0);
    const lineCount = this.items.length;
    const subtitle = totalQty > lineCount
      ? `${lineCount} line${lineCount !== 1 ? 's' : ''} (${totalQty} items)`
      : `${lineCount} item${lineCount !== 1 ? 's' : ''}`;
    this.elements.itemSheetSubtitle.textContent = lineCount === 0 ? '' : subtitle;

    // Hero total
    if (this.elements.itemSheetTotal) {
      const total = this.items.reduce((sum, i) => sum + (i.finalPrice || 0), 0);
      this.elements.itemSheetTotal.textContent = Utils.formatCurrency(total);
    }

    // Show Clear All link only when there are items
    if (this.elements.itemSheetActions) {
      this.elements.itemSheetActions.hidden = lineCount === 0;
    }

    if (this.items.length === 0) {
      this.elements.itemSheetList.innerHTML = '<li class="item-list__empty">No items yet</li>';
    } else {
      const consignors = Storage.getConsignors();
      const html = this.items.map((item) => {
        const idx = this.items.indexOf(item);
        const hasDesc = item.description && item.description.trim().length > 0;
        const descClass = hasDesc ? 'item-row__desc' : 'item-row__desc item-row__desc--empty';
        const descText = hasDesc ? Utils.escapeHtml(item.description) : 'No description';
        const qty = item.quantity || 1;
        const haggleClass = (item.haggleType && item.haggleValue) ? ' item-row--haggled' : '';

        // Consignor dot
        let consignorDotHtml = '';
        if (item.consignorId) {
          const c = consignors.find(x => x.id === item.consignorId);
          if (c) {
            consignorDotHtml = `<span class="item-row__consignor-dot" style="background: ${c.color}" title="${Utils.escapeHtml(c.name)}"></span>`;
          }
        } else if (consignors.length > 0) {
          consignorDotHtml = `<span class="item-row__consignor-dot" style="background: transparent; border: 1px dashed var(--color-border)"></span>`;
        }

        // Qty badge (shown when qty > 1)
        const qtyBadge = qty > 1 ? `<span class="item-row__qty-badge">&times;${qty}</span>` : '';

        return `
          <li class="item-row item-row--swipeable${haggleClass}" data-id="${item.id}">
            <div class="item-row__delete-bg" data-swipe-delete="${item.id}"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></div>
            <div class="item-row__content" data-row-edit="${idx}">
              ${consignorDotHtml}
              <span class="${descClass}">${descText}</span>
              ${qtyBadge}
              <div class="item-row__prices">
                ${this.renderItemPrices(item)}
              </div>
              <span class="item-row__edit-icon">${EDIT_ICON_SVG}</span>
            </div>
          </li>
        `;
      }).join('');

      this.elements.itemSheetList.innerHTML = html;
    }

    // Bind swipe-to-delete on item rows
    this.elements.itemSheetList.querySelectorAll('.item-row--swipeable').forEach(row => {
      this.bindSwipeToDelete(row);
    });

    // Bind tap on revealed delete area
    this.elements.itemSheetList.querySelectorAll('[data-swipe-delete]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeItem(el.dataset.swipeDelete);
      });
    });

    // Show swipe hint on first open
    this.showSwipeHint();

    // Bind row tap to open Edit Item sheet
    this.elements.itemSheetList.querySelectorAll('[data-row-edit]').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.rowEdit, 10);
        this.openEditItemSheet(idx);
      });
    });
  },

  /**
   * Bind swipe-to-delete touch events on an item row
   */
  bindSwipeToDelete(row) {
    const content = row.querySelector('.item-row__content');
    if (!content) return;

    const MAX_SWIPE = 56;
    const DELETE_THRESHOLD = 40;
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let swiping = false;

    content.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      currentX = 0;
      swiping = false;
      content.style.transition = 'none';
    }, { passive: true });

    content.addEventListener('touchmove', (e) => {
      const touch = e.touches[0];
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;

      // Only swipe left, and only if more horizontal than vertical
      if (!swiping && Math.abs(deltaX) > 10 && Math.abs(deltaX) > Math.abs(deltaY)) {
        swiping = true;
      }
      if (!swiping) return;

      e.preventDefault();
      currentX = Math.max(-MAX_SWIPE, Math.min(0, deltaX));
      content.style.transform = `translateX(${currentX}px)`;
    }, { passive: false });

    content.addEventListener('touchend', () => {
      content.style.transition = 'transform 0.2s ease-out';
      if (currentX < -DELETE_THRESHOLD) {
        // Snap to reveal delete
        content.style.transform = `translateX(-${MAX_SWIPE}px)`;
      } else {
        // Snap back
        content.style.transform = 'translateX(0)';
      }
      swiping = false;
    });
  },

  /**
   * Show one-time swipe hint tooltip
   */
  showSwipeHint() {
    if (this.items.length === 0) return;
    if (localStorage.getItem('estate_swipe_hint_seen')) return;

    localStorage.setItem('estate_swipe_hint_seen', '1');

    const hint = document.createElement('div');
    hint.className = 'swipe-hint';
    hint.textContent = 'Swipe left on an item to delete';
    this.elements.itemSheetList.parentNode.insertBefore(hint, this.elements.itemSheetList);

    const dismiss = () => {
      hint.classList.add('swipe-hint--fading');
      setTimeout(() => hint.remove(), 300);
    };

    hint.addEventListener('click', dismiss);
    setTimeout(dismiss, 3500);
  },

  /**
   * Change quantity of an item in the cart
   */
  changeItemQty(itemId, delta) {
    const item = this.items.find(i => i.id === itemId);
    if (!item) return;

    const newQty = (item.quantity || 1) + delta;
    if (newQty <= 0) {
      this.removeItem(itemId);
      return;
    }
    if (newQty > 99) return;

    this.checkEditDirty();
    item.quantity = newQty;
    // Recalculate finalPrice = unit price * qty
    const unitPrice = item.haggleType && item.haggleValue
      ? Utils.applyHaggle(item.dayDiscountedPrice, item.haggleType, item.haggleValue)
      : item.dayDiscountedPrice;
    item.finalPrice = unitPrice * newQty;

    this.saveCart();
    this.saveDraftTransaction();
    this.transactionSaved = false;
    this.render();
    this.renderItemSheet();
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
    const unitPrice = Utils.applyHaggle(item.dayDiscountedPrice, type, rawValue);
    item.finalPrice = unitPrice * (item.quantity || 1);

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
    item.finalPrice = item.dayDiscountedPrice * (item.quantity || 1);

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
    this.elements.ticketDiscountSubtotal.textContent = Utils.formatCurrency(subtotal);

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

    const type = document.querySelector('input[name="ticket-discount-type"]:checked')?.value;
    this.elements.ticketDiscountInput.placeholder =
      type === 'percent' ? 'Percentage' : type === 'dollar' ? 'Amount' : 'New Price';

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
    const savings = subtotal - newTotal;

    this.elements.ticketDiscountSubtotal.textContent = Utils.formatCurrency(subtotal);
    this.elements.ticketDiscountNewTotal.textContent = Utils.formatCurrency(newTotal);

    if (savings > 0) {
      this.elements.ticketDiscountSavingsRow.hidden = false;
      this.elements.ticketDiscountSavings.textContent = '−' + Utils.formatCurrency(savings);
    } else {
      this.elements.ticketDiscountSavingsRow.hidden = true;
    }
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

    const subtotal = this.items.reduce((sum, item) => sum + item.finalPrice, 0);

    if (type === 'percent' && rawValue > 100) {
      this.showFlash('error', 'Percentage cannot exceed 100%');
      return;
    }
    if (type === 'dollar' && rawValue > subtotal) {
      this.showFlash('error', 'Discount exceeds subtotal');
      return;
    }
    if (type === 'newprice' && rawValue > subtotal) {
      this.showFlash('error', 'New price exceeds subtotal');
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
  },

  /**
   * Update the consignor display in the Add Item sheet
   */
  _updateAddItemConsignorDisplay() {
    if (!this.elements.addItemConsignorDot || !this.elements.addItemConsignorName) return;
    if (this.addItemConsignorId) {
      const consignors = Storage.getConsignors();
      const c = consignors.find(x => x.id === this.addItemConsignorId);
      if (c) {
        this.elements.addItemConsignorDot.style.background = c.color;
        this.elements.addItemConsignorDot.textContent = '\u00A0'; // non-empty to show
        this.elements.addItemConsignorName.textContent = c.name;
        return;
      }
    }
    this.elements.addItemConsignorDot.style.background = '';
    this.elements.addItemConsignorDot.textContent = '';
    this.elements.addItemConsignorName.textContent = 'Select consignor';
  },

  /**
   * Open the consignor picker sheet
   * @param {string|null} currentId - currently selected consignor ID
   * @param {function} onSelect - callback with selected ID (or null for None)
   */
  openConsignorPicker(currentId, onSelect) {
    const modal = document.getElementById('consignor-picker-modal');
    const list = document.getElementById('consignor-picker-list');
    const consignors = Storage.getConsignors();

    let html = `<li class="consignor-picker__item${!currentId ? ' consignor-picker__item--selected' : ''}" data-consignor-pick="">
      <span class="consignor-picker__name">None</span>
      ${!currentId ? '<span class="consignor-picker__check">✓</span>' : ''}
    </li>`;

    consignors.forEach(c => {
      const selected = currentId === c.id;
      html += `<li class="consignor-picker__item${selected ? ' consignor-picker__item--selected' : ''}" data-consignor-pick="${c.id}">
        <span class="consignor-picker__dot" style="background: ${c.color}"></span>
        <span class="consignor-picker__name">${Utils.escapeHtml(c.name)}</span>
        ${selected ? '<span class="consignor-picker__check">✓</span>' : ''}
      </li>`;
    });

    list.innerHTML = html;

    list.querySelectorAll('[data-consignor-pick]').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.consignorPick || null;
        onSelect(id);
        modal.classList.remove('visible');
      });
    });

    modal.addEventListener('click', function handler(e) {
      if (e.target === modal) {
        modal.classList.remove('visible');
        modal.removeEventListener('click', handler);
      }
    });

    modal.classList.add('visible');
  }
};

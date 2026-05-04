/**
 * checkout.js - Checkout Pad Logic for Estate Checkout
 * Handles number pad input, item list, and running total
 */

// v209: dropped EDIT_ICON_SVG. The tilted-pencil icon read as
// off-baseline next to text and didn't fit the iOS-styled aesthetic.
// Editable inline values now signal tappability via primary-color text
// — same convention iOS uses in Wallet, Notes, Settings (no decoration
// beyond a color cue).

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
      // Add Item sheet
      addItemModal: document.getElementById('add-item-modal'),
      addItemDesc: document.getElementById('add-item-desc'),
      addItemPrice: document.getElementById('add-item-price'),
      addItemMic: document.getElementById('add-item-mic'),
      addItemConfirm: document.getElementById('add-item-confirm'),
      addItemDelete: document.getElementById('add-item-delete'),
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
        const button = e.target.closest('.ec-numpad-key');
        if (!button) return;
        this.handleNumpadInput(button.dataset.value);
      });
    }
    if (this.elements.addItemConfirm) {
      this.elements.addItemConfirm.addEventListener('click', () => {
        this.confirmAddItem();
      });
    }
    if (this.elements.addItemDelete) {
      this.elements.addItemDelete.addEventListener('click', () => {
        this.deleteEditingItem();
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
    // Consignor selector in Add Item sheet. v211: when no consignors exist
    // on the sale, the chip becomes an Add Consignor entry point — tapping
    // it opens the same Add Consignor sheet used during Setup. Once a
    // consignor's saved, the chip behavior reverts to picker.
    if (this.elements.addItemConsignorBtn) {
      this.elements.addItemConsignorBtn.addEventListener('click', () => {
        const consignors = Storage.getConsignors();
        if (consignors.length === 0) {
          App.openConsignorSheet(null);
          return;
        }
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
      // v206: type chip switches reveal/hide the mode chips and reset the input.
      document.querySelectorAll('input[name="ticket-adj-type"]').forEach(radio => {
        radio.addEventListener('change', () => {
          this.elements.ticketDiscountInput.value = '';
          this._refreshAdjustmentSheet();
          this.elements.ticketDiscountInput.focus();
        });
      });
      // Mode chip switches just reset the input + refresh the preview.
      document.querySelectorAll('input[name="ticket-adj-mode"]').forEach(radio => {
        radio.addEventListener('change', () => {
          this.elements.ticketDiscountInput.value = '';
          this._refreshAdjustmentSheet();
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
    // v211: chip always visible. When no consignors exist, the chip itself
    // is the entry point to add the first one — same flow as Setup.
    if (this.elements.addItemConsignorRow) {
      this.elements.addItemConsignorRow.hidden = false;
    }
    // Keep last-used consignor if it still exists, else reset
    if (this.addItemConsignorId && !consignors.find(c => c.id === this.addItemConsignorId)) {
      this.addItemConsignorId = null;
    }
    this._updateAddItemConsignorDisplay();

    // Set title and button text for Add mode
    const confirmBtn = document.getElementById('add-item-confirm');
    if (confirmBtn) confirmBtn.textContent = 'Add Item';
    if (this.elements.addItemDelete) this.elements.addItemDelete.hidden = true;

    if (this.elements.addItemModal) this.elements.addItemModal.classList.add('visible');

    // Focus description field so keyboard appears
    setTimeout(() => {
      if (this.elements.addItemDesc) this.elements.addItemDesc.focus({ preventScroll: true });
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
    const titleEl = document.querySelector('#add-item-sheet .entry-screen__title');
    if (titleEl) titleEl.textContent = 'Add Item';
    if (this.elements.addItemDelete) this.elements.addItemDelete.hidden = true;
  },

  /**
   * Open Add Item sheet in edit mode, pre-populated with existing item data
   */
  openEditItemSheet(index) {
    const item = this.items[index];
    if (!item) return;

    // If the order-detail item sheet is open (user is editing from the
    // order review view), close it first so the full-screen Add Item
    // overlay is the top layer and not stacked behind.
    this.closeItemSheet();

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
    // v211: chip always visible. When no consignors exist, the chip itself
    // is the entry point to add the first one — same flow as Setup.
    if (this.elements.addItemConsignorRow) {
      this.elements.addItemConsignorRow.hidden = false;
    }
    this._updateAddItemConsignorDisplay();

    // Update title and button text for edit mode
    const confirmBtn = document.getElementById('add-item-confirm');
    if (confirmBtn) confirmBtn.textContent = 'Save Changes';
    const titleEl = document.querySelector('#add-item-sheet .entry-screen__title');
    if (titleEl) titleEl.textContent = 'Edit Item';
    if (this.elements.addItemDelete) this.elements.addItemDelete.hidden = false;

    if (this.elements.addItemModal) this.elements.addItemModal.classList.add('visible');

    // Focus description
    setTimeout(() => {
      if (this.elements.addItemDesc) this.elements.addItemDesc.focus({ preventScroll: true });
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
      // Re-open the item sheet to show changes (live state update — no toast)
      this.openItemSheet();
    } else {
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
   * Delete the item currently being edited from the Add Item screen.
   * Triggered by the Delete Item button (visible only in edit mode).
   */
  deleteEditingItem() {
    if (this.editingItemIndex === null) return;
    const item = this.items[this.editingItemIndex];
    if (!item) return;
    const id = item.id;
    this.closeAddItemSheet();
    this.removeItem(id);
    if (this.items.length > 0) this.openItemSheet();
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
    // v209: blue tappable name signals editability — no pencil glyph.
    const nameEl = `<span class="running-total__name">${escapedName}</span>`;
    if (count === 0) {
      this.elements.runningTotalInfo.innerHTML = nameEl;
    } else {
      const itemText = count === 1 ? '1 item' : `${count} items`;
      this.elements.runningTotalInfo.innerHTML = `${nameEl} · ${itemText}`;
    }
  },

  /**
   * Render the item list
   */
  renderItemList() {
    if (this.items.length === 0) {
      this.elements.itemList.innerHTML = `
        <li class="ec-empty-state">
          <span class="ec-empty-state__icon" aria-hidden="true">
            <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
              <rect x="10" y="8" width="28" height="34" rx="3"/>
              <path d="M16 18h16M16 26h16M16 34h10"/>
            </svg>
          </span>
          <span class="ec-empty-state__heading">No items yet</span>
          <span class="ec-empty-state__helper">Tap <strong>Add Item</strong> to start this order.</span>
        </li>`;
      return;
    }

    const consignors = Storage.getConsignors();
    const html = this.items.map((item, index) => {
      const hasDesc = item.description && item.description.trim().length > 0;
      const descClass = hasDesc ? 'item-row__desc' : 'item-row__desc item-row__desc--empty';
      const descText = hasDesc ? Utils.escapeHtml(item.description) : 'No description';
      const qty = item.quantity || 1;
      const qtyBadge = qty > 1 ? `<span class="item-row__qty">× ${qty}</span>` : '';

      // v198: always render the consignor slot so descriptions align across
      // assigned + unassigned items. Slot is filled when a consignor is set,
      // visually empty otherwise.
      let dotStyle = 'background: transparent;';
      if (item.consignorId) {
        const c = consignors.find(x => x.id === item.consignorId);
        if (c) dotStyle = `background: ${c.color};`;
      }
      const dotHtml = `<span class="item-row__consignor-dot" style="${dotStyle}"></span>`;

      const caption = Utils.formatItemPriceCaption(item);
      const captionHtml = caption ? `<span class="item-row__caption">${Utils.escapeHtml(caption)}</span>` : '';

      return `
        <li class="item-row" data-id="${item.id}">
          ${dotHtml}
          <span class="${descClass}">${descText}${qtyBadge}</span>
          <span class="item-row__final">${Utils.formatCurrency(item.finalPrice)}</span>
          ${captionHtml}
        </li>
      `;
    }).join('');

    this.elements.itemList.innerHTML = html;

    // Scroll to bottom to show newest item
    this.elements.itemListContainer.scrollTop = this.elements.itemListContainer.scrollHeight;
  },

  /**
   * v214: kept as a thin wrapper for any caller that still expects the
   * "prices column" string. New surfaces should call Utils.formatItemPriceCaption
   * directly and place the caption underneath the final price as a separate
   * row, not stack everything inline. The stacked-strikethrough display this
   * function produced was retired.
   */
  renderItemPrices(item) {
    const caption = Utils.formatItemPriceCaption(item);
    const captionHtml = caption ? `<span class="item-row__caption">${Utils.escapeHtml(caption)}</span>` : '';
    return `<span class="item-row__final">${Utils.formatCurrency(item.finalPrice)}</span>${captionHtml}`;
  },

  /**
   * Render the running total and savings
   */
  renderRunningTotal() {
    const subtotal = this.items.reduce((sum, item) => sum + item.finalPrice, 0);
    const total = Utils.applyTicketDiscount(subtotal, this.ticketDiscount);
    this.elements.runningTotal.textContent = Utils.formatCurrency(total);
    this._renderRunningTotalContext();
  },

  /**
   * Render the small context line above the hero amount (v162 — Wallet
   * Balance Detail pattern). Format: "Day 1" alone, or "Day 3 · 20% off"
   * when a discount applies.
   */
  _renderRunningTotalContext() {
    const ctx = document.getElementById('running-total-context');
    if (!ctx) return;
    const sale = this.sale || Storage.getSale();
    if (!sale) {
      ctx.textContent = '';
      return;
    }
    const dayNumber = Utils.getSaleDay(sale.startDate, sale);
    const discount = Utils.getDiscountForDay(sale, dayNumber);
    const parts = [`Day ${dayNumber}`];
    if (discount > 0) parts.push(`${discount}% off`);
    ctx.textContent = parts.join(' · ');
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
      const voidedAt = Utils.getTimestamp();
      const editingId = this.editingInvoiceId;
      // Void the original invoice now
      Storage.updateTransaction(editingId, {
        status: 'void',
        voidedAt: voidedAt,
        voidReason: 'Edited'
      });
      // Sync the void
      if (typeof Sync !== 'undefined' && Sync.isSynced(this.sale)) {
        Sync.patchInvoice(this.sale.id, this.sale.shareCode, editingId, {
          status: 'void',
          voidedAt: voidedAt,
          voidReason: 'Edited'
        }).catch(err => console.warn('[sync] edit-void failed:', err.message));
      }
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
    // v209: title itself is the affordance — set in primary color, no pencil.
    this.elements.itemSheetTitle.innerHTML = Utils.escapeHtml(titleText);
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
      this.elements.itemSheetList.innerHTML = '<li class="ec-empty-state">No items yet</li>';
    } else {
      const consignors = Storage.getConsignors();
      const html = this.items.map((item) => {
        const idx = this.items.indexOf(item);
        const hasDesc = item.description && item.description.trim().length > 0;
        const descClass = hasDesc ? 'item-row__desc' : 'item-row__desc item-row__desc--empty';
        const descText = hasDesc ? Utils.escapeHtml(item.description) : 'No description';
        const qty = item.quantity || 1;
        const haggleClass = (item.haggleType && item.haggleValue) ? ' item-row--haggled' : '';

        // Consignor dot — always rendered as a slot so descriptions align
        // across rows. Filled when assigned, empty (transparent) otherwise.
        let consignorDotStyle = 'background: transparent;';
        let consignorDotTitle = '';
        if (item.consignorId) {
          const c = consignors.find(x => x.id === item.consignorId);
          if (c) {
            consignorDotStyle = `background: ${c.color};`;
            consignorDotTitle = ` title="${Utils.escapeHtml(c.name)}"`;
          }
        }
        const consignorDotHtml = `<span class="item-row__consignor-dot" style="${consignorDotStyle}"${consignorDotTitle}></span>`;

        // Qty badge (shown when qty > 1)
        const qtyBadge = qty > 1 ? `<span class="item-row__qty-badge">&times;${qty}</span>` : '';

        // v214: caption pattern — final price hero, breakdown underneath in
        // caption weight. No more inline strikethrough.
        const caption = Utils.formatItemPriceCaption(item);
        const captionHtml = caption ? `<span class="item-row__caption">${Utils.escapeHtml(caption)}</span>` : '';

        return `
          <li class="item-row${haggleClass}" data-id="${item.id}">
            <div class="item-row__content" data-row-edit="${idx}">
              ${consignorDotHtml}
              <span class="${descClass}">${descText}</span>
              ${qtyBadge}
              <span class="item-row__final">${Utils.formatCurrency(item.finalPrice)}</span>
              ${captionHtml}
            </div>
          </li>
        `;
      }).join('');

      this.elements.itemSheetList.innerHTML = html;
    }

    // Bind row tap to open Edit Item sheet
    this.elements.itemSheetList.querySelectorAll('[data-row-edit]').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.rowEdit, 10);
        this.openEditItemSheet(idx);
      });
    });
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
    input.focus({ preventScroll: true });

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
   * End the current sale and return to dashboard.
   *
   * v193 archives the sale into the IndexedDB Past Sales store BEFORE clearing
   * any session state, so the snapshot captures the full final state. Drafts
   * (status='open') are filtered out at archive time. The archive is a frozen
   * snapshot — never reads from live storage after this point.
   */
  async endSale() {
    // Guard against double execution
    if (this._endingSale) return;
    this._endingSale = true;

    // Delete any open draft BEFORE archiving so it doesn't leak into the
    // snapshot.
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

    // Mark sale as ended in storage (does NOT clear sale or transactions —
    // user can review past invoices on dashboard). Clears cart + counter only.
    SaleSetup.endSale();

    // Snapshot into Past Sales archive (IDB) AFTER SaleSetup.endSale so
    // the snapshot captures the ended state (status='ended', endedAt set).
    // Awaited because the local archive is the user's only record once
    // `Start New Estate Sale` clears the active sale.
    if (typeof ArchiveDB !== 'undefined') {
      try {
        await ArchiveDB.archiveCurrentSale();
      } catch (err) {
        console.warn('[archive] archiveCurrentSale failed:', err.message);
      }
    }

    // v159: navigate to dashboard (not setup) so the operator can immediately
    // review the just-ended sale's invoices. Dashboard shows a "Sale ended"
    // banner + "Start New Sale" button when sale.status === 'ended'.
    App.showScreen('dashboard');

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
      // Promote existing draft to unpaid. saleId already stamped at draft
      // creation; no need to re-tag here.
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
      // Fallback: create new transaction. saleId tag (v199) makes it
      // possible to scope archives, exports, and dashboard reads to a
      // specific sale instead of relying on timestamp heuristics.
      transaction = {
        id: Utils.generateId(),
        saleId: this.sale ? this.sale.id : null,
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

    // Push to backend if this sale is synced (fire-and-forget — local is canonical for the UI)
    if (typeof Sync !== 'undefined' && Sync.isSynced(this.sale)) {
      Sync.createInvoice(this.sale.id, this.sale.shareCode, Sync.localInvoiceToServer(transaction))
        .catch(err => console.warn('[sync] createInvoice failed:', err.message));
    }

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
    input.focus({ preventScroll: true });

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
      // Create new draft — tagged with saleId (v199) so it scopes correctly.
      const customerNumber = Storage.peekNextCustomerNumber();
      const txn = {
        id: Utils.generateId(),
        saleId: this.sale ? this.sale.id : null,
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
    // v214: matches the adjustment-sheet fix. Same iOS auto-scroll-into-view
    // behavior was latent here — visible on shorter phones with the keyboard up.
    this.elements.haggleInput.focus({ preventScroll: true });
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
      this._showFieldError('haggle-error', 'Enter a value');
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
   * Open the Invoice Adjustment sheet (v206 — was Invoice Discount).
   *
   * Pre-fills both the type chip (Discount/Surcharge/Set Total) AND the mode
   * chip (% / $) from the existing adjustment. For "set" type, hides the
   * mode row entirely. The Remove button shows only when an adjustment is
   * already on the cart.
   */
  openTicketDiscountSheet() {
    const adj = this.ticketDiscount;
    if (adj && adj.value) {
      const type = adj.type === 'discount' || adj.type === 'surcharge' || adj.type === 'set'
        ? adj.type
        : 'discount';
      document.querySelector(`input[name="ticket-adj-type"][value="${type}"]`).checked = true;
      const mode = adj.mode === 'percent' || adj.mode === 'dollar' ? adj.mode : 'percent';
      const modeRadio = document.querySelector(`input[name="ticket-adj-mode"][value="${mode}"]`);
      if (modeRadio) modeRadio.checked = true;
      this.elements.ticketDiscountInput.value = adj.value;
      this.elements.ticketDiscountRemove.hidden = false;
    } else {
      document.querySelector('input[name="ticket-adj-type"][value="discount"]').checked = true;
      document.querySelector('input[name="ticket-adj-mode"][value="percent"]').checked = true;
      this.elements.ticketDiscountInput.value = '';
      this.elements.ticketDiscountRemove.hidden = true;
    }

    this._refreshAdjustmentSheet();
    this.elements.ticketDiscountModal.classList.add('visible');
    // v214: preventScroll back. The v211 theory ("let iOS auto-scroll the
    // input into view") looked fine on long content but on this sheet the
    // input sits high enough that auto-scroll shoves the entire sheet
    // upward to the top of the viewport — clipping the Apply / Remove
    // buttons under the keyboard suggestion bar (Image 3 in the v213
    // field report). Every other sheet in the app uses preventScroll for
    // exactly this reason; we just missed this one.
    this.elements.ticketDiscountInput.focus({ preventScroll: true });
  },

  /**
   * Refresh the sheet's chip-state-driven UI: hide/show the mode row based on
   * type, set the input placeholder for the current type+mode, and recompute
   * the preview. Called on open and on every chip change.
   */
  _refreshAdjustmentSheet() {
    const type = document.querySelector('input[name="ticket-adj-type"]:checked')?.value || 'discount';
    const mode = document.querySelector('input[name="ticket-adj-mode"]:checked')?.value || 'percent';
    const modeRow = document.getElementById('ticket-adj-modes');
    if (modeRow) modeRow.hidden = (type === 'set');

    if (type === 'set') {
      this.elements.ticketDiscountInput.placeholder = 'New total';
    } else if (mode === 'percent') {
      this.elements.ticketDiscountInput.placeholder = 'Percentage';
    } else {
      this.elements.ticketDiscountInput.placeholder = 'Amount';
    }
    this.updateTicketDiscountPreview();
  },

  /**
   * Live-recompute the preview (Subtotal · Adjustment · New Total).
   *
   * v206: the Adjustment line is signed — a discount shows "−$X.XX" and
   * a surcharge shows "+$X.XX". Set Total shows the delta from subtotal
   * (positive or negative) or hides if no change.
   */
  updateTicketDiscountPreview() {
    const subtotal = this.items.reduce((sum, item) => sum + item.finalPrice, 0);
    const type = document.querySelector('input[name="ticket-adj-type"]:checked')?.value || 'discount';
    const mode = document.querySelector('input[name="ticket-adj-mode"]:checked')?.value || 'percent';
    const rawValue = parseFloat(this.elements.ticketDiscountInput.value) || 0;

    const newTotal = Utils.applyTicketDiscount(subtotal, {
      type,
      mode: type === 'set' ? null : mode,
      value: rawValue
    });
    const delta = subtotal - newTotal;

    this.elements.ticketDiscountSubtotal.textContent = Utils.formatCurrency(subtotal);
    this.elements.ticketDiscountNewTotal.textContent = Utils.formatCurrency(newTotal);

    const labelEl = document.getElementById('ticket-discount-savings-label');
    if (Math.abs(delta) > 0.005) {
      this.elements.ticketDiscountSavingsRow.hidden = false;
      const sign = delta > 0 ? '−' : '+';
      this.elements.ticketDiscountSavings.textContent = sign + Utils.formatCurrency(Math.abs(delta));
      if (labelEl) {
        labelEl.textContent = type === 'discount' ? 'Discount'
          : type === 'surcharge' ? 'Surcharge'
          : 'Adjustment';
      }
    } else {
      this.elements.ticketDiscountSavingsRow.hidden = true;
    }
  },

  /**
   * Apply the invoice adjustment (v206).
   * Validation differs by type: discount caps at 100% / subtotal; surcharge
   * has no upper cap; set total accepts any positive value.
   */
  applyTicketDiscount() {
    const type = document.querySelector('input[name="ticket-adj-type"]:checked')?.value || 'discount';
    const mode = document.querySelector('input[name="ticket-adj-mode"]:checked')?.value || 'percent';
    const rawValue = parseFloat(this.elements.ticketDiscountInput.value) || 0;

    if (!rawValue) {
      this._showFieldError('ticket-discount-error', 'Enter a value');
      return;
    }

    const subtotal = this.items.reduce((sum, item) => sum + item.finalPrice, 0);

    if (type === 'discount' && mode === 'percent' && rawValue > 100) {
      this._showFieldError('ticket-discount-error', 'Discount cannot exceed 100%');
      return;
    }
    if (type === 'discount' && mode === 'dollar' && rawValue > subtotal) {
      this._showFieldError('ticket-discount-error', 'Discount exceeds subtotal');
      return;
    }
    // 'set' and 'surcharge' have no upper cap — operator's call.

    this.checkEditDirty();
    this.ticketDiscount = {
      type,
      mode: type === 'set' ? null : mode,
      value: rawValue
    };
    this.saveCart();
    this.saveDraftTransaction();
    this.transactionSaved = false;
    this._fireAdjustmentHookAndClose();
    this.render();
  },

  /**
   * Remove the invoice adjustment.
   */
  removeTicketDiscount() {
    this.checkEditDirty();
    this.ticketDiscount = null;
    this.saveCart();
    this.saveDraftTransaction();
    this.transactionSaved = false;
    this._fireAdjustmentHookAndClose();
    this.render();
  },

  /**
   * Pull the one-shot onAdjustmentChanged hook off the object, close the
   * sheet, then fire the hook. Order matters: clearing first prevents a
   * subsequent unrelated open of the sheet (e.g. from Checkout cart) from
   * accidentally re-firing a stale hook left by the QR screen.
   */
  _fireAdjustmentHookAndClose() {
    const hook = this.onAdjustmentChanged;
    this.onAdjustmentChanged = null;
    this.closeTicketDiscountSheet();
    if (typeof hook === 'function') hook();
  },

  /**
   * Close the invoice adjustment sheet. Drops any pending hook so a
   * cancelled-out attempt from the QR screen doesn't leak into the next
   * sheet open from a different surface.
   */
  closeTicketDiscountSheet() {
    this.elements.ticketDiscountModal.classList.remove('visible');
    this.onAdjustmentChanged = null;
  },

  /**
   * Set price from speech input (called by speech.js)
   */
  setPriceFromSpeech(price, description) {
    this.priceInput = price.toString();
    this.updatePriceDisplay();
  },

  /**
   * Update the consignor display in the Add Item sheet.
   *
   * Three states (v211):
   *   1. Item has consignor \u2192 dot in consignor's color, name shown
   *   2. Sale has consignors but item has none \u2192 empty dot, "Select consignor"
   *   3. Sale has zero consignors \u2192 empty dot, "Add a consignor" (the chip
   *      becomes an entry point to the Add Consignor sheet \u2014 see the click
   *      handler in bindEvents)
   */
  _updateAddItemConsignorDisplay() {
    if (!this.elements.addItemConsignorDot || !this.elements.addItemConsignorName) return;
    if (this.addItemConsignorId) {
      const consignors = Storage.getConsignors();
      const c = consignors.find(x => x.id === this.addItemConsignorId);
      if (c) {
        this.elements.addItemConsignorDot.style.background = c.color;
        this.elements.addItemConsignorDot.textContent = '\u00A0';
        this.elements.addItemConsignorName.textContent = c.name;
        return;
      }
    }
    this.elements.addItemConsignorDot.style.background = '';
    this.elements.addItemConsignorDot.textContent = '';
    const hasAny = Storage.getConsignors().length > 0;
    this.elements.addItemConsignorName.textContent = hasAny
      ? 'Select consignor'
      : 'Add a consignor';
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

    // v209: each row reserves a dot slot so all names align at the same
    // x-coordinate. The "None" row uses an invisible placeholder (visibility:
    // hidden via inline style) instead of omitting the element entirely.
    let html = `<li class="consignor-picker__item${!currentId ? ' consignor-picker__item--selected' : ''}" data-consignor-pick="">
      <span class="consignor-picker__dot" style="visibility: hidden"></span>
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

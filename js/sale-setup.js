/**
 * sale-setup.js - Sale Configuration Module for Estate Checkout
 * Handles the sale setup form and discount schedule configuration
 */

const SaleSetup = {
  // Default discount schedule
  defaultDiscounts: {
    1: 0,
    2: 25,
    3: 50
  },

  // Current discount configuration (editable)
  discounts: {},

  // DOM element references
  elements: {},

  /**
   * Initialize sale setup screen
   */
  init() {
    this.cacheElements();
    this.bindEvents();
    this.setDefaultDate();
    this.resetDiscounts();
    this.renderDiscountList();
  },

  /**
   * Cache DOM element references
   */
  cacheElements() {
    this.elements = {
      saleNameInput: document.getElementById('setup-sale-name'),
      startDateInput: document.getElementById('setup-start-date'),
      discountList: document.getElementById('discount-list'),
      addDayButton: document.getElementById('add-day-button'),
      startSaleButton: document.getElementById('start-sale-button')
    };
  },

  /**
   * Bind event listeners
   */
  bindEvents() {
    // Add day button
    this.elements.addDayButton.addEventListener('click', () => {
      this.addDay();
    });

    // Start sale button
    this.elements.startSaleButton.addEventListener('click', () => {
      this.startSale();
    });

    // Validate on input
    this.elements.saleNameInput.addEventListener('input', () => {
      this.validateForm();
    });
  },

  /**
   * Set default date to today
   */
  setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    this.elements.startDateInput.value = today;
  },

  /**
   * Reset discounts to defaults
   */
  resetDiscounts() {
    this.discounts = { ...this.defaultDiscounts };
  },

  /**
   * Render the discount list
   */
  renderDiscountList() {
    const days = Object.keys(this.discounts).map(Number).sort((a, b) => a - b);

    const html = days.map(day => {
      const discount = this.discounts[day];
      const canRemove = day > 3; // Can only remove Day 4+

      return `
        <div class="discount-row" data-day="${day}">
          <span class="discount-row__label">Day ${day}</span>
          <input
            type="number"
            class="discount-row__input"
            value="${discount}"
            min="0"
            max="100"
            data-day="${day}"
          >
          <span class="discount-row__suffix">% off</span>
          ${canRemove ? `<button class="discount-row__remove" data-remove="${day}">×</button>` : ''}
        </div>
      `;
    }).join('');

    this.elements.discountList.innerHTML = html;

    // Bind input events
    this.elements.discountList.querySelectorAll('.discount-row__input').forEach(input => {
      input.addEventListener('change', (e) => {
        const day = parseInt(e.target.dataset.day);
        let value = parseInt(e.target.value) || 0;
        // Clamp to 0-100
        value = Math.max(0, Math.min(100, value));
        e.target.value = value;
        this.discounts[day] = value;
      });
    });

    // Bind remove buttons
    this.elements.discountList.querySelectorAll('.discount-row__remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const day = parseInt(btn.dataset.remove);
        this.removeDay(day);
      });
    });
  },

  /**
   * Add a new day to the discount schedule
   */
  addDay() {
    const days = Object.keys(this.discounts).map(Number);
    const nextDay = Math.max(...days) + 1;

    // Default to same discount as previous day or 50%
    const prevDiscount = this.discounts[nextDay - 1] || 50;
    this.discounts[nextDay] = Math.min(prevDiscount + 10, 100);

    this.renderDiscountList();
  },

  /**
   * Remove a day from the discount schedule
   */
  removeDay(day) {
    if (day <= 3) return; // Can't remove first 3 days

    delete this.discounts[day];

    // Renumber remaining days above this one
    const days = Object.keys(this.discounts).map(Number).sort((a, b) => a - b);
    const newDiscounts = {};

    days.forEach((d, index) => {
      newDiscounts[index + 1] = this.discounts[d];
    });

    this.discounts = newDiscounts;
    this.renderDiscountList();
  },

  /**
   * Validate the form
   */
  validateForm() {
    const name = this.elements.saleNameInput.value.trim();
    const isValid = name.length > 0;

    this.elements.startSaleButton.disabled = !isValid;
    return isValid;
  },

  /**
   * Start a new sale
   */
  startSale() {
    if (!this.validateForm()) return;

    const name = this.elements.saleNameInput.value.trim();
    const startDate = this.elements.startDateInput.value;

    const sale = this.createSale({
      name: name,
      startDate: startDate,
      discounts: { ...this.discounts }
    });

    // Navigate to checkout
    App.showScreen('checkout');
  },

  /**
   * Create a new sale and save to storage
   */
  createSale(config) {
    const sale = {
      id: Utils.generateId(),
      name: config.name,
      startDate: config.startDate,
      discounts: config.discounts || this.defaultDiscounts,
      createdAt: Utils.getTimestamp()
    };

    Storage.saveSale(sale);
    return sale;
  },

  /**
   * End the current sale
   */
  endSale() {
    console.log('SaleSetup.endSale() starting');
    console.log('Before clear - localStorage:', {
      sale: localStorage.getItem('estate_sale'),
      cart: localStorage.getItem('estate_cart'),
      transactions: localStorage.getItem('estate_transactions')
    });

    Storage.clearSale();
    Storage.clearCart();
    Storage.clearTransactions();

    console.log('After clear - localStorage:', {
      sale: localStorage.getItem('estate_sale'),
      cart: localStorage.getItem('estate_cart'),
      transactions: localStorage.getItem('estate_transactions')
    });
    console.log('SaleSetup.endSale() complete');
  },

  /**
   * Reset the form for a new sale
   */
  resetForm() {
    this.elements.saleNameInput.value = '';
    this.setDefaultDate();
    this.resetDiscounts();
    this.renderDiscountList();
    this.validateForm();
  }
};

# HANDOFF — Estate Sale Checkout MVP

**Last updated:** 2026-03-01
**Last session by:** Claude Code
**Current version:** v0.1
**Service worker cache:** v16

---

## What Was Accomplished

### Session 4 (2026-03-01)
- **Built Sale Dashboard** — Complete performance metrics screen:
  - Summary stats: customer count, total revenue, average ticket
  - Transaction list showing all transactions for current sale
  - Accordion expand/collapse to view itemized details
  - Discounted items show original price crossed out
  - Filter transactions to current sale only (by createdAt timestamp)
  - Empty state when no transactions
- **Added Dashboard buttons** — Accessible from both screens:
  - Checkout screen: secondary button grouped with Collect Payments
  - Setup screen: shown when a sale is active
  - Back button returns to correct origin screen
- **Service worker** — Bumped to v16, added dashboard.js to cache

### Session 3 (2026-03-01)
- **Built QR Scan/Receive View** — Complete two-person checkout workflow:
  - Added "Collect Payments" button to checkout screen (secondary styling)
  - Built QR scan screen with full-screen camera viewfinder
  - Native BarcodeDetector for Chrome/Edge with html5-qrcode fallback for iOS Safari
  - Camera permission denied handling with retry option
  - Built Payment Receive screen showing customer #, timestamp, itemized list, total
  - Original prices crossed out when discounted
  - "Mark Paid" button saves transaction to localStorage and returns to scan
  - Green success overlay animation on payment confirmation
- **Updated QR data format** — Added customerNumber (auto-incrementing per sale)
- **Added storage methods** — getNextCustomerNumber(), savePaidTransaction(), getPaidTransactions()
- **Service worker** — Bumped to v15, added scan.js, payment.js, and html5-qrcode CDN to cache

### Session 2 (2026-03-01)
- **Fixed day calculation bug**: Was off by one due to timezone parsing. Start date now parsed as local time in utils.js.
- **Added savings display**: Running total bar shows "Saved: $X.XX" when discount is active.
- **Built QR Handoff screen** (partially — see Known Bugs):
  - HTML structure and CSS in place
  - QR.js module with render logic
  - NEW CUSTOMER and BACK buttons wired up
- **Added backlog items** for v0.2: item editing, per-item discount override, toggle day discount, total-level discount
- **Cleaned up debug logs** from previous debugging session

### Session 1 (2026-02-27)
- Initialized git repo and pushed to GitHub: https://github.com/david-steinbroner/estate-checkout
- Created full project scaffold per CLAUDE_CODE_RULES.md file structure
- Built PWA basics (manifest.json, sw.js service worker, index.html entry point)
- **Built the checkout pad screen** — the most critical screen in the app:
  - Number pad with 0-9, decimal, backspace
  - Large ADD button (green, prominent)
  - Price display with currency formatting
  - Optional description field
  - Item list showing original and discounted prices
  - Running total always visible
  - Remove individual items (× button)
  - CLEAR ALL with confirmation modal
  - DONE button (disabled when cart empty)
  - Flash feedback on item add
- Created localStorage abstraction for cart persistence
- Created utility functions for currency, discounts, sale day calculation
- Placeholder SVG icons for PWA
- Downloaded qrcode.min.js library
- **Fixed layout to fit single viewport (no scrolling)**:
  - Header compressed to single line: "Sale Name | Day X | X% off"
  - Total bar moved above item list, made compact
  - Item list is only scrollable element (flex-grow)
  - Numpad buttons reduced to 52px (still easy to tap)
  - All buttons visible on 375x667 viewport (iPhone SE)
- **Built Sale Setup screen**:
  - Sale name input (required)
  - Start date picker (defaults to today)
  - Discount schedule: Day 1/2/3 with defaults (0%, 25%, 50%)
  - "Add Day" button for longer sales (Day 4+)
  - START SALE button (green, prominent)
  - Routing: no active sale → setup, active sale → checkout
- **Fixed checkout pad**: Items without description no longer show "(no description)"
- **Added End Sale button**: Small button in checkout header top-right, clears sale and returns to setup

---

## Current State

### What Works (confirmed on Cloudflare Pages)
- **Sale Setup**: Create a new sale with name, start date, discount schedule
- **Routing**: App opens to setup if no sale, checkout if sale exists
- **Number pad entry**: Tap digits → price appears → tap ADD → item added to list
- **Item list rendering**: Shows description (if provided) + original/discounted price
- **Running total**: Updates automatically as items are added/removed
- **Savings display**: Shows "Saved: $X.XX" when discount is active
- **Remove items**: Tap × to remove individual items
- **Clear all**: Shows confirmation modal, clears cart on confirm
- **Discount display**: Header shows sale day and discount percentage
- **Discount calculation**: Based on start date vs. today, applies correct day's discount
- **Cart persistence**: Items survive page refresh (localStorage)
- **End Sale**: Button in header ends sale and returns to setup
- **NEW CUSTOMER / BACK buttons**: Work correctly on QR screen
- **QR data format**: Includes customerNumber and timestamp
- **Collect Payments button**: Opens QR scan view from checkout screen
- **QR Scan view**: Camera viewfinder, native BarcodeDetector or html5-qrcode fallback
- **Payment Receive screen**: Shows customer #, time, itemized list with discounts, total
- **Mark Paid**: Saves transaction to localStorage, shows confirmation, returns to scan
- **Customer numbering**: Auto-increments per sale, resets when sale ends
- **Offline scanning**: html5-qrcode library cached for offline iOS scanning
- **Dashboard**: Summary stats (customers, revenue, avg ticket) for current sale
- **Transaction list**: View all transactions with accordion expand for details
- **Dashboard navigation**: Accessible from checkout and setup screens

### What's Broken
- None currently

### What's Half-Done
- **Speech-to-text**: Structure exists, needs full parsing logic

---

## Known Bugs

None currently.

### Fixed Bugs
- **Date picker defaults to tomorrow** — Same UTC timezone issue as day calculation. Fixed by using local date components in `setDefaultDate()`.
- **QR Handoff screen blank** — Render order issue and missing error handling. Fixed by rendering items/total first, adding try/catch around QR code generation, and defensive element caching.
- **Day calculation off by one** — Timezone parsing issue. Fixed by parsing start date as local time.
- **End Sale button not working** — Service worker was caching old JS. Fixed by bumping cache version.
- **Screen switching broken** — The `.checkout-pad` CSS class had `display: flex` which overrode `.screen { display: none }`. Fixed by removing the display property from `.checkout-pad`.
- **Checkout.endSale() firing twice** — Added guard flag and stopPropagation to prevent double execution on mobile.

---

## Next Steps (Priority Order)

1. **Complete speech-to-text** — Parse "blue vase fifteen dollars" into description + price
2. **One-person checkout flow** — Skip QR, mark paid directly (backlogged)
3. **Dashboard enhancements** — Date range filtering, export (backlogged)

---

## Files Changed This Session

**Session 4:**
```
/js/
  dashboard.js    # NEW - Dashboard screen with stats and transaction list
  checkout.js     # Added Dashboard button
  sale-setup.js   # Added Dashboard button with show/hide logic
  app.js          # Register Dashboard module, add routing
/css/
  styles.css      # Added dashboard styles, updated secondary actions layout
/index.html       # Added Dashboard screen, Dashboard buttons
/sw.js            # Bumped to v16, added dashboard.js to cache
/HANDOFF.md       # Updated with session 4 changes
```

**Session 3:**
```
/js/
  scan.js         # NEW - QR scanning with BarcodeDetector + html5-qrcode fallback
  payment.js      # NEW - Payment receive screen, Mark Paid functionality
  storage.js      # Added customer counter and paid transactions methods
  checkout.js     # Added customerNumber to transaction, Collect Payments button
  qr.js           # Added customerNumber to QR data
  sale-setup.js   # Clear customer counter on end sale
  app.js          # Register Scan and Payment modules, routing
/css/
  styles.css      # Added scan screen and payment screen styles
/index.html       # Added Collect Payments button, scan screen, payment screen HTML
/sw.js            # Bumped to v15, added scan.js, payment.js, html5-qrcode CDN
/HANDOFF.md       # Updated with session 3 changes
```

**Session 2:**
```
/js/
  utils.js        # Fixed day calculation timezone bug
  checkout.js     # Added savings display, QR navigation
  qr.js           # Full QR handoff implementation, fixed rendering order and error handling
  app.js          # Cleaned up debug logs, added QR screen routing
  sale-setup.js   # Fixed date picker timezone bug (local date components)
/css/
  styles.css      # Added savings display styles, QR screen styles
/index.html       # Added savings span, QR screen HTML
/sw.js            # Cache at v14
/BACKLOG.md       # Added v0.2 items
```

---

## Open Questions

1. **QR data format:** Currently raw JSON. May need compression for large carts (50+ items).
2. **Sale persistence:** Current behavior clears transactions when sale ends. Confirm this is desired.
3. **Service worker caching:** Must bump cache version in sw.js when deploying JS changes.

---

## How to Test

### Sale Setup Flow
1. Clear localStorage: DevTools > Application > Local Storage > Clear
2. Refresh page → should see Sale Setup screen
3. Enter sale name (e.g., "Test Estate")
4. Verify date picker defaults to TODAY (not tomorrow)
5. Set start date to today → should show "Day 1" with 0% discount
6. Set start date to yesterday → should show "Day 2" with 25% discount
7. Tap START SALE
8. Checkout pad should show correct day and discount

### Checkout Flow
1. Type price on number pad
2. Tap ADD → item appears in list with "Added!" flash
3. If discount active, running total bar shows "Saved: $X.XX"
4. Add several items → verify running total updates
5. Tap × on an item → verify it's removed
6. Tap DONE → QR screen should appear with QR code and item summary
7. Tap NEW CUSTOMER → clears cart, returns to checkout
8. Tap BACK → returns to checkout with cart intact

### QR Scan/Payment Flow (Two-Person Workflow)
1. **Checkout Worker:** Add 3 items → tap DONE → QR code shows
2. **Payment Worker:** Tap "Collect Payments" → camera opens
3. Point camera at QR code → Payment screen shows
4. Verify: Customer # and timestamp at top
5. Verify: All 3 items listed with correct prices
6. Verify: Total matches checkout total
7. Tap "MARK PAID" → green checkmark flashes → returns to scan view
8. Check localStorage: `estate_paid_transactions` should have the transaction

### Customer Number Test
1. Checkout 3 customers in sequence
2. Verify QR codes show Customer #1, #2, #3
3. End sale → start new sale
4. Checkout 1 customer → should show Customer #1 (reset)

### Camera Permission Test
1. Tap "Collect Payments"
2. Deny camera permission when prompted
3. Should see error message with "Retry" button
4. Tap Retry → grant permission → camera should start

### Dashboard Test
1. **Empty state:** Clear localStorage → start sale → tap Dashboard → shows zeros and "No transactions yet"
2. **With data:** Complete 3 checkouts → tap Dashboard → shows 3 customers, correct revenue, correct average
3. **Transaction detail:** Tap a transaction row → expands to show items → tap again → collapses
4. **Accordion:** Expand transaction #1 → tap transaction #2 → #1 collapses, #2 expands
5. **Discounted items:** Verify crossed-out original prices and discount label in expanded view
6. **Navigation from checkout:** Tap Dashboard from checkout → Back returns to checkout
7. **Data freshness:** Complete a checkout → open Dashboard → new transaction appears

### Local Server
```bash
cd estate-checkout
python3 -m http.server 8000 --bind 0.0.0.0
```
- Computer: http://localhost:8000
- Phone (same WiFi): http://192.168.86.33:8000

### Cloudflare Pages
- Production: https://estate-checkout.pages.dev (or configured domain)

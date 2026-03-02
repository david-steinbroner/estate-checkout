# HANDOFF — Estate Sale Checkout MVP

**Last updated:** 2026-03-02
**Last session by:** Claude Code
**Current version:** v0.1
**Service worker cache:** v37

---

## What Was Accomplished

### Session 22 (2026-03-02)
- **Reduced Numpad Button Size** — Changed `--numpad-btn-size` from 64px to 56px to reclaim vertical space on the checkout screen.
- **Added Expandable Item List** — Item list on checkout screen now has tap-to-expand behavior:
  - **Collapsed (default):** Items fill their flex-allocated space. When items overflow, a hint strip appears below showing "X items — tap to see all".
  - **Expanded:** Tapping the item list or hint strip expands it as an absolute overlay downward from the running-total bar, covering the numpad/input but not the action bar. A "✕ Close" strip at the bottom and a semi-transparent backdrop allow collapsing.
  - **Auto-collapse triggers:** Adding an item, tapping DONE, tapping CLEAR ALL, tapping the close strip or backdrop. Removing items auto-collapses if remaining items fit.
  - Action bar stays above the expanded list (z-index 51) so DONE/CLEAR ALL are always accessible.
- **Service worker** — Bumped to v37

### Session 21 (2026-03-02)
- **Removed Dead JS** — Deleted `QR.parseData()` (unused, scan.js does its own parsing), `Dashboard.originScreen` (set but never read, back button removed in Session 13), `Utils.parseCurrency()` (never called), `Scan.onDeactivate()` (never called, cleanup handled by `Scan.stop()` from `showScreen()`), `Storage.clearAll()` (never called by any module)
- **Extracted Duplicate Functions to Utils** — Moved `escapeHtml()` from checkout.js, dashboard.js, qr.js, payment.js → `Utils.escapeHtml()`. Moved `formatTime()` from dashboard.js, payment.js → `Utils.formatTime()`. All call sites updated from `this.` to `Utils.` references.
- **Removed Dead CSS** — Deleted `.dashboard-header`, `.dashboard-header__title` (no HTML uses them, dashboard uses shared header), `.dashboard-action--back` (back button removed in Session 13), `.visually-hidden` (never used)
- **Removed console.logs** — Deleted `console.log('Estate Checkout initialized')` and `console.log('Service Worker registered:')` per CLAUDE_CODE_RULES.md. All `console.error()` calls retained.
- **Service worker** — Bumped to v36

### Session 20 (2026-03-02)
- **Fixed Touch Target Violations** — Number pad buttons increased from 52px to 64px (spec requires 64x64 minimum). Dashboard detail action buttons (Mark Paid, Reopen, Collect Payment) increased from 36px to 48px (spec requires 48px minimum). Sheet buttons already 48px — verified correct.
- **Replaced Hardcoded CSS with Variables** — Added 10 new CSS custom properties: `--color-success-dark`, `--color-primary-dark`, `--color-danger-dark`, `--color-bg-hover`, `--overlay-backdrop`, `--radius-lg`, `--sheet-padding`, `--btn-height-lg`, `--numpad-btn-size`. Replaced all hardcoded `:active` state colors, overlay backdrop, sheet border-radius/padding, button heights, and sheet child element font-sizes/margins/gaps with variable references. No visual changes — pure refactor.
- **Service worker** — Bumped to v35

### Session 19 (2026-03-02)
- **Fixed Header Buttons on Scan Permission-Denied Screen** — After denying camera permission, header buttons (← Checkout, Dashboard) did nothing. Root cause: on iOS/Safari fallback path, `startFallbackScanner()` sets `this.html5Scanner = new Html5Qrcode(...)` before calling `start()`. When permission is denied, `start()` rejects but `html5Scanner` remains non-null. When user taps a header button, `showScreen()` calls `Scan.stop()` which tries `this.html5Scanner.stop()` on a never-started scanner — throwing an error that crashes `showScreen()` before the screen transition. Fix: (1) null out `this.html5Scanner` in `start()`'s catch block so `stop()` skips it, (2) wrap `Scan.stop()` in try/catch in `showScreen()` as a defensive safety net.
- **Service worker** — Bumped to v34

### Session 18 (2026-03-02)
- **Fixed Scan Permission Trap** — `.scan-error` overlay used `position: absolute; inset: 0` but `.scan-screen` had no `position: relative`, so the error covered the entire viewport including the shared header. Added `position: relative` to `.scan-screen` to constrain the error overlay within the scan area, keeping header navigation accessible when camera permission is denied.
- **Added Dev Page Title Bar** — Thin black bar at top of every screen showing the current page name (SETUP, CHECKOUT, QR HANDOFF, COLLECT PAYMENTS, PAYMENT, DASHBOARD) for QA identification during build phase. Title updates on every screen transition via `showScreen()`. Marked as DEV ONLY in all files for easy removal before production.
- **Service worker** — Bumped to v33

### Session 17 (2026-03-02)
- **Removed Scan and Payment Screen Headers** — Deleted redundant `.scan-header` and `.payment-header` elements since Session 16 added ← Checkout to the shared header. Now only one navigation bar per screen.
- **Added Payment Info Bar** — Replaced payment header with a simple centered info bar showing "Customer #X — time"
- **Unified All Overlays to Bottom Sheets** — Standardized all 6 interactive overlays to use shared `.overlay` + `.sheet` + `.sheet__btn` classes:
  - Clear All confirmation → bottom sheet
  - End Sale confirmation → bottom sheet
  - No-description prompt → already bottom sheet, updated class names
  - Speech confirm/fail/permission → already bottom sheets, standardized
  - All backdrops now use consistent `rgba(0,0,0,0.5)`
  - All buttons now 48px height with 16px font
  - All z-index set to 100
- **Removed Old CSS** — Deleted deprecated `.modal-overlay`, `.modal`, `.desc-prompt-*`, `.speech-overlay`, `.speech-sheet` classes. Kept `.speech-processing` (spinner) and `.payment-success` (flash) unchanged.
- **Service worker** — Bumped to v32

### Session 16 (2026-03-02)
- **Added ← Checkout Button to Header** — New back button in shared header navigates to checkout without clearing cart. Visible on Scan, Payment, QR screens, and on Dashboard only when cart has items.
- **Removed Duplicate QR Buttons** — Removed DASHBOARD and BACK buttons from QR screen action area. Header now handles all navigation; QR screen only shows NEW CUSTOMER button.
- **Added Safe Area Insets** — Checkout action bar, Dashboard actions, and QR actions now have padding-bottom for iPhone home indicator via `env(safe-area-inset-bottom)`
- **Service worker** — Bumped to v31

### Session 15 (2026-03-02)
- **Fixed Speech Confirm Description Prompt Bypass** — Speech confirmAdd() now sets `Checkout.pendingAddWithoutDesc = true` before calling addItem(), preventing the redundant description prompt after user already confirmed via speech modal
- **Fixed sw.js Null Accept Header** — Service worker fetch handler now uses `(event.request.headers.get('accept') || '')` to prevent TypeError when accept header is null (e.g., manifest fetches)
- **Fixed Scan Timeout Race Condition** — handleScan() now stores timeout ID in `this.restartTimeout`, checks screen is still active before calling start(), and stop() clears the timeout. Prevents camera restart when user navigates away during invalid QR retry delay.
- **Fixed Dashboard Event Listener Accumulation** — Moved `[data-action]` delegated event listener from renderTransactionList() to bindEvents() so it's bound exactly once instead of on every render
- **Service worker** — Bumped to v30

### Session 14 (2026-03-02)
- **Fixed Camera Not Stopping on Header Navigation** — App.showScreen() now calls Scan.stop() when leaving the scan screen
- **Fixed Payment Worker Storage Bug** — markPaid() now updates the existing transaction in estate_transactions instead of writing to a separate estate_paid_transactions key that Dashboard never read. Payments from scan/receive flow now appear correctly on Dashboard with green "Paid" badge.
- **Removed Dead Code** — Deleted Storage.KEYS.PAID_TRANSACTIONS, Storage.savePaidTransaction(), Storage.getPaidTransactions(), Storage.clearPaidTransactions()
- **Fixed DONE Button Blocking After BACK** — finishCheckout() now stores lastTransaction and re-navigates to QR screen when transactionSaved is true. User can press DONE → BACK → DONE and see the same QR again. Cart modifications (add/remove) still create new transactions.
- **Service worker** — Bumped to v29

### Session 13 (2026-03-02)
- **Fixed Description Prompt Not Showing** — Changed from `hidden` attribute to `.visible` class pattern to avoid browser style conflicts
- **Fixed NEW CUSTOMER Button Sizing** — Full-width 48px tall green button on QR screen (removed incorrect `flex: 1`)
- **Fixed BACK Preserves Cart** — Cart no longer cleared on DONE:
  - Transaction created but items stay in cart
  - BACK returns to checkout with items intact for review/modification
  - Only NEW CUSTOMER clears cart
  - Added `transactionSaved` flag to prevent duplicate transactions
- **Shared Navigation Bar** — Header moved outside screens:
  - Same nav bar visible on Checkout, QR, Dashboard, Collect Payments screens
  - Hidden on Setup screen
  - Three buttons always in same position: Dashboard | Collect Payments | End Sale
  - Active button highlighted (blue background) based on current screen
  - All screens now use consistent navigation
  - Event handling consolidated in app.js
- **NEW CUSTOMER Button on Dashboard** — Start fresh checkout from dashboard
- **Service worker** — Bumped to v28

### Session 12 (2026-03-02)
- **Fixed Duplicate Tickets** — Cart clears after DONE:
  - Cart items and localStorage cleared after creating transaction
  - Navigating back to checkout shows empty cart
  - Prevents duplicate tickets when returning from QR or Dashboard
- **Dashboard Button on QR Screen** — Quick access to transaction status:
  - NEW CUSTOMER button on top (green, primary)
  - DASHBOARD and BACK buttons side by side below (outline style)
  - Dashboard button navigates to Dashboard from QR screen
- **Redesigned Mic Permission Flow** — Proactive permission handling:
  - Permission state checked on page load via `navigator.permissions.query()`
  - State tracked in `Speech.micPermissionState` ('granted', 'denied', 'prompt')
  - Listens for permission changes via `change` event
  - When permission is 'prompt': shows custom "Voice Input" modal instead of starting recording
  - "Allow Microphone" button triggers `getUserMedia()` to show browser's native popup
  - After granting: Speak button pulses to indicate ready
  - "Use Number Pad Instead" dismisses modal without action
  - When permission is 'denied': shows settings instructions immediately
  - Falls back to existing behavior if Permissions API unavailable
- **Service worker** — Bumped to v27

### Session 11 (2026-03-02)
- **Fixed Mic Release on Page Leave** — Comprehensive cleanup:
  - New `forceStopRecognition()` method aborts mic, clears all timeouts, hides overlays/modals
  - Event listeners for `visibilitychange`, `pagehide`, `blur` now call forceStopRecognition
  - Orange mic indicator in status bar disappears when leaving page
- **Fixed Processing Hang** — Multiple safety nets:
  - Hard 8-second timeout on processing overlay (regardless of API state)
  - `onend` handler always cleans up and shows failure modal if no result
  - Processing overlay can never hang indefinitely
- **Restyled Description Prompt** — Matches speech modal pattern:
  - Dark semi-transparent backdrop overlay
  - Bottom sheet style with rounded top corners
  - Full-width stacked buttons (48px tall) for easy tapping
  - Backdrop tap dismisses and adds without description
  - Consistent "the app is asking you something" visual language
- **Service worker** — Bumped to v26

### Session 10 (2026-03-01)
- **Consolidated Header Layout** — Cleaner, more tappable design:
  - Thin context strip (24px) with sale info: "Sale Name · Day X · X% off"
  - Middle dots (·) as separators instead of pipe characters
  - Single button bar (48px) with three equal-width buttons
  - All buttons 40px tall for easy tapping
  - End Sale button now in button bar with danger/red styling
- **Service worker** — Bumped to v25

### Session 9 (2026-03-01)
- **Fixed Speech Permission Timing** — No more race with permission popup:
  - Timeout now starts in `recognition.onstart` (after mic is active)
  - Previously started on button release, racing with permission popup
  - Permission popup no longer causes false timeout failures
- **Fixed Try Again Behavior** — No auto-recording:
  - "Try Again" now highlights Speak button with pulsing animation
  - User must tap Speak themselves when ready
  - Removes confusing auto-start behavior
- **Permission Denied Handling** — Clear feedback:
  - Shows "Microphone access required" message when denied
  - Specific message for first-time denial vs previously denied
  - Hides "Try Again" button (won't help until settings changed)
  - Guides user to browser settings or number pad
- **Pre-check Permission State** — Detect previous denial:
  - Checks `navigator.permissions.query()` before starting
  - If previously denied, shows message immediately
  - Prevents attempting recognition that will fail
- **Service worker** — Bumped to v24

### Session 8 (2026-03-01)
- **Top Nav Bar Reorganization** — Dashboard and Collect Payments in header:
  - Header now two rows: sale info row + nav buttons row
  - Compact outline-styled buttons in nav row
  - Removed secondary-actions section from bottom of checkout
  - Cleaner checkout screen layout
- **Description Input Repositioned** — Better item entry flow:
  - Description input moved below price display, directly above keypad
  - Input height increased to 44px for easier typing
  - Feels like one cohesive input group
- **"Add Without Description" Prompt** — Smart prompting:
  - First 3 times per session: shows inline banner prompt
  - Options: "Add Without" or "Add Description"
  - Auto-dismisses after 3 seconds (adds without description)
  - After 3 prompts: adds silently without asking
- **Transaction Status System** — Full ticket management:
  - New fields: `status` (unpaid/paid/void), `paidAt`, `voidedAt`, `reopenedFrom`
  - Automatic migration for existing transactions
  - Status badges on dashboard: green "Paid", red "Unpaid", gray "Void"
  - Voided transactions grayed out with strikethrough
- **Paid/Unpaid Toggle** — Manual status control:
  - Toggle button in expanded transaction detail
  - Tracks `paidAt` timestamp when marked paid
- **Reopen Ticket Flow** — Edit completed transactions:
  - "Reopen" button in expanded detail
  - Voids original transaction, loads items to checkout
  - New transaction tracks `reopenedFrom` customer number
- **Collect Payment from Dashboard** — Generate QR for any transaction:
  - "Collect Payment" button in expanded detail
  - Navigates to QR screen with that transaction's data
- **Dashboard Stats Exclude Voids** — Accurate reporting:
  - Customer count, revenue, avg ticket exclude voided transactions
  - Voided transactions still visible in list for audit trail
- **Service worker** — Bumped to v23

### Session 7 (2026-03-01)
- **Fixed Speech Recognition Timing for Mobile** — Major reliability fix:
  - No longer calls `recognition.stop()` on button release
  - Let Web Speech API end naturally after detecting silence
  - Shows "Processing..." overlay while waiting for result
  - 5-second timeout safety net if no result arrives
  - Works on mobile where processing latency was causing failures
- **Fixed Parser for $-Prefixed Prices** — Handles mobile speech API output:
  - Now parses: "$25", "$5.50", "$1,000" formats
  - "rug $25" → description: "rug", price: $25.00
  - Strips commas from numbers
- **Added Helpful Error Guidance** — Progressive tips for struggling users:
  - Tracks consecutive failures (resets on success)
  - Shows contextual tips: "Hold the button...", "Try speaking slower...", etc.
  - After 5 failures: suggests using number pad instead
  - Error-specific messages: no-speech, network, timeout
- **Removed Tap Sound** — Added `-webkit-touch-callout: none` to mic button
- **Release Mic on Page Hide** — Frees microphone when user leaves page:
  - Listens for `visibilitychange`, `pagehide`, and `blur` events
  - Calls `recognition.abort()` for immediate mic release (no waiting for results)
  - Fixes phone status bar showing active microphone after switching tabs
- **Service worker** — Bumped to v22

### Session 6 (2026-03-01)
- **Improved Speech UI for Mobile** — Major visual updates:
  - Confirmation overlay now full-width bottom sheet (not small floating card)
  - Large price text (40px, green, bold) clearly visible
  - Full-width buttons (56px height) easy to tap on mobile
  - 12px vertical spacing between buttons prevents mis-taps
  - Smooth slide-up animation on modal open
  - Safe area inset padding for iPhone notch/home indicator
- **Bigger mic button** — Now 72x48px rounded rectangle with "🎤 Speak" label
- **Listening indicator** — Red pulsing "Listening..." text appears below price when recording
- **Processing state** — Brief "Processing..." spinner overlay before confirmation appears
- **Parse failure modal** — Same large bottom sheet style with 22px title and large buttons
- **Service worker** — Bumped to v18

### Session 5 (2026-03-01)
- **Built Speech-to-Text Item Entry** — Complete voice input system:
  - Hold-to-talk mic button with pulsing red animation while recording
  - Web Speech API integration with proper error handling
  - Natural language parser for price extraction:
    - Number words: "one" through "nineteen", "twenty" through "ninety", "hundred"
    - Compound numbers: "twenty five" → $25, "thirty two" → $32
    - X-fifty pattern: "seven fifty" → $7.50, "fifteen fifty" → $15.50
    - Hundred pattern: "two hundred" → $200, "three hundred fifty" → $350
    - Filler word stripping: "dollars", "bucks", "and", "cents"
  - Description extraction: "blue vase fifteen dollars" → desc: "blue vase", price: $15.00
  - Confirmation overlay with CONFIRM / EDIT / CANCEL buttons
  - Parse failure modal showing transcript with TRY AGAIN / CANCEL
  - Parser exported as `Speech.parse()` for console testing
- **Cross-device support** — Pointer events (not mouse events) for hold-to-talk
- **Service worker** — Bumped to v17

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
- **Dashboard navigation**: Accessible from top nav bar on checkout screen
- **Speech-to-text**: Hold mic → speak → release → parsed result shown
- **Speech parser**: Handles number words, compounds, X-fifty, hundred patterns
- **Voice confirmation**: CONFIRM adds item, EDIT populates fields, CANCEL dismisses
- **Descriptions via voice**: Carry through to QR, payment, and dashboard
- **Header layout**: Context strip + button bar with Dashboard, Collect Payments, End Sale
- **Description input**: Repositioned below price, 44px tall, closer to keypad
- **No-description prompt**: Bottom sheet with overlay, shows first 3 times, backdrop tap dismisses
- **Transaction status**: paid/unpaid/void with visual badges
- **Paid/unpaid toggle**: Toggle status from Dashboard expanded view
- **Reopen ticket**: Void original, load items to checkout for modification
- **Collect Payment from Dashboard**: Generate QR for any transaction
- **Dashboard stats**: Exclude voided transactions from totals

### What's Broken
- None currently

### What's Half-Done
- None currently

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

1. **One-person checkout flow** — Skip QR, mark paid directly (backlogged)
2. **Dashboard enhancements** — Date range filtering, export (backlogged)
3. **Item editing** — Tap item in cart to edit price/description

---

## Files Changed This Session

**Session 22:**
```
/css/styles.css     # --numpad-btn-size 64→56px, position:relative on .checkout-pad, expandable item list CSS (.expanded, .item-list-hint, .item-list-close, .item-list-backdrop), action-bar z-index/margin-top
/index.html         # Added id to item-list-container, added close strip, hint strip, backdrop elements
/js/checkout.js     # isExpanded/collapsedHeight state, cached new elements, expand/collapse/checkOverflow methods, modified addItem/removeItem/clearAll/finishCheckout/showClearModal to collapse first
/sw.js              # Bumped to v37
/HANDOFF.md         # Session 22 entry
```

**Session 17:**
```
/index.html
  - Removed .scan-header (screen-scan)
  - Removed .payment-header, added .payment-info bar (screen-payment)
  - Updated Clear All and End Sale modals to bottom sheet pattern
  - Updated No-desc prompt to use .overlay + .sheet classes
  - Updated all 3 Speech modals to use .overlay + .sheet classes
/css/styles.css
  - Added unified .overlay, .sheet, .sheet__* classes
  - Added .payment-info style
  - Removed .scan-header__*, .payment-header__* styles
  - Removed .modal-overlay, .modal, .modal__* styles
  - Removed .desc-prompt-*, .speech-overlay, .speech-sheet__* styles
/js/scan.js
  - Removed backButton from cacheElements and bindEvents
/js/payment.js
  - Removed backButton from cacheElements and bindEvents
/sw.js
  - Bumped to v32
/HANDOFF.md
  - Updated with session 17 changes
```

**Session 16:**
```
/index.html         # Added ← Checkout button to header, removed QR DASHBOARD/BACK buttons
/js/
  app.js            # Cache checkoutBtn, bind click, add updateCheckoutButton() for show/hide logic
  qr.js             # Removed dead button references and event bindings
/css/styles.css     # Added .header__btn--back style, safe area insets for action-bar, qr-actions, dashboard-actions
/sw.js              # Bumped to v31
/HANDOFF.md         # Updated with session 16 changes
```

**Session 15:**
```
/js/
  speech.js       # confirmAdd() sets pendingAddWithoutDesc before addItem
  scan.js         # Added restartTimeout property, store/clear timeout in handleScan/stop, check screen active
  dashboard.js    # Moved [data-action] event listener from renderTransactionList to bindEvents
/sw.js            # Null check for accept header, bumped to v30
/HANDOFF.md       # Updated with session 15 changes
```

**Session 14:**
```
/js/
  app.js          # Added Scan.stop() call in showScreen() when leaving scan screen
  checkout.js     # Added lastTransaction property, updated finishCheckout() to re-navigate, clearAll(), endSale()
  payment.js      # markPaid() now updates estate_transactions via Storage.updateTransaction()
  storage.js      # Removed PAID_TRANSACTIONS key and related methods (savePaidTransaction, getPaidTransactions, clearPaidTransactions)
/sw.js            # Bumped to v29
/HANDOFF.md       # Updated with session 14 changes
```

**Session 13:**
```
/js/
  app.js          # Shared header handling, nav events, updateHeader(), updateActiveNavButton()
  checkout.js     # Removed header elements, desc prompt uses .visible class, transactionSaved flag
  dashboard.js    # NEW CUSTOMER button handler, removed BACK button
  qr.js           # No changes (already had correct handlers)
/css/
  styles.css      # Body flex layout, header[hidden], .header__btn--active, .dashboard-action--new
/index.html       # Header moved outside screens, Dashboard NEW CUSTOMER button, desc prompt visible class
/sw.js            # Bumped to v28
/HANDOFF.md       # Updated with session 13 changes
```

**Session 12:**
```
/js/
  checkout.js     # Clear cart after finishCheckout() to prevent duplicates
  qr.js           # Added dashboard button caching and event handler
  speech.js       # Mic permission flow: checkPermissionState(), showPermissionModal(), requestMicrophonePermission()
/css/
  styles.css      # QR action buttons layout with new Dashboard button
/index.html       # QR Dashboard button, speech permission modal
/sw.js            # Bumped to v27
/HANDOFF.md       # Updated with session 12 changes
```

**Session 11:**
```
/js/
  speech.js       # forceStopRecognition(), hard 8s timeout, clearProcessingHardTimeout()
  checkout.js     # Backdrop tap event listener for desc prompt
/css/
  styles.css      # Desc prompt restyled as bottom sheet with overlay
/index.html       # Desc prompt HTML restructured with overlay
/sw.js            # Bumped to v26
/HANDOFF.md       # Updated with session 11 changes
```

**Session 10:**
```
/index.html       # Header restructured: context strip + button bar
/css/
  styles.css      # New header styles, context strip, equal-width buttons
/sw.js            # Bumped to v25
/HANDOFF.md       # Updated with session 10 changes
```

**Session 9:**
```
/js/
  speech.js       # onstart handler, permission check, retry highlight, permission denied modal
/css/
  styles.css      # mic-button.highlight animation
/index.html       # Added id to speech-fail-title element
/sw.js            # Bumped to v24
/HANDOFF.md       # Updated with session 9 changes
```

**Session 8:**
```
/js/
  checkout.js     # No-description prompt logic, reopenedFromCustomer tracking
  dashboard.js    # Status badges, toggle paid, reopen, collect payment, exclude voids
  storage.js      # Data migration, updateTransaction(), getTransaction()
/css/
  styles.css      # Header two-row layout, description input, prompt banner, status badges, detail actions
/index.html       # Header restructure, description input moved, no-description prompt element
/sw.js            # Bumped to v23
/HANDOFF.md       # Updated with session 8 changes
```

**Session 6:**
```
/js/
  speech.js       # Added mic status, processing overlay, updated element caching
/css/
  styles.css      # Rewrote speech modals as bottom sheets, enlarged mic button, added status indicator
/index.html       # Updated mic button with label, added mic status, processing overlay, bottom sheet structure
/sw.js            # Bumped to v18
/HANDOFF.md       # Updated with session 6 changes
```

**Session 5:**
```
/js/
  speech.js       # Complete rewrite - parser, Web Speech API, confirmation flow
/css/
  styles.css      # Added speech modal styles, mic button pulsing animation
/index.html       # Added speech confirmation and failure modals
/sw.js            # Bumped to v17
/HANDOFF.md       # Updated with session 5 changes
```

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

### Speech-to-Text Test
1. **Happy path:** Hold mic → say "blue vase fifteen dollars" → release → confirmation shows "Add 'blue vase' — $15.00?" → tap CONFIRM → item added with description
2. **Price only:** Hold mic → say "twenty five" → confirmation shows "Add item — $25.00?" → CONFIRM
3. **Compound price:** Hold mic → say "seven fifty" → confirmation shows "$7.50" → CONFIRM
4. **Large number:** Hold mic → say "two hundred" → confirmation shows "$200.00" → CONFIRM
5. **Edit flow:** Hold mic → say something → EDIT → number pad populated with price, description in field → adjust → ADD ITEM
6. **Cancel flow:** Hold mic → say something → CANCEL → nothing happens
7. **Parse failure:** Hold mic → say gibberish → shows "Couldn't understand" with transcript → TRY AGAIN or CANCEL
8. **No speech:** Hold mic → say nothing → release → error flash "Didn't catch that"
9. **API not supported:** Load on browser without Web Speech API → mic button hidden
10. **Console test:** Open DevTools → `Speech.parse("blue vase fifteen dollars")` → returns `{price: 15, description: "blue vase"}`

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

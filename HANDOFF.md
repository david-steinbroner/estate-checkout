# HANDOFF — Estate Sale Checkout MVP

**Last updated:** 2026-03-09
**Last session by:** Claude Code
**Current version:** v0.1
**Service worker cache:** v126

---

## What Was Accomplished

### Session 56 (2026-03-09)
- **Redesign item edit sheet** — Replaced tap-to-expand pattern with tap-to-edit. Rows now show consignor dot, description, qty badge, line total, and a pencil icon. Tapping a row opens the Add Item sheet in edit mode (pre-populated fields, "Save Changes" button). Added `editingItemIndex` property and `openEditItemSheet(index)` method to Checkout. Modified `confirmAddItem()` to handle both add and edit modes — edit updates existing item and re-opens item sheet. Removed expand/collapse HTML, inline desc edit, price haggle click, qty controls, trash button, and consignor dot tap from item sheet rows. Swipe-to-delete retained.
- Service worker v126 → v127.

### Session 55 (2026-03-09)
- **Add Item sheet: focus description first** — Description input auto-focuses with keyboard when the sheet opens (50ms setTimeout after visible).
- **Add Item sheet: remove multiplication from price display** — Price display now always shows the single-item price (e.g., "$5.00"), never "x 2 = $10.00". Qty is visible in the stepper row.
- **Add Item sheet: inline validation errors** — Replaced `showFlash('error')` calls with inline errors under each field using new `.sheet__field-error` class. Description error takes priority when both fields empty. Errors auto-hide after 2.5s. Added `_showFieldError()` helper to Checkout.
- Service worker v125 → v126.

### Session 54 (2026-03-09)
- **Sale confirmation shows full schedule** — Replaced single "Day 1" row and "Ends" row with a "Days" count row (e.g., "3 days" or "TBD") and individual rows for every schedule day showing date and discount (e.g., "Day 2 · Mar 11 — 25% off"). Days with no discount show "No discount" in lighter gray (isDefault styling). Service worker v124 → v125.

### Session 53 (2026-03-09)
- **Fix spurious "Day already exists" error on + Add** — Adding a day via "+ Add" could trigger a cascading `change` event on the end date input (iOS fires change when `.value` is set programmatically by `_syncEndDate()`). Fixed with a `_syncing` guard flag: `_syncEndDate()` and `_syncStartDate()` set `_syncing = true` while updating input values, and the start/end date change handlers early-return if `_syncing` is true. Also clear `dayDatePicker.value` immediately at the top of the handler (before any logic) to prevent stale value re-reads during cascades. Service worker v123 → v124.

### Session 52 (2026-03-09)
- **Date picker validation errors** — Added 3 validation checks with inline error messages:
  - End date before start date → "End date must be after start date." (re-added `#end-date-error` element)
  - Start date after end date → "Start date must be before end date." (uses existing `#start-date-error`)
  - "+ Add" duplicate date → "Day already exists. Select a different date." (new `#schedule-error` element)
- **Bug 1 (picker dismisses immediately)** — Investigated; not a bug. The code uses `change` events (not `input`), which fire only after the user confirms on both iOS ("Done") and Android ("OK"). No code change needed.
- Service worker v122 → v123.

### Session 51 (2026-03-09)
- **Fix TBD not unchecking when adding schedule day** — When TBD was checked and the user added a day via "+ Add", TBD stayed checked and end date stayed blank. Now the "+ Add" change handler unchecks TBD before calling `_syncEndDate()`, so the end date field updates correctly.
- **Remove end-date-error entirely** — The "That date already has a day" error under end date was confusing and kept reappearing due to iOS change events. Removed all `_showDateError('end-date-error', ...)` calls (3 total: end date handler, "+ Add" handler, per-row picker handler). Duplicate date picks are now silently ignored (revert/re-sync). Removed `#end-date-error` element from index.html. End date is now a pure display field. Service worker v121 → v122.

### Session 50 (2026-03-09)
- **Cross-browser date picker fix — overlay approach** — Replaced the fragile `showPicker()` / `_openPicker()` mechanism with a native overlay pattern. Invisible `<input type="date">` elements now sit directly on top of their tap targets at full size (`position: absolute; opacity: 0; width: 100%; height: 100%`), so the user's tap physically lands on a real date input — no programmatic picker triggering needed. Works on all iOS Safari (14+) and Android Chrome versions.
- **"+ Add" button**: Moved `#setup-day-date-picker` inside a new `.setup-section__action-wrap` span that wraps the button text. The overlay input covers the "+" text. Change handler adds the new day directly (no `_datePickerContext` indirection).
- **Per-row date labels**: Moved per-row `<input type="date" data-row-picker="N">` inside `.discount-row__date` span. Input overlays the date text (e.g., "Mar 9"). Change handler updates the day directly.
- **Removed dead code**: `_openPicker()`, `_handleDatePickerResult()`, `_datePickerContext` property, click handler on `.discount-row__date`, click handler on end date input (native input handles its own tap), `addDayButton` element cache.
- **CSS changes**: `.setup-hidden-input` now uses `position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; z-index: 1`. Added `.setup-section__action-wrap` with `position: relative`. Added `position: relative` to `.discount-row__date`.
- Service worker v118 → v119.

### Session 49 (2026-03-09)
- **Removed onboarding walkthrough entirely** — Deleted `js/onboarding.js` file, removed onboarding overlay HTML from `index.html`, removed "How It Works" button from setup menu sheet, removed all `Onboarding` references from `app.js` (init call, shouldShow check, click handler, element caching), removed all `.onboarding*` CSS rules and `@keyframes onboarding-fade-in` from `styles.css`, removed `/js/onboarding.js` from service worker cache list, bumped cache to v117.
- **Note:** The `estate_onboarding_seen` localStorage key is now orphaned. It's harmless and will be ignored.

### Session 48 (2026-03-07)
- **Sale setup page redesign — date-driven schedule** — Complete rewrite of the sale setup page. Sale name no longer required (optional). New SALE DATE section with start date ("Starts today" checkbox + date picker) and end date (TBD checkbox + date picker) side by side at 50% width. Discount schedule driven by date range: TBD = Day 1 only, end date set = Day 1 + last day, "+ Add Day" inserts between. Date labels on all discount rows ("Day N · Mon D"). Sale confirmation bottom sheet shows summary before starting (name, dates, Day 1 discount, consignors) with default/empty values in lighter gray. Added `endDate` field to sale object.
- **Uniform section system** — Replaced inconsistent `.setup-field`/`.setup-date-sublabel`/`.consignor-section__header` classes with unified `.setup-section` system. All section headers use same `font-size-xs`, uppercase, semibold styling. Reusable `.setup-section__header-row` with optional right-aligned `.setup-section__action` link. Renamed "Discount Schedule" to "Schedule", moved "+ Add" to section header.
- **Tap-to-edit discount rows** — Removed always-visible input boxes. 0% shows tappable "+ Add Discount" link (primary color). >0% shows tappable "X% off" text. Tapping either opens inline input with `inputmode="numeric"`, left-aligned, commits on blur/Enter.
- **Schedule days as source of truth** — Fundamental data model change. Schedule days stored as `[{ date, discount }]` array instead of `{ dayNum: percent }` map. End date is read-only mirror of last schedule day. TBD unchecked by default. "+ Add" always visible, opens native date picker to select date first, inserts chronologically. Day dates tappable to edit via date picker, re-sorts on change. Swipe-to-delete on schedule rows (same pattern as item rows), Day 1 protected. Start date ↔ Day 1 bidirectional sync. `_buildDiscountsObject()` converts back to `{ 1: 0, 2: 25 }` format for sale creation.
- **Native date picker fix** — Added `_openPicker()` helper using `.showPicker()` with `.focus()` fallback. Per-row hidden `<input type="date">` elements for editing day dates. End date input made tappable (removed readonly) with change handler for adding new last day or rejecting dates before existing days.
- **CSS/spacing fixes** — Date inputs capped at `max-width: 90%` in half-width sections. Section spacing increased from `--space-lg` to `--space-xl`.

### Session 47 (2026-03-06)
- **Item sheet row simplification** — Removed row numbers from both item edit sheet and inline item list. Collapsed quantity controls into tap-to-expand pattern: default row shows consignor dot, description, qty badge pill (×N if >1), and line total price. Tapping a row expands it to reveal ± qty stepper (larger 32px buttons) and red trash icon for delete. Tapping again or another row collapses. Swipe-to-delete still available as secondary gesture. Added CSS for `.item-row__qty-badge`, `.item-row__expand-area` (max-height transition), `.item-row__expand-inner`, `.item-row__trash-btn`. Service worker v115 → v116.

### Session 46 (2026-03-06)
- **Invoice Discount sheet redesign** — Replaced single-mode sheet with 3-mode toggle (% off, $ off, New Price). Live 3-line preview (subtotal, discount savings, new total). Validation: % > 100, $ > subtotal, new price > subtotal. Mode switch clears input, updates placeholder, refocuses. `Utils.applyTicketDiscount()` extended with `newprice` type. Service worker v105 → v106.
- **Dashboard invoice actions** — Renamed "Generate Invoice" to "See Invoice" for unpaid/paid transactions (open keeps "Create Invoice"). Added cancel confirmation sheet with "Cancel Invoice" / "Keep Invoice" buttons, overlay backdrop dismiss. Cancelling a draft clears checkout draft tracking. Service worker v106 → v107.
- **Consignor data model + Storage** — Added `CONSIGNOR_COLORS` palette (10 colors) in utils.js. Added `consignors` array to sale object. Storage methods: `getConsignors()`, `saveConsignors()`, `addConsignor()`, `updateConsignor()`, `deleteConsignor()`. Service worker v107 → v108.
- **Consignor management UI** — Consignors section in both Sale Setup screen and Edit Sale sheet. Add/Edit Consignor bottom sheet with name, color picker (10 tappable dots, auto-selects first unused), payout type dropdown (Percentage/Flat Fee), value input with live hint text, optional notes. Delete with confirmation. Pre-sale consignors stored in `SaleSetup.pendingConsignors`, transferred to sale on creation.
- **Consignor tagging in Add Item sheet** — Consignor selector row between qty stepper and numpad (hidden when no consignors exist). Remembers last-used consignor across consecutive items. Consignor picker bottom sheet with "None" + all consignors (colored dot, name, checkmark). `consignorId` saved on item object. Service worker v108 → v109.
- **Consignor tagging in item edit sheet** — Colored consignor dot on each item row (tappable to change). Dashed empty dot for untagged items when consignors are configured. Shares the consignor picker sheet.
- **Consignor display throughout app** — Checkout item list shows colored dot before description. Dashboard transaction detail shows dot + consignor name inline with each item. Dashboard consignor summary at bottom of expanded transaction (items/total per consignor). Service worker v109 → v110.
- **Consignor Payouts screen** — New screen accessible from hamburger menu (hidden when no consignors). Sale total + operator cut summary. Per-consignor cards with arrangement, items sold, revenue, payout split. Percentage and flat fee calculations. Warning when flat fee exceeds revenue. Expandable "View Items" accordion. Untagged items section. Only counts paid transactions. New `js/payouts.js` module. Service worker v110 → v111.

### Session 45 (2026-03-06)
- **Dashboard TDZ bug fix** — `renderTransactionRow()` referenced `status` before its `const` declaration (temporal dead zone). Moved `const status = txn.status || 'unpaid'` to top of function. This was causing the entire transaction list to render blank while filter pill counts (computed separately) showed correct numbers.
- **Dashboard error isolation** — Wrapped `renderTransactionList()` `.map()` callback and `renderTransactionDetail()` call in try-catch blocks. A single bad transaction now logs an error instead of blanking the entire list.
- **iOS Safari mic release** — `forceStopRecognition()` now destroys and nulls the `SpeechRecognition` instance after `abort()`, forcing iOS to release the mic hardware. Added `document.activeElement?.blur()` as extra iOS audio session release hint. New `ensureRecognition()` method extracted from `init()` recreates the instance on demand.
- **iOS Chrome mic errors (Alissa's bug)** — Four interacting fixes for mic immediately erroring on iOS:
  1. `ensureRecognition()` added to top of `startListening()` and `startDescriptionCapture()` so mic works after recognition was destroyed by visibility change
  2. Silent retry with 300ms delay when iOS fires `no-speech` within 2s of `recognition.start()` (before mic hardware initializes), only retries once
  3. `QUICK_TAP_THRESHOLD` lowered to 800ms; quick-tap modal skipped if `onstart` hasn't fired (mic still initializing)
  4. Mic permission persisted to `localStorage` so iOS (where `navigator.permissions.query` fails) doesn't show permission modal on every page load
- Service worker cache bumped v85 → v89 across all fixes.

### Session 44 (2026-03-05)
- **Dashboard status overhaul** — Replaced 3-status system (pending/paid/void) with 5 statuses: Open (blue), Unpaid (amber), Paid (green), Edited (gray), Cancelled (gray). Open invoices are draft transactions that appear on dashboard as items are added to cart. Removed cart banner entirely.
- **Draft transaction persistence** — New `Storage` methods: `deleteTransaction()`, `saveDraftTxnId()`, `getDraftTxnId()`, `clearDraftTxnId()`. `Checkout.saveDraftTransaction()` creates/updates open drafts after every cart mutation. Drafts promoted to "unpaid" on `finishCheckout()`, deleted on `clearAll()`.
- **Filter pills + stats** — Dashboard filters: All, Open, Unpaid, Paid, Void. Stats: Invoices = non-void count, Revenue/Avg = paid only.
- **Open invoice actions** — Tapping an Open invoice on dashboard navigates to checkout. Expanded detail shows Edit Order, Create Invoice, Cancel buttons.
- **Order/Invoice naming distinction** — Pre-QR references use "Order" (Order #3), post-QR use "Invoice". Dynamic done button: "Create Invoice" / "See Invoice" / "Create New Invoice" based on editing state.
- **Lazy voiding** — Editing an invoice doesn't void the original until the first actual cart mutation. `checkEditDirty()` called at top of every cart mutation method.
- **True-centered nav bar** — Header context text absolutely positioned with `left: 0; right: 0; padding: 0 56px` so it's centered across full header width, not offset by menu button.
- **Mark Paid on QR screen** — Mark Paid button marks transaction paid via `Storage.updateTransaction()` and navigates to dashboard (not payment screen).
- Service worker cache bumped v73 → v85.

### Session 43 (2026-03-05)
- **Item sheet text alignment** — Fixed text alignment throughout to match app convention.
- **Removed X close button from item sheet** — Closing handled by overlay tap and swipe.
- **Description mic button** — Added mic button to description entry sheet for voice input of descriptions.
- **Order-in-progress banner** — Cart banner shown when navigating away from active cart.
- **Description mic fix** — Skip quick-tap check in description mode, add tap feedback.
- **Hint strip merged into total bar** — Order info (left) + price (right) in single bar.
- **Nav bar text centering** — Centered and sized up nav bar sale info text.
- **Speech confirm/edit fix** — Removed reference to non-existent `descriptionInput` element.
- **QR screen redesign** — 2x2 button grid: Edit Order, Mark Paid, Discount, New Order. Cart banner hidden on QR/payment screens. Item list border fix.
- **Ticket/Order renamed to Invoice** — "Create Ticket" → "Create Invoice", "Edit Ticket" → "Edit Invoice", etc. Updated QR helper text. Fixed button outlines.
- Service worker cache bumped v63 → v73.

### Session 42 (2026-03-05)
- **Edit Sale: Current Day dropdown** — Replaced the tap-to-edit number input for Current Day with a `<select>` dropdown. Populated with all days from the discount schedule (labeled "Day N"), pre-selects current day. On change, sets `sale.dayOverride` and re-renders.
- **Edit Sale: Confirm/Done button flow** — Added `_editSaleEditing` flag to track active inline editing. When an input or select is focused, Done button text changes to "Confirm". Tapping Confirm blurs the active input (saves it) but doesn't close the sheet. Second tap (now "Done") closes. Backdrop close also blocked during editing.
- **Edit Sale: Remove discount days** — Each discount row now has a `×` remove button. Days ≤ current day show disabled/grayed `×` with flash error toast ("Can't remove a completed day"). Future days have a red `×` that deletes the day, renumbers remaining days sequentially from 1, and clamps `dayOverride` if needed.
- **CSS additions** — `.edit-sale__remove` / `--disabled` button styles, `.edit-sale__flash-error` absolute-positioned toast with fade-out animation, `.sheet` gets `position: relative` for toast positioning, `.edit-sale__row:last-child` → `:last-of-type` fix.

### Session 41 (2026-03-05)
- **Taller shared header** — `--height-header-context` increased from 24px to 48px. Header restructured as flex row with `justify-content: space-between`. Menu button moved from absolute positioning into the flex flow. Right-padding compensation removed from `header__context`.
- **Reduced action bar + hint strip** — Action bar vertical padding reduced (`--space-lg` → `--space-sm`). Item list hint strip reduced from `--height-touch-min` to 36px.
- **Removed description input from checkout** — The visible description text box in `.input-area` removed. Description entry now handled entirely by the description prompt sheet flow.
- **Removed order name bar, merged into hint strip** — `order-name-bar` and `#order-name-input` removed. The `item-list-hint` strip is now always visible and shows combined order info: "Order #3 — 2 items — tap to edit order name and items". Order number sourced from `Storage.peekNextCustomerNumber()` or `reuseCustomerNumber`. New `Checkout.orderCustomName` property stores custom names.
- **Reworked item sheet header** — Sheet title changed from "All Items (X)" to "Order #X" with tap-to-rename functionality. Tapping title reveals inline text input for custom order name. Secondary subtitle shows "All items (X) · tap title to rename". `renderItemSheet()` updated with editable title and subtitle element.
- **Keyboard avoidance for bottom sheets** — Added `visualViewport` API listener that repositions `.overlay` elements when the iOS keyboard appears, keeping sheets anchored above the keyboard. Shared utility applied to all overlay modals.
- **Fixed Edit Order crash** — Both `qr.js` and `dashboard.js` referenced removed `Checkout.elements.orderNameInput`. Updated to set `Checkout.orderCustomName` instead.
- **Renamed QR screen buttons** — "Edit Order" → "Edit Ticket", "New Order" → "New Ticket".
- **Left-aligned hint strip** — Changed from `text-align: center` to `text-align: left` with `padding: 0 var(--space-md)`.
- **Add Description flow** — "Add Description" button in the no-description prompt now opens a new bottom sheet (`#desc-entry-modal`) with text input for description entry. Confirms and adds item with description.
- **Fixed haggle sheet stacking** — Haggle/adjust price sheet was appearing behind item sheet (same z-index). Fixed by closing item sheet before opening haggle, reopening on haggle close.
- **Standardized item sheet to overlay pattern** — Converted `#item-sheet-backdrop` from `.sheet-backdrop` + `hidden` attribute to `.overlay` + `.visible` class pattern, matching all 16 other modals. Now covered by KeyboardAvoidance automatically.
- **Setup screen redesign** — Start Sale and Join Sale buttons on same row (flex, side-by-side). "How It Works" link removed from bottom, replaced by header bar with ☰ menu containing "How It Works" and "Send Feedback (Coming soon)".
- **Split item row tap targets** — In edit sheet, description area and price area are now separate tap targets. Tapping description opens description edit sheet, tapping price opens existing adjust price sheet.

### Session 32 (2026-03-02)
- **Added Dashboard Filter Pills** — Horizontal row of pill-shaped buttons (All, Pending, Paid, Void) above the transaction list. Each pill shows a live count in parentheses. Single-select with filled background in status color when active (blue/orange/green/gray). Filters the transaction list instantly on tap. Summary stats (customers, revenue, avg ticket) always reflect full sale totals regardless of active filter.
- **Added Dashboard Sort Toggle** — "Newest First" / "Oldest First" text toggle right-aligned next to filter pills. Toggles sort direction with arrow indicator. Applies to the currently filtered list. Defaults to Newest First on every Dashboard open.
- **Filter-Specific Empty State** — When a filter has 0 matching transactions, shows "No [status] tickets" instead of the generic "No transactions yet" message.
- **Filter/Sort Reset on Navigation** — `Dashboard.resetFilters()` called from `App.showScreen()` resets to All filter and Newest First sort each time Dashboard is opened.
- **Service worker** — Bumped to v48

### Session 31 (2026-03-02)
- **Added Void Reason Labels to Dashboard Badges** — Voided transactions now show "Void — Edited Order" instead of just "Void". Added `voidReason` field to transaction data model, set at void time in both `qr.js:reopenTransaction()` and `dashboard.js:reopenTransaction()`. `renderStatusBadge()` displays the reason with em dash separator, falling back to plain "Void" for legacy data without `voidReason`. Code comments document future void reason values (Cancelled, Refunded, Duplicate).
- **Service worker** — Bumped to v47

### Session 30 (2026-03-02)
- **Fixed Mic Guide Flag Poisoning** — `hideMicTooltip()` unconditionally set the `estate_mic_tooltip_seen` localStorage flag every time it was called, even when the tooltip was never shown. This was triggered by `window.blur` during the browser permission dialog and by `doStartListening()` calling it on every mic press. Replaced with `hideMicGuide()` that only sets the flag if the guide was actually visible.
- **Fixed Quick-Tap Detection** — `isQuickTap()` was measuring `Date.now() - recordingStartTime` at the moment the error handler fires, but the Web Speech API's silence timeout (2-5s) meant elapsed time always exceeded the 1500ms threshold. Now tracks `buttonPressTime` (on pointerdown) and `buttonReleaseTime` (on pointerup) to measure actual hold duration.
- **Removed window.blur Handler** — The `window.addEventListener('blur', ...)` handler called `forceStopRecognition()` which silently aborted recognition on mobile (system mic indicators, notifications cause blur). `visibilitychange` + `pagehide` already cover the real use case (page hidden/navigated away).
- **Converted Mic Tooltip to Bottom Sheet** — Replaced the positioned `.mic-tooltip` element with a standard `.overlay` + `.sheet` bottom sheet (`#mic-guide-modal`). Now shown on first mic press after permission grant (blocks recognition until dismissed). Uses existing sheet CSS classes. Removed all `.mic-tooltip` CSS.
- **Service worker** — Bumped to v46

### Session 29 (2026-03-02)
- **Updated Onboarding Card 2 Copy** — "Ring Up Items" card now explains hold-to-speak gesture and gives examples ("twelve dollars", "chair fifteen dollars"). Previously just said "tap 🎤 Speak."
- **Added Post-Permission Mic Tooltip** — After granting mic permission for the first time, a small dark tooltip appears near the Speak button: "Hold this button and say a price — like 'chair twelve dollars'" with "Got it" dismiss link. Auto-dismisses after 6 seconds. Uses `estate_mic_tooltip_seen` localStorage flag — shown only once.
- **Added Quick-Tap Guidance** — Tapping and immediately releasing the Speak button (< 1.5s recording duration) now shows "Hold the button longer" with instructions instead of the generic no-speech error. Only "Got It" button shown (no "Try Again"). Normal hold-and-silence still shows the standard no-speech error.
- **Service worker** — Bumped to v45

### Session 28 (2026-03-02)
- **Fixed Edit Order / Create Ticket Void Loop** — Repeatedly cycling Edit Order → Create Ticket no longer increments customer numbers. Added `Checkout.reuseCustomerNumber` property: `reopenTransaction()` stores the original customer number, `finishCheckout()` reuses it instead of calling `Storage.getNextCustomerNumber()`. Also preserves the `reopenedFrom` chain (carries forward root customer number instead of overwriting each cycle). Reset in `clearAll()` and `endSale()`.
- **Removed Description Prompt 3-Use Limit** — The no-description bottom sheet prompt now shows every time an item is added without a description. Removed `noDescPromptCount` counter, `noDescPromptTimeout`, the `< 3` check, auto-dismiss timeout, and counter increment. `pendingAddWithoutDesc` flag retained for speech bypass.
- **Service worker** — Bumped to v44

### Session 27 (2026-03-02)
- **Added First-Run Onboarding Walkthrough** — Three-card overlay walkthrough shown on first app launch. Cards: "Set Up Your Sale" (📋), "Ring Up Items" (💰), "Mark It Paid" (✅). Centered white card with step indicator dots, fade transitions between cards, Next/Get Started and Skip buttons. Uses `estate_onboarding_seen` localStorage flag.
- **Added "How It Works" Link** — Subtle underlined text link on Setup screen below Start Sale button. Replays the walkthrough overlay on tap regardless of seen state.
- **New Module: onboarding.js** — Standalone module with card sets structured for future flow selection (single-person vs. two-person). `cardSets.single` holds current 3 cards. Module exposes `shouldShow()`, `show(cardSetName)`, `dismiss()`.
- **Service worker** — Bumped to v43, added `/js/onboarding.js` to cache list

### Session 26 (2026-03-02)
- **Fixed Edit Order Disabled State** — Edit Order button on Dashboard now only disabled for "paid" tickets. Pending and unpaid tickets have Edit Order enabled (was incorrectly disabled for pending).
- **Fixed Scan New Customer Z-Index** — Added `position: relative; z-index: 11` to `.scan-actions` so the New Customer button stays visible above the `.scan-error` overlay (z-index 10) when camera permission is denied.
- **Renamed "Collect Payments" → "Scan Ticket"** — Header nav button text updated. Element id `nav-collect` unchanged.
- **Renamed "Collect Payment" → "Generate Ticket"** — Dashboard expanded detail button text updated. `data-action="collect"` unchanged.
- **Renamed "Ready for Payment" → "Create Ticket"** — Checkout action bar done button text updated.
- **Added Day Info to Dashboard Rows** — Transaction rows now show "Customer #1 — Day 1 · 2:19 PM" instead of "Customer #1 — 2:19 PM". Uses `txn.saleDay` with fallback to 1.
- **Service worker** — Bumped to v42

### Session 25 (2026-03-02)
- **Fixed Action Bar Button Height** — Increased `--action-bar-height` from 40px to 56px and set `.action-bar__button` height to `var(--btn-height-lg)` (48px) instead of `height: 100%`. Clear All and Ready for Payment buttons now have proper touch target size.
- **Removed ← Checkout Header Button** — Removed `#nav-checkout` button from shared header entirely. Header now has 3 equal buttons: Dashboard, Collect Payments, End Estate Sale. Deleted all related JS: `checkoutBtn` caching, click handler, `updateCheckoutButton()`, `reopenFromQR()`. Removed `.header__btn--back` CSS.
- **Moved Edit Order to QR Screen** — Added "Edit Order" button alongside "New Customer" in QR actions area (row layout). Reopen logic (void original, load items, navigate to checkout) moved from `App.reopenFromQR()` to `QR.reopenTransaction()`.
- **Added New Customer to Scan and Payment** — Both screens now have a "New Customer" button at the bottom that clears the cart and navigates to checkout. Scan button uses dark background to match scan screen theme. Payment button uses secondary style below Mark Paid.
- **Renamed End Estate Sale** — "Close Sale" → "End Estate Sale" in header button, confirmation sheet title ("End this estate sale?"), body ("This will clear all sale data."), and confirm button.
- **Dashboard Button States** — All 3 action buttons (Mark as Paid/Unpaid, Edit Order, Collect Payment) now always show for non-void transactions. Edit Order is disabled (opacity 0.4, no pointer events) when status is "pending" or "paid". "Mark Paid"/"Mark Unpaid" renamed to "Mark as Paid"/"Mark as Unpaid".
- **Service worker** — Bumped to v40

### Session 24 (2026-03-02)
- **Removed Dev Title Bar** — Deleted the black screen-name bar and all related code (HTML element, CSS class, JS caching and update logic) marked "DEV ONLY — remove before production".
- **Renamed Buttons to Title Case** — Standardized all button labels from ALL CAPS to Title Case: DONE→"Ready for Payment", End Sale→"Close Sale", ADD ITEM→"Add Item", CLEAR ALL→"Clear All", NEW CUSTOMER→"New Customer", MARK PAID→"Mark Paid", CONFIRM/EDIT/CANCEL/TRY AGAIN→Title Case, START SALE→"Start Sale". Reopen→"Edit Order" on QR header and Dashboard detail.
- **Close Sale Confirmation** — Updated "End this sale?" → "Close this sale?" with new body text "This will end the current sale and clear all data." and "Close Sale" confirm button.
- **Sale Starts Today Default** — Added "Sale starts today" checkbox (checked by default) on Setup screen. When checked, date picker is hidden and today's date is used. Unchecking reveals the date picker for custom dates. Checkbox resets on form reset.
- **Service worker** — Bumped to v39

### Session 23 (2026-03-02)
- **Added "Pending" Ticket Status** — Tapping DONE now creates transactions with status "pending" instead of "unpaid". This represents a finalized ticket waiting for the payment worker to confirm payment.
- **Reopen from QR Screen** — Header button on QR screen now says "Reopen" instead of "← Checkout". Tapping it voids the current transaction, creates a new transaction with the same items (linked via `reopenedFrom`), and navigates back to checkout for editing. Same logic as the Dashboard reopen flow.
- **Dashboard Pending Badge** — Pending transactions show an orange "Pending" badge (distinct from green Paid, red Unpaid, gray Void). Pending transactions hide the "Mark Paid" toggle in expanded detail since payment happens through the scan/receive flow. "Reopen" and "Collect Payment" buttons remain visible.
- **Status values** — Now: unpaid, pending, paid, void. The `markPaid()` flow in payment.js already sets status to "paid" regardless of prior status, so pending→paid works correctly.
- **Service worker** — Bumped to v38

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

**Sale Setup & Routing:**
- Create a new sale with name, "Sale starts today" checkbox (or custom start date), discount schedule with Add Day
- App opens to setup if no sale, checkout if sale exists
- Dashboard button shown on setup when sale is active
- "How It Works" link replays the onboarding walkthrough

**First-Run Onboarding:**
- 3-card walkthrough (Set Up Your Sale, Ring Up Items, Mark It Paid) on first launch
- Fade transitions, step dots, Next/Get Started/Skip buttons
- Replays from "How It Works" link regardless of seen state

**Checkout Pad:**
- Number pad entry: tap digits → price appears → tap Add Item → item added with "Added!" flash
- Expandable item list with description, original/discounted prices, remove button
- Running total with "Saved: $X.XX" when discount is active
- Description input below price display
- No-description prompt: bottom sheet every time (no use limit)
- Clear All with confirmation bottom sheet
- Create Ticket button (disabled when cart empty) → generates QR handoff
- Cart persists in localStorage across page refresh
- Auto-applied discounts by sale day

**Speech-to-Text:**
- Hold 🎤 Speak → speak → release → parsed result in confirmation sheet
- Parser handles number words, compounds, X-fifty, hundred patterns, dollar signs
- Confirmation flow: Confirm adds item, Edit populates fields, Cancel dismisses
- Post-permission guide: "How to Use Voice Input" bottom sheet on first mic use
- Quick-tap detection: "Hold the button longer" guidance if released under 1.5s
- Progressive failure tips based on consecutive failure count
- Mic permission flow: custom bottom sheet before browser prompt, denied state handling

**QR Handoff:**
- QR code with full transaction data (sale, day, discount, items, total, timestamp)
- Itemized summary with discounted prices
- Edit Order button: voids current ticket, reloads items with same customer number
- New Customer button: clears cart, returns to checkout
- Reopen-from chain preserved across repeated edit cycles

**QR Scan:**
- Camera viewfinder with native BarcodeDetector (Chrome/Edge) + html5-qrcode fallback (iOS)
- Camera permission denied handling with retry
- New Customer button navigates to checkout

**Payment Receive:**
- Customer info bar with customer number and timestamp
- Itemized list with discounted prices
- Mark Paid: updates transaction status, success animation, returns to scan
- New Customer button navigates to checkout

**Dashboard:**
- Summary stats: customer count, revenue, avg ticket (excludes voided transactions)
- Filter pills: All, Pending, Paid, Void with live counts (single-select)
- Sort toggle: Newest First / Oldest First (resets on each Dashboard open)
- Transaction list with accordion expand/collapse
- Status badges: Pending (orange), Paid (green), Void (gray with reason), Unpaid (red, legacy)
- Void reason labels: "Void — Edited Order" (with graceful fallback for legacy data)
- Expanded detail: discount label, itemized list, action buttons
- Action buttons: Mark as Paid/Unpaid, Edit Order (disabled for paid), Generate Ticket
- Filter-specific empty state: "No [status] tickets"
- New Customer button at bottom

**Shared Header:**
- Context strip: sale name, day number, discount badge
- Button bar: Dashboard, Scan Ticket, End Estate Sale (red)
- Active screen highlighting
- End Estate Sale with confirmation bottom sheet

**Infrastructure:**
- PWA with service worker (cache-first strategy, version v48)
- localStorage persistence for all data (sale, cart, transactions)
- Customer numbering: auto-increments per sale, resets on new sale
- All assets cached for offline use (html5-qrcode CDN included)

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

1. **End-to-end test pass** — Full manual test on mobile Chrome and mobile Safari using current button names and flows
2. **Offline test** — Airplane mode full checkout flow (add items, Create Ticket, scan QR, Mark Paid)
3. **Field test at real estate sale** — Use with Alissa's contact to validate UX with real customers
4. **Gather and triage feedback** — Document friction points, missed features, and bugs from field test
5. **QR data compression** — Raw JSON may hit size limits for large carts (50+ items); evaluate after field test

---

## Files Changed This Session

**Session 27:**
```
/js/onboarding.js   # NEW — Onboarding walkthrough module with card sets, show/dismiss/animate logic
/index.html         # Added onboarding overlay container, "How It Works" link in setup-actions, onboarding.js script tag
/css/styles.css     # Added .onboarding overlay (z-index 300), __card, __dots, __icon, __title, __body, __next, __skip, fade animation, .setup-help-link
/js/app.js          # Added Onboarding.init() to initModules(), shouldShow()/show('single') check after route()
/sw.js              # Bumped to v43, added /js/onboarding.js to cache list
/HANDOFF.md         # Session 27 entry
```

**Session 26:**
```
/js/dashboard.js    # Edit Order disabled only for 'paid' (removed 'pending'), renamed button labels, added day info to rows
/css/styles.css     # Added position: relative; z-index: 11 to .scan-actions
/index.html         # Renamed Collect Payments → Scan Ticket, Ready for Payment → Create Ticket
/sw.js              # Bumped to v42
/HANDOFF.md         # Session 26 entry
```

**Session 25:**
```
/css/styles.css     # --action-bar-height 40→56px, .action-bar__button height to var(--btn-height-lg), removed .header__btn--back, added .scan-actions/.scan-action--new/.payment-action--new, .dashboard-detail__btn--reopen:disabled
/index.html         # Removed #nav-checkout, added Edit Order + New Customer to QR actions, added New Customer to scan/payment, renamed Close Sale → End Estate Sale
/js/app.js          # Removed checkoutBtn caching/click handler/updateCheckoutButton()/reopenFromQR()
/js/qr.js           # Added editButton caching, reopenTransaction() method (moved from App)
/js/scan.js         # Added newCustomerButton caching and click handler
/js/payment.js      # Added newCustomerButton caching and click handler
/js/dashboard.js    # All 3 buttons for non-void, Edit Order disabled for pending/paid, renamed Mark as Paid/Unpaid
/sw.js              # Bumped to v40
/HANDOFF.md         # Session 25 entry
```

**Session 24:**
```
/index.html         # Removed dev title bar, renamed all button labels to Title Case, updated Close Sale sheet, added today checkbox
/css/styles.css     # Removed .dev-title-bar, added .setup-field__checkbox styles
/js/app.js          # Removed devTitleBar caching and screen name mapping, "Edit Order" on QR screen
/js/dashboard.js    # "Edit Order" in expanded detail (was "Reopen")
/js/sale-setup.js   # Cached todayCheckbox/datePicker, checkbox toggle logic, resetForm resets checkbox
/sw.js              # Bumped to v39
/HANDOFF.md         # Session 24 entry
```

**Session 23:**
```
/js/checkout.js     # finishCheckout() status 'unpaid' → 'pending'
/js/app.js          # Checkout button shows "Reopen" on QR screen, reopenFromQR() method
/js/dashboard.js    # Pending badge in renderStatusBadge(), hide Mark Paid toggle for pending
/css/styles.css     # .dashboard-txn__status--pending orange badge style
/sw.js              # Bumped to v38
/HANDOFF.md         # Session 23 entry
```

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

1. **QR data size limits:** Currently raw JSON. May need compression or chunking for large carts (50+ items). Needs field test data to validate.
2. **Sale persistence:** Current behavior clears all transactions when sale ends. Confirm this is desired after field testing.
3. **One-person flow shortcut:** Onboarding has card set architecture ready for flow selection. Should a one-person flow (skip QR, mark paid directly from checkout) be built before field test or after?

---

## How to Test

### Sale Setup Flow
1. Clear localStorage: DevTools > Application > Local Storage > Clear
2. Refresh page → onboarding walkthrough should appear (3 cards)
3. Dismiss onboarding → Sale Setup screen
4. Enter sale name (e.g., "Test Estate")
5. "Sale starts today" checkbox should be checked by default
6. Uncheck → date picker appears, set start date to yesterday → should show "Day 2" with 25% discount
7. Tap Start Sale → checkout pad should show correct day and discount
8. Tap "How It Works" link → onboarding replays

### Checkout Flow
1. Type price on number pad → price display updates
2. Tap Add Item → if no description, "No description — add anyway?" sheet appears
3. Tap "Add Without Description" → item appears in list with "Added!" flash
4. If discount active, running total bar shows "Saved: $X.XX"
5. Add several items → verify running total updates
6. Tap × on an item → verify it's removed
7. Tap Create Ticket → QR screen should appear with QR code and item summary
8. Tap New Customer → clears cart, returns to checkout

### QR Handoff / Edit Order Flow
1. Add 3 items → tap Create Ticket → QR shows
2. Tap Edit Order → returns to checkout with same items reloaded
3. Create Ticket again → Dashboard should show 1 pending + 1 void (same customer number)
4. Voided ticket badge should read "Void — Edited Order"

### QR Scan/Payment Flow (Two-Person Workflow)
1. **Checkout Worker:** Add 3 items → tap Create Ticket → QR code shows
2. **Payment Worker:** Tap Scan Ticket in header → camera opens
3. Point camera at QR code → Payment screen shows
4. Verify: Customer # and timestamp at top
5. Verify: All 3 items listed with correct prices
6. Verify: Total matches checkout total
7. Tap Mark Paid → green checkmark flashes → returns to scan view

### Customer Number Test
1. Checkout 3 customers in sequence
2. Verify QR codes show Customer #1, #2, #3
3. End Estate Sale → start new sale
4. Checkout 1 customer → should show Customer #1 (reset)

### Camera Permission Test
1. Tap Scan Ticket in header
2. Deny camera permission when prompted
3. Should see error message with "Retry" button
4. Tap Retry → grant permission → camera should start

### Speech-to-Text Test
1. **First use:** Tap 🎤 Speak → permission modal appears → Allow Microphone → guide sheet "How to Use Voice Input" shows → tap Got It
2. **Happy path:** Hold 🎤 Speak → say "blue vase fifteen dollars" → release → confirmation shows "Add 'blue vase' — $15.00?" → tap Confirm → item added
3. **Price only:** Hold mic → say "twenty five" → confirmation shows "Add item — $25.00?" → Confirm
4. **Compound price:** Hold mic → say "seven fifty" → confirmation shows "$7.50" → Confirm
5. **Large number:** Hold mic → say "two hundred" → confirmation shows "$200.00" → Confirm
6. **Edit flow:** Hold mic → say something → Edit → fields populated → adjust → Add Item
7. **Cancel flow:** Hold mic → say something → Cancel → nothing happens
8. **Quick tap:** Tap and immediately release 🎤 Speak → "Hold the button longer" guidance appears
9. **Parse failure:** Hold mic → say gibberish → shows "Couldn't understand" with transcript → Try Again or Cancel
10. **Console test:** Open DevTools → `Speech.parse("blue vase fifteen dollars")` → returns `{price: 15, description: "blue vase"}`

### Dashboard Test
1. **Empty state:** Clear localStorage → start sale → tap Dashboard → shows zeros and "No transactions yet"
2. **With data:** Complete 3 checkouts → tap Dashboard → shows 3 customers, correct revenue, correct average
3. **Filter pills:** All (3), Pending (3), Paid (0), Void (0) → tap Pending → only pending shown
4. **Mark paid:** Expand a transaction → Mark as Paid → counts update: Pending (2), Paid (1)
5. **Sort toggle:** Tap "Newest First ↓" → list reverses → shows "Oldest First ↑"
6. **Void reason:** Edit Order on a ticket → Dashboard shows "Void — Edited Order" on voided ticket
7. **Filter empty state:** Tap Void filter with 0 voids → "No void tickets" message
8. **Transaction detail:** Tap a row → expands with items → tap again → collapses
9. **Accordion:** Expand #1 → tap #2 → #1 collapses, #2 expands

### Local Server
```bash
cd estate-checkout
python3 -m http.server 8000 --bind 0.0.0.0
```
- Computer: http://localhost:8000
- Phone (same WiFi): http://192.168.86.33:8000

### Cloudflare Pages
- Production: https://estate-checkout.pages.dev (or configured domain)

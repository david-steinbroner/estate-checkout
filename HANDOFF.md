# HANDOFF — Estate Sale Checkout MVP

**Last updated:** 2026-03-01
**Last session by:** Claude Code
**Current version:** v0.1

---

## What Was Accomplished

### Session 2 (2026-03-01)
- **Fixed day calculation bug**: Was off by one due to timezone parsing. Start date now parsed as local time.
- **Added savings display**: Running total bar shows "Saved: $X.XX" when discount is active.
- **Built QR Handoff screen**:
  - Tap DONE → saves transaction → shows QR code
  - QR contains full transaction data (sale name, items, prices, total, timestamp)
  - Displays itemized summary with original/discounted prices
  - Total shown in bold at bottom
  - NEW CUSTOMER button clears cart and returns to checkout
  - BACK button returns to checkout without clearing
  - Single viewport layout (QR top half, scrollable summary, fixed buttons)
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

### What Works
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
- **QR Handoff**: Tap DONE → shows QR code with transaction data + item summary

### What's Broken
- Nothing is broken

### What's Half-Done
- **Speech-to-text**: Structure exists, needs full parsing logic
- **QR scan**: Screen placeholder exists, no camera integration yet
- **Dashboard**: Not started

---

## Files Changed This Session

**Modified:**
```
/js/
  utils.js        # Fixed day calculation timezone bug
  checkout.js     # Added savings display, QR navigation
  qr.js           # Full QR handoff implementation
  app.js          # Cleaned up debug logs, added QR screen routing
  sale-setup.js   # Cleaned up debug logs
/css/
  styles.css      # Added savings display styles, QR screen styles
/index.html       # Added savings span, QR screen HTML
/sw.js            # Bumped to v12
/BACKLOG.md       # Added v0.2 items
```

---

## Next Steps (Priority Order)

1. **Complete speech-to-text** — Parse "blue vase fifteen dollars" into description + price
2. **Build QR scan view** — Camera access, decode QR, display total
3. **Build sale dashboard** — Transaction count, revenue, average ticket
4. **Test offline mode** — Verify service worker caching works
5. **End-to-end testing** — Run all test scenarios from CLAUDE_CODE_RULES.md

---

## Open Questions

1. **QR data format:** Currently raw JSON. May need compression for large carts (50+ items).
2. **Sale persistence:** Current behavior clears transactions when sale ends. Confirm this is desired.
3. **Service worker caching:** Must bump cache version in sw.js when deploying JS changes.

---

## Known Bugs
None currently.

### Fixed Bugs
- **Day calculation off by one** — Timezone parsing issue. Fixed by parsing start date as local time.
- **End Sale button not working** — Service worker was caching old JS. Fixed by bumping cache version.
- **Screen switching broken** — The `.checkout-pad` CSS class had `display: flex` which overrode `.screen { display: none }`. Fixed by removing the display property from `.checkout-pad`.
- **Checkout.endSale() firing twice** — Added guard flag and stopPropagation to prevent double execution on mobile.

---

## How to Test

### Sale Setup Flow
1. Clear localStorage: DevTools > Application > Local Storage > Clear
2. Refresh page → should see Sale Setup screen
3. Enter sale name (e.g., "Test Estate")
4. Set start date to today → should show "Day 1" with 0% discount
5. Set start date to yesterday → should show "Day 2" with 25% discount
6. Tap START SALE
7. Checkout pad should show correct day and discount

### Checkout Flow
1. Type price on number pad
2. Tap ADD → item appears in list with "Added!" flash
3. If discount active, running total bar shows "Saved: $X.XX"
4. Add several items → verify running total updates
5. Tap × on an item → verify it's removed
6. Tap DONE → QR screen appears with QR code and item summary
7. Tap NEW CUSTOMER → clears cart, returns to checkout
8. Tap BACK → returns to checkout with cart intact

### Local Server
```bash
cd estate-checkout
python3 -m http.server 8000 --bind 0.0.0.0
```
- Computer: http://localhost:8000
- Phone (same WiFi): http://192.168.86.33:8000

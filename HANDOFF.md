# HANDOFF — Estate Sale Checkout MVP

**Last updated:** 2026-02-27
**Last session by:** Claude Code
**Current version:** v0.1

---

## What Was Accomplished

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
- **Remove items**: Tap × to remove individual items
- **Clear all**: Shows confirmation modal, clears cart on confirm
- **Discount display**: Header shows sale day and discount percentage
- **Discount calculation**: Based on start date vs. today, applies correct day's discount
- **Cart persistence**: Items survive page refresh (localStorage)
- **End Sale**: Button in header ends sale and returns to setup (dev convenience)

### What's Broken
- Nothing is broken, but several features are stubs

### What's Half-Done
- **Speech-to-text**: Structure exists, needs full parsing logic
- **QR generation**: Stub exists, needs to render actual QR codes
- **QR scan**: Screen placeholder exists, no camera integration yet
- **Dashboard**: Not started
- **DONE button**: Saves transaction but doesn't navigate to QR screen yet

---

## Files Changed This Session

**Created:**
```
/estate-checkout/
  index.html              # Entry point with setup + checkout screens
  manifest.json           # PWA manifest (SVG icons)
  sw.js                   # Service worker (cache-first strategy)
  /css/
    styles.css            # Mobile-first CSS, single-viewport layout
  /js/
    app.js                # App init, routing, service worker
    checkout.js           # Checkout pad logic (number pad, items, totals)
    sale-setup.js         # Sale setup form and discount configuration
    speech.js             # Speech-to-text module (stub)
    qr.js                 # QR generation module (stub)
    storage.js            # localStorage abstraction
    utils.js              # Currency formatting, discount helpers
  /assets/
    icons/
      icon-192.svg        # Placeholder PWA icon
      icon-512.svg        # Placeholder PWA icon
  /lib/
    qrcode.min.js         # QR code library
```

---

## Next Steps (Priority Order)

1. **Complete speech-to-text** — Parse "blue vase fifteen dollars" into description + price
2. **Build QR handoff screen** — Generate QR with transaction data, display item summary
3. **Build QR scan view** — Camera access, decode QR, display total
4. **Build sale dashboard** — Transaction count, revenue, average ticket
5. **Test offline mode** — Verify service worker caching works
6. **End-to-end testing** — Run all test scenarios from CLAUDE_CODE_RULES.md

---

## Open Questions

1. **QR data format:** Current plan is raw JSON. May need compression for large carts.
2. **Sale persistence:** Current behavior clears transactions when sale ends. Confirm this is desired.
3. **Service worker caching:** Must bump cache version in sw.js when deploying JS changes, otherwise old code is served from cache.

---

## Known Bugs
- **Setup screen elements not visible** — Investigating. Labels show but discount rows, Add Day button, and START SALE button don't appear. Added debugging to console output.

### Fixed Bugs
- **End Sale button not working** — Service worker was caching old JS. Fixed by bumping cache version to v2.
- **Screen switching broken** — The `.checkout-pad` CSS class had `display: flex` which overrode `.screen { display: none }`, causing checkout to remain visible when switching to setup. Fixed by removing the display property from `.checkout-pad` (flex layout now comes from `.screen.active`).
- **Checkout.endSale() firing twice** — Added guard flag and stopPropagation to prevent double execution on mobile.

---

## How to Test

### Sale Setup Flow
1. Clear localStorage: DevTools > Application > Local Storage > Clear
2. Refresh page → should see Sale Setup screen
3. Enter sale name (e.g., "Test Estate")
4. Set start date to yesterday
5. Set Day 2 discount to 30%
6. Tap START SALE
7. Checkout pad should show: "Test Estate | Day 2 | 30% off"
8. Add item for $10 → should show $7.00 (30% off)

### Checkout Flow
1. Type price on number pad
2. Tap ADD → item appears in list with "Added!" flash
3. Add several items → verify running total updates
4. Tap × on an item → verify it's removed
5. Close browser, reopen → should go straight to checkout with sale intact

### Local Server
```bash
cd estate-checkout
python3 -m http.server 8000 --bind 0.0.0.0
```
- Computer: http://localhost:8000
- Phone (same WiFi): http://192.168.86.33:8000

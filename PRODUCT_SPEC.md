# PRODUCT SPEC — Estate Sale Checkout v0.1

---

## Problem Statement

Estate sale checkout is painfully slow. A worker manually enters each item's price on a printing calculator, writes a ticket, hands it to the customer, who waits in another line where a second worker enters the total into a POS. This process takes 5-10 minutes per customer and creates hour-long lines. Items are miskeyed, discounts are miscalculated, employees are overwhelmed, and customers leave.

## Solution

A mobile-first Progressive Web App that replaces the printing calculator. It lets the checkout worker enter items fast (via number pad or voice), auto-applies day-based discounts, generates an itemized list, and produces a QR code for handoff to the payment worker or customer.

## Target User

**Primary:** Estate sale checkout worker (age 40-70, not tech-savvy, working in a noisy/crowded house, probably standing, using a phone or tablet)

**Secondary:** Estate sale operator/owner (sets up the sale, reviews results after)

## Core User Flow

```
OPERATOR SETUP (once per sale)
  → Name the sale
  → Set sale dates
  → Set discount rules (Day 1: 0%, Day 2: 25% off, Day 3: 50% off, etc.)
  → Save → ready for checkout

CHECKOUT WORKER FLOW (repeated per customer)
  → Open checkout pad
  → Enter item price via number pad (tap price → tap ADD)
  → OR hold mic button → speak "blue vase twelve dollars" → auto-fills description + price
  → Repeat for each item
  → See running item list with discounted prices
  → Tap DONE → QR code appears
  → Customer or payment worker scans QR
  → Tap NEW CUSTOMER → pad resets

PAYMENT WORKER FLOW
  → Scan QR code from checkout worker's screen
  → See itemized list + total
  → Enter total into their POS (Square/Clover) manually
  → Done

OPERATOR REVIEW (end of day)
  → Open dashboard
  → See: total transactions, total revenue, average ticket size
  → Data stored locally on device
```

---

## Screen Specifications

### Screen 1: Home / Sale Setup

**Purpose:** Configure a sale before it starts.

**Elements:**
- Sale name (text input, e.g., "Johnson Estate - Oak Hill")
- Sale dates (start date, end date — simple date pickers)
- Discount schedule:
  - Day 1 discount: __% (default 0)
  - Day 2 discount: __% (default 25)
  - Day 3 discount: __% (default 50)
  - Optional Day 4+: __% (for longer sales)
- "Start Sale" button → navigates to checkout pad
- If a sale is already active, show: sale name, current day number, current discount, and buttons for "Go to Checkout" and "View Dashboard"

**Behavior:**
- Sale config saves to localStorage
- Only one active sale at a time
- App auto-detects which day of the sale it is based on current date vs. start date

---

### Screen 2: Checkout Pad ⭐ (Most Critical Screen)

**Purpose:** Enter items and prices as fast as possible.

**Layout (top to bottom):**
1. **Header bar:** Sale name, Day X, current discount (e.g., "Day 2 — 25% off")
2. **Item list area** (scrollable, grows upward):
   - Each row: item description (if given) | original price | discounted price
   - Swipe or tap X to remove an item
   - Running total at the bottom of the list (always visible)
3. **Input area:**
   - Optional description field (can be skipped — just enter price)
   - Price display (large, shows what's being typed)
   - Mic button (hold to speak)
4. **Number pad:**
   - Digits 0-9, decimal point, backspace
   - Large buttons (minimum 64px square, ideally bigger)
   - "ADD" button (prominent, green, separate from number pad)
5. **Action bar:**
   - "DONE" button → generates QR
   - "CLEAR ALL" button → requires confirmation tap

**Behavior:**
- Price entry is the DEFAULT state. App opens with cursor in price field.
- Typing a price and tapping ADD creates an item with no description — this is fine and expected.
- Description is optional — if they want to add one, they tap the description field first.
- Speech-to-text: hold mic button, speak naturally, release. App parses utterance:
  - Extracts dollar amount → fills price field
  - Everything else → fills description field
  - Example: "brass table lamp fifteen dollars" → Description: "brass table lamp" | Price: $15.00
  - Example: "twenty-five fifty" → Description: (empty) | Price: $25.50
- Discount is auto-applied based on sale day. Show both original and discounted price per item.
- Running total shows the discounted total.
- Items persist in localStorage until "DONE" or "CLEAR ALL" — safe against accidental refresh.

**Speed target:** A competent user should be able to add a price-only item in under 3 seconds (tap price digits + tap ADD).

---

### Screen 3: QR Handoff

**Purpose:** Transfer the itemized list to the payment worker or customer.

**Elements:**
- Large QR code (centered, as big as possible)
- Itemized list summary below (scrollable):
  - Each item: description (if any) | discounted price
  - Total at bottom (bold, large)
- "NEW CUSTOMER" button → clears cart, returns to checkout pad
- "BACK" button → returns to checkout pad without clearing (in case they need to add/remove items)

**QR Data Format:**
```json
{
  "sale": "Johnson Estate",
  "day": 2,
  "discount": 25,
  "items": [
    {"desc": "brass lamp", "orig": 15.00, "final": 11.25},
    {"desc": "", "orig": 8.00, "final": 6.00}
  ],
  "total": 17.25,
  "ts": "2025-01-15T14:32:00"
}
```
- Encode as JSON, compress if needed for QR size limits
- If item count is very large (30+ items), may need to simplify (drop descriptions) to fit QR capacity

---

### Screen 4: QR Scan / Receive View

**Purpose:** Payment worker scans QR to see what the customer owes.

**Elements:**
- Camera viewfinder for QR scanning
- Once scanned, shows:
  - Itemized list (same format as QR Handoff screen)
  - Total (large, prominent — this is what they enter into the POS)
- "SCAN ANOTHER" button

**Behavior:**
- Uses device camera via browser API
- Decodes QR JSON and renders the item list
- No data is saved on the receiving device (stateless)

---

### Screen 5: Sale Dashboard

**Purpose:** Let the operator see how the sale is going.

**Elements:**
- Sale name and date range
- Total transactions today
- Total revenue today
- Average transaction size
- Simple list of completed transactions (tap to expand and see items)

**Behavior:**
- Data comes from localStorage (saved when each QR is generated / "DONE" is tapped)
- No charts or graphs needed — just numbers
- "End Sale" button → archives the sale data, returns to setup screen

---

## Technical Constraints

- **Offline-first:** Core checkout flow (add items, generate QR) must work with no internet
- **No backend:** All data in localStorage
- **PWA:** Installable on home screen, works like a native app
- **Browser targets:** Mobile Chrome (Android), Mobile Safari (iOS)
- **Performance:** Checkout pad must render and respond to taps in under 100ms
- **QR size limit:** Standard QR codes max out around 4,296 alphanumeric characters. For a typical transaction of 20 items, the JSON should be well under this. For edge cases (50+ items), truncate descriptions.

---

## What Success Looks Like for v0.1

1. Alissa's estate sale contact can set up a sale and start checking people out within 2 minutes of first seeing the app
2. The checkout pad is AS FAST OR FASTER than the printing calculator for price-only entry
3. Day 2/3 discounts are applied automatically with zero mental math
4. The QR handoff eliminates the paper ticket entirely
5. The operator sees basic revenue data they've never had before
6. It works when the house has bad cell signal

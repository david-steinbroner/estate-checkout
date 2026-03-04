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
  → Optionally set a future start date (defaults to today)
  → Set discount rules (Day 1: 0%, Day 2: 25% off, Day 3: 50% off, etc.)
  → Tap Start Sale → ready for checkout

FIRST-RUN ONBOARDING (once per device)
  → 3-card walkthrough: Set Up Your Sale → Ring Up Items → Mark It Paid
  → Can be replayed from "How It Works" link on Setup screen

CHECKOUT WORKER FLOW (repeated per order)
  → Open checkout pad (shared header shows sale name, day, discount)
  → Optionally name the order (e.g., "Sarah") or leave as auto-numbered "Order #1"
  → Enter item price via number pad → tap Add Item
  → OR hold 🎤 Speak → say "blue vase twelve dollars" → confirm/edit/cancel
  → If no description entered, a prompt asks to add one or continue
  → Repeat for each item
  → See running item list with discounted prices and savings
  → Tap Create Ticket → QR code appears with transaction summary
  → Customer can scan QR with their phone camera → opens ticket page with receipt + QR
  → OR payment worker scans QR from checkout device or customer's phone
  → Tap New Order → pad resets for next order
  → OR tap Edit Order → voids current ticket, reloads items for editing

PAYMENT WORKER FLOW
  → Tap Scan Ticket in header → camera opens
  → Scan QR code from checkout worker's screen or from customer's phone
  → See itemized list + total due (shows order name if set)
  → Enter total into POS (Square/Clover) manually
  → Tap Mark Paid → transaction saved
  → Tap New Order → return to scan for next order

OPERATOR REVIEW (during or end of day)
  → Tap Dashboard in header
  → See: total orders, total revenue, average ticket size
  → Filter by status: All / Pending / Paid / Void
  → Sort: Newest First or Oldest First
  → Tap any transaction to expand details
  → From expanded view: Mark as Paid/Unpaid, Edit Order, Generate Ticket

END OF DAY
  → Tap "End Estate Sale" in header → bottom sheet: End Day or End Sale?
  → "End Day X" (primary) → sale paused, shows day summary stats + next-day preview
  → "End Sale" (danger) → sale ended permanently, navigate to setup
  → Sale data persists in localStorage — nothing is deleted

RESUME NEXT DAY
  → Open app → sale is paused → paused screen shows stats + next-day discount
  → Tap "Resume Sale" → sale status back to active → checkout screen
  → Day-based discount advances automatically (calculated from start date)
  → If >7 days since sale start, gentle nudge to resume or end

SALE STATES
  → active: Normal checkout flow. Created by Start Sale or Resume Sale.
  → paused: End of day. Checkout locked, dashboard accessible. Created by End Day.
  → ended: Sale permanently finished. Navigate to setup for new sale. Created by End Sale.
  → Backward compat: sales without a status field are treated as active.
```

---

## Screen Specifications

### Screen 1: Sale Setup

**Purpose:** Configure a sale before it starts.

**Elements:**
- Sale name input (text, e.g., "Johnson Estate - Oak Hill")
- "Sale starts today" checkbox (checked by default)
  - Unchecking reveals a date picker for a future start date
- Discount schedule:
  - Day 1 discount: __% (default 0)
  - Day 2 discount: __% (default 25)
  - Day 3 discount: __% (default 50)
  - "+ Add Day" button for longer sales (Day 4+)
- "Start Sale" button (green, prominent)
- "Dashboard" button (shown only when a sale is already active, navigates to dashboard)
- "How It Works" link (replays the onboarding walkthrough)

**Behavior:**
- Sale config saves to localStorage
- Only one active sale at a time
- App auto-detects which day of the sale it is based on current date vs. start date
- If a sale is already active, routing sends the user to the checkout pad on app load

---

### First-Run Onboarding Walkthrough

**Purpose:** Teach new users how the app works in 30 seconds.

**Elements:**
- Full-screen overlay with centered white card
- 3 cards shown in sequence:
  1. **Set Up Your Sale** — Name sale, set dates and discount schedule
  2. **Ring Up Items** — Number pad or hold 🎤 Speak to add items by voice
  3. **Mark It Paid** — Customer scans QR, payment worker marks paid
- Step indicator dots below each card
- "Next" / "Get Started" button to advance
- "Skip" link to dismiss immediately

**Behavior:**
- Shows automatically on first app load (uses `estate_onboarding_seen` localStorage flag)
- Can be replayed anytime from the "How It Works" link on the Setup screen
- Fade transitions between cards

---

### Screen 2: Checkout Pad (Most Critical Screen)

**Purpose:** Enter items and prices as fast as possible.

**Layout (top to bottom):**
1. **Shared header** (visible during active sale):
   - Context strip: sale name, day number, current discount
   - Button bar: Dashboard, Scan Ticket, End Estate Sale
2. **Running total bar:** Shows "Total: $X.XX" and "Saved: $X.XX" when discount is active
3. **Order name input:** Optional — placeholder shows "Order #N (tap to name)", user can type a custom name (e.g., "Sarah"). 28px height (intentional exception — supplementary, not primary input).
4. **Item list** (scrollable, expandable):
   - Each row: description (if given), original price (struck through if discounted), final price, remove button (×)
   - Tappable to expand when items overflow the visible area
   - Close strip and backdrop overlay when expanded
   - "No items yet" empty state
4. **Input area:**
   - Price display (large, shows what's being typed)
   - 🎤 Speak button (hold to talk, next to price display)
   - Description field (optional, below price display)
   - Listening status indicator (pulsing dot when recording)
5. **Number pad:**
   - Digits 0-9, decimal point, backspace (⌫)
   - "Add Item" button (green, prominent, spans full width below pad)
6. **Action bar:**
   - "Clear All" button (left, requires confirmation bottom sheet)
   - "Create Ticket" button (right, disabled when cart is empty)

**Behavior:**
- Price entry is the DEFAULT state. Typing digits builds the price display.
- Tapping "Add Item" creates an item. If no description, a bottom sheet prompts: "No description — add anyway?" with "Add Without Description" and "Add Description" buttons. This prompt shows every time (no limit).
- Speech input: hold 🎤 button, speak naturally, release. App parses the utterance to extract price and description. Shows a confirmation sheet with Confirm / Edit / Cancel.
- On first mic press after granting permission, a "How to Use Voice Input" guide sheet is shown (one-time).
- Quick-tap detection: if user taps and releases the mic button in under 1.5 seconds, shows "Hold the button longer" guidance instead of a generic error.
- Discount is auto-applied based on sale day. Both original and discounted prices shown per item.
- Items persist in localStorage until "Create Ticket" or "Clear All".

**Speed target:** A competent user should be able to add a price-only item in under 3 seconds.

---

### Screen 3: QR Handoff

**Purpose:** Transfer the itemized list to the payment worker or customer.

**Elements:**
- Large QR code (centered) — encodes a URL to ticket.html
- Helper text showing order name and "customer can scan with their phone camera"
- Itemized list summary below:
  - Each item: description (or "Item"), original price (struck through if discounted), final price
  - Total at bottom
- "Edit Order" button — voids current ticket, reloads items into checkout for editing (preserves order name)
- "New Order" button — clears cart, returns to checkout pad

**Customer Ticket Page (ticket.html):**
- Standalone page, no app CSS/JS imports (inline styles only)
- Customer scans QR with phone camera → opens receipt page
- Shows: order name, sale info, itemized list with prices, total, timestamp
- Renders a self-referential QR code (payment worker can scan from customer's phone)
- Error state for missing/malformed data

**QR Data Format:**

The QR code encodes a URL: `https://[origin]/ticket.html?d=[base64-encoded-json]`

When decoded, the JSON payload:
```json
{
  "sale": "Johnson Estate",
  "day": 2,
  "discount": 25,
  "customerNumber": 1,
  "orderName": "Sarah",
  "items": [
    {"desc": "brass lamp", "orig": 15.00, "final": 11.25},
    {"desc": "", "orig": 8.00, "final": 6.00}
  ],
  "total": 17.25,
  "ts": "2025-01-15T14:32:00"
}
```

**Behavior:**
- Edit Order voids the current transaction (status: 'void', voidReason: 'Edited Order') and creates a new checkout with the same items and customer number
- The reopened-from chain is preserved so repeated edit cycles don't spawn new customer numbers

---

### Screen 4: QR Scan

**Purpose:** Payment worker scans QR to see what the customer owes.

**Elements:**
- Full-screen camera viewfinder with scan target overlay
- Status text: "Point camera at QR code"
- Camera permission error state with retry button
- "New Order" button (navigates to checkout to create a new order)

**Behavior:**
- Uses native BarcodeDetector API where available (Chrome/Edge)
- Falls back to html5-qrcode library for iOS Safari
- Dual-format detection: URL format (new, `ticket.html?d=...`) and legacy raw JSON
- Camera permission denied shows error with "Retry" button and help text
- On successful scan, navigates to Payment screen with decoded transaction data

---

### Screen 5: Payment Receive

**Purpose:** Show the payment worker what the customer owes.

**Elements:**
- Order info bar: "OrderName — HH:MM AM/PM" (shows custom name or "Order #X" fallback)
- Itemized list with descriptions and prices (discounted items show original struck through)
- Total due (large, prominent)
- "Mark Paid" button (green)
- "New Customer" button (navigates to checkout)
- Success overlay: green checkmark with "Paid!" text (auto-dismisses)

**Behavior:**
- Mark Paid updates the transaction status to 'paid' with timestamp, shows success animation, then navigates back to scan
- Transaction data is saved to localStorage on the receiving device

---

### Screen 6: Dashboard

**Purpose:** Let the operator see how the sale is going.

**Elements:**
- Summary stats (always show full sale totals, unaffected by filters):
  - Customer count (excludes voided transactions)
  - Total revenue (excludes voided transactions)
  - Average ticket size
- Filter pills row: All (X), Pending (X), Paid (X), Void (X)
  - Live counts in parentheses
  - Single-select, active pill fills with status color (blue/orange/green/gray)
- Sort toggle: "Newest First ↓" / "Oldest First ↑" (text link, right-aligned)
- Transaction list:
  - Each row: "OrderName — Day Y · HH:MM AM/PM" (or "Order #X" fallback), status badge, total
  - Item count in secondary text
  - Tap to expand/collapse (accordion — only one expanded at a time)
- Expanded detail:
  - Discount label (e.g., "Day 2 — 25% off")
  - Itemized list with prices
  - Action buttons (hidden for voided transactions):
    - "Mark as Paid" / "Mark as Unpaid" toggle
    - "Edit Order" (disabled for paid tickets, voids and reloads to checkout)
    - "Generate Ticket" (navigates to QR screen for this transaction)
- Status badges:
  - Pending (orange) — ticket created, not yet paid
  - Paid (green) — marked as paid
  - Void (gray) — voided, shows reason if available (e.g., "Void — Edited Order")
  - Unpaid (red) — legacy status, no dedicated filter pill
- Empty states:
  - No transactions at all: "No transactions yet. Complete a checkout to see data here."
  - Filter with 0 matches: "No [status] tickets"
- "New Customer" button at bottom

**Behavior:**
- Filter and sort reset to All + Newest First each time Dashboard is opened
- Stats always show full sale totals regardless of filter
- "End Estate Sale" in the header opens an End Day / End Sale bottom sheet. End Day pauses the sale; End Sale ends it permanently (transaction data preserved)

---

### Shared Header

**Purpose:** Navigate between screens during an active sale.

**Elements:**
- Context strip: sale name, day number, current discount badge
- Button bar: Dashboard, Scan Ticket, End Estate Sale (red)

**Behavior:**
- Hidden during sale setup, visible during active sale
- Active screen button is highlighted
- "End Estate Sale" shows a confirmation bottom sheet before clearing data

---

### Speech-to-Text System

**Purpose:** Let workers add items by voice for hands-free operation.

**Components:**
- Hold-to-talk: press and hold 🎤 Speak button, speak, release
- Natural language parser:
  - Number words (one through ninety, hundred)
  - Compound numbers ("twenty five" → 25)
  - X-fifty cents pattern ("seven fifty" → $7.50)
  - Hundred pattern ("two hundred" → $200)
  - Dollar sign detection ("$25", "$5.50")
  - Description extraction ("blue vase fifteen dollars" → desc: "blue vase", price: $15)
  - Filler word stripping (dollars, bucks, and, cents)
- Confirmation flow: Confirm (adds item), Edit (populates fields), Cancel
- Post-permission guide: "How to Use Voice Input" bottom sheet on first mic use after granting permission
- Quick-tap guidance: "Hold the button longer" if released in under 1.5 seconds
- Progressive failure tips: contextual tips escalate after repeated failures
- Mic permission flow: custom "Voice Input" sheet before browser prompt, denied state handling

---

### Transaction Statuses

| Status | Meaning | Set When |
|--------|---------|----------|
| `pending` | Ticket created, awaiting payment | `finishCheckout()` (Create Ticket) |
| `paid` | Payment confirmed | Mark Paid button (payment or dashboard) |
| `unpaid` | Legacy status from early builds | Not actively set; shown under "All" filter |
| `void` | Cancelled/replaced | Edit Order (from QR or dashboard) |

Voided transactions include a `voidReason` string:
- `'Edited Order'` — voided because the order was reopened for editing
- Future values: `'Cancelled'`, `'Refunded'`, `'Duplicate'`

---

## Technical Constraints

- **Offline-first:** Core checkout flow (add items, generate QR) must work with no internet
- **No backend:** All data in localStorage
- **PWA:** Installable on home screen, works like a native app
- **Browser targets:** Mobile Chrome (Android), Mobile Safari (iOS)
- **Performance:** Checkout pad must render and respond to taps in under 100ms
- **QR size limit:** QR codes now encode a URL with base64-encoded JSON. Standard QR codes max out around 4,296 alphanumeric characters. For a typical transaction of 20 items, the encoded URL should be well under this. For edge cases (50+ items), truncate descriptions.

---

## What Success Looks Like for v0.1

1. Alissa's estate sale contact can set up a sale and start checking people out within 2 minutes of first seeing the app
2. The checkout pad is AS FAST OR FASTER than the printing calculator for price-only entry
3. Day 2/3 discounts are applied automatically with zero mental math
4. The QR handoff eliminates the paper ticket entirely
5. The operator sees basic revenue data they've never had before
6. It works when the house has bad cell signal

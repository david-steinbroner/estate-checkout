# VERSION LOG — Estate Sale Checkout

Track every version iteration. Each version gets an entry when work begins and when it ships.

---

## v0.1 — Checkout Pad MVP
**Status:** IN PROGRESS — ~95% complete, pending end-to-end test pass and field test
**Goal:** Replace the printing calculator with a faster digital checkout flow
**Start date:** 2026-02-27
**Ship date:** TBD (pending field test)

### What Was Built:
- **6 screens:** Sale Setup, Checkout Pad, QR Handoff, QR Scan, Payment Receive, Dashboard
- **Number pad entry** with large touch targets and price display
- **Speech-to-text input** — hold mic, speak price + description, confirm/edit/cancel
- **Auto-applied discounts** by sale day with configurable discount schedule
- **QR code generation** for two-person checkout handoff
- **QR scan/receive** with native BarcodeDetector + html5-qrcode fallback for iOS
- **Sale dashboard** with customer count, revenue, avg ticket, transaction list
- **Dashboard filtering** — status filter pills (All/Pending/Paid/Void) with live counts
- **Dashboard sorting** — Newest First / Oldest First toggle
- **Transaction management** — pending/paid/unpaid/void statuses, reopen tickets, edit orders
- **Void reason tracking** — "Void — Edited Order" labels on dashboard badges
- **First-run onboarding** — 3-card walkthrough with "How It Works" replay
- **Speech UX** — post-permission guide sheet, quick-tap detection, progressive failure tips
- **PWA + offline support** — service worker with cache-first strategy

### Development Stats:
- 32 development sessions (2026-02-27 through 2026-03-02)
- 68 commits
- Service worker cache at v48
- 11 JS modules: app, checkout, speech, qr, scan, payment, dashboard, sale-setup, onboarding, storage, utils

### Scope:
- Sale setup (name, start date with today checkbox, discount schedule with Add Day)
- First-run onboarding walkthrough (3 cards, How It Works replay)
- Checkout pad with number pad entry and Add Item button
- Speech-to-text input with hold-to-talk, parser, confirmation flow, guide sheet
- No-description prompt on every item without description
- Expandable item list with running total and savings display
- Auto-applied discounts by sale day
- QR code generation for handoff (Create Ticket)
- Edit Order flow (void + reload with same customer number)
- QR scan/receive view with BarcodeDetector + html5-qrcode fallback
- Payment receive screen with Mark Paid
- Dashboard with summary stats, filter pills, sort toggle, transaction list
- Transaction statuses: pending, paid, unpaid (legacy), void with voidReason
- Shared header with Dashboard, Scan Ticket, End Estate Sale navigation
- PWA + offline support via service worker cache-first strategy
- localStorage persistence for all data

### Remaining Before Ship:
- [ ] End-to-end test pass on mobile Chrome and mobile Safari
- [ ] Offline test (airplane mode full checkout flow)
- [ ] Field test at real estate sale with Alissa's contact

### Ship Criteria:
- [ ] Alissa's contact can set up and use the app with <2 min instruction
- [x] Price entry is ≤3 seconds per item
- [x] Discounts apply automatically — zero manual math
- [ ] Works offline in airplane mode (untested)
- [x] QR handoff works between two devices

### Post-Ship Notes:
_To be filled in after field testing_

---

## v0.2 — Post-Field-Test Iteration
**Status:** NOT STARTED
**Goal:** TBD based on real-world feedback from v0.1 testing

---

## v0.3 — Pre-Sale Inventory
**Status:** NOT STARTED
**Goal:** Photo + voice-based item cataloging before the sale

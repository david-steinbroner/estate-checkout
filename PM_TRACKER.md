# PM TRACKER — Estate Checkout

**Last updated:** 2026-03-06
**Purpose:** Tracking doc for Claude (PM partner) to maintain context across chat sessions. Human should add this to the project files.

---

## Current Project Status

**Version:** v0.1 (core features + discount system + multi-worker support complete, entering end-to-end testing)
**Current priority:** End-to-end testing on mobile Chrome and Safari, then field test
**Deployment:** Live on Cloudflare Pages (estate-checkout.pages.dev)
**Repo:** https://github.com/david-steinbroner/estate-checkout
**Service worker cache:** v89
**Development sessions:** 45 (2026-02-27 through 2026-03-06)
**JS modules:** 11 (app, checkout, speech, qr, scan, payment, dashboard, sale-setup, onboarding, storage, utils)

### What's Working (confirmed through Session 45)
- **Sale Setup** — name, "Sale starts today" checkbox (default checked, uncheck reveals date picker), discount schedule with Add Day. Start Sale + Join Sale side by side. ☰ menu with "How It Works" and "Send Feedback (Coming soon)".
- **First-run onboarding** — 3-card walkthrough (Set Up Your Sale, Ring Up Items, Mark It Paid), step dots, fade transitions, Skip, replays from ☰ menu "How It Works"
- **Checkout pad** — number pad (48px keys), price display, Add Item, running total, savings display, inline item preview (last 2-3 items with numbering, e.g. "1. Book $12.00"), full item list sheet with split tap targets (description edit / price edit), inline "Added!" flash animation, Clear All (confirmation sheet), dynamic done button ("Create Invoice" / "See Invoice" / "Create New Invoice")
- **Order naming** — merged into hint strip ("Order #3 — 2 items — tap to edit order name and items"). Tap opens item sheet with "Order #X" title (tap to rename). Sequential numbering. Custom names preserved through edit cycle. Pre-QR uses "Order", post-QR uses "Invoice".
- **No-description prompt** — bottom sheet every time item added without description. "Add Description" opens dedicated entry sheet with text input + mic button.
- **Description + price editing** — In item edit sheet, tapping description opens description edit sheet, tapping price opens adjust price sheet. Both editable after item is added.
- **Speech-to-text** — hold-to-talk, natural language parser (number words, compound prices, description extraction), confirm/edit/cancel flow, post-permission guide sheet, quick-tap detection ("Hold the button longer"), progressive failure tips, mic permission flow with custom modal, iOS early no-speech silent retry, permission persistence to localStorage
- **QR Handoff** — QR code, itemized summary, 2x2 button grid (Edit Invoice, Mark Paid, Discount, New Order), Mark Paid directly marks paid and navigates to dashboard
- **Edit Invoice loop** — lazy voiding (original not voided until first cart mutation), repeated edit cycles preserve customer number and reopenedFrom chain
- **QR Scan** — native BarcodeDetector + html5-qrcode fallback for iOS, permission denied error state with Retry, New Order button
- **Payment Receive** — customer info bar, itemized list, total, Mark Paid with success animation, New Order
- **Dashboard** — 5-status system: Open (blue), Unpaid (amber), Paid (green), Edited (gray), Cancelled (gray). Summary stats (invoices = non-void, revenue/avg = paid only). Filter pills (All/Open/Unpaid/Paid/Void) with live counts, sort toggle (Newest/Oldest First), expandable transaction list (accordion) with error isolation, status-specific action buttons. Open invoices show as drafts with blue left border.
- **Draft transaction persistence** — Adding items to cart creates an "Open" draft on dashboard in real-time. Drafts promoted to "Unpaid" on Create Invoice, deleted on Clear All or End Day.
- **Transaction statuses** — open (draft in cart), unpaid (invoice created, awaiting payment), paid (payment received), void/edited (original after edit), void/cancelled (manually cancelled)
- **Shared header** — 48px nav bar with sale name, day number, discount badge, shared sale badge; true-centered across full header width; ☰ hamburger menu (Dashboard, Scan Invoice, Share Sale, End Day, End Sale) across all active-sale screens
- **Navigation** — New Order buttons on QR, Scan, Payment, Dashboard screens
- **iOS mic reliability** — Recognition instance destroyed/recreated on page background to release mic hardware. Silent retry for early no-speech. Permission persisted to localStorage for iOS where Permissions API unavailable.
- **Discount auto-calculation** — timezone-aware day detection, configurable per-day percentages
- **Item-level haggle discounts** — tap price in edit sheet to open haggle sheet; new price, $ off, or % off; stacks on top of day discount with visual stacking display (~~$20~~ ~~$15~~ $12)
- **Ticket-level discounts** — % off or $ off entire ticket; accessible from expandable total bar and QR screen; stacks with day + haggle discounts
- **Expandable running total** — collapsed shows final total + chevron; expanded shows full price breakdown (original, day discount, haggles, subtotal, ticket discount, total, savings) plus Add/Edit Ticket Discount button
- **Shared sale / multi-worker join** — Share Sale generates QR + human-readable sale code (e.g., JOH-8291); Worker 2 scans with phone camera to join same sale config; independent transaction tracking per device
- **Multi-day sale flow** — End Day pauses sale with stats, Resume Sale advances day with correct discount, End Sale is permanent; sale states: active/paused/ended; stale sale warning after 7 days
- **Keyboard avoidance** — visualViewport API repositions all overlay sheets above iOS keyboard when inputs are focused
- **Standardized sheets** — All 17 modals use `.overlay` + `.visible` class pattern with z-index 100
- **PWA + offline** — service worker cache-first strategy (untested in airplane mode)
- **Cloudflare Pages auto-deploy** from GitHub main branch

### What's Left Before Ship

1. **✅ Design system overhaul** — Complete. All 10 implementation prompts executed.
2. **✅ Discount system** — Item-level haggle + ticket-level discounts, expandable total bar with breakdown.
3. **✅ Multi-worker support** — Share Sale QR/code, Join Sale via URL parameter.
4. **✅ Multi-day sale flow** — End Day/Resume/End Sale, paused screen, stale sale warning.
5. **✅ Header collapse** — ☰ menu replaces inline buttons, freeing vertical space on checkout screen.
6. **End-to-end test pass** on mobile Chrome and mobile Safari
7. **Offline test** — airplane mode full checkout flow
8. **Alissa's independent walkthrough** — can she complete the full flow with zero instruction?
9. **Field test** at real estate sale with Alissa's contact

### Known Issues / Tech Debt
- QR data now encoded as URL-safe base64 URL; may hit size limits for 50+ item carts — needs field validation
- Offline airplane mode never tested live
- End Sale no longer clears transactions (preserves all data). Old localStorage from pre-v61 may have sales without status field — backward compat handles via `sale.status || 'active'`
- Cart storage format changed to `{ items, ticketDiscount }` — migration handles old plain-array format
- Item data model extended with `dayDiscount`, `dayDiscountedPrice`, `haggleType`, `haggleValue` — migration handles old `discount` field
- `maxDiscountPercent` placeholder on sale object — not surfaced in UI yet, reserved for future worker discount limits

---

## Project Documents

| Document | Purpose | Status |
|----------|---------|--------|
| PRODUCT_STRATEGY.md | Strategic positioning, release phases, roadmap, business model | Updated 2026-03-03 — design system marked complete, Phase 1 checklist updated |
| MARKET_INTEL.md | Competitive research, market data, positioning, GTM | Updated 2026-03-03 — Aravenda deep-dive findings added |
| DESIGN_SYSTEM.md | Complete design system spec — tokens, components, screen fixes, implementation prompts | Created 2026-03-03 — all 10 prompts executed and complete |
| PRODUCT_SPEC.md | Detailed screen-by-screen functional spec for v0.1 | Current — may need update to reflect item list UX changes |
| CLAUDE_CODE_RULES.md | Coding standards, tech stack, session protocol for Claude Code | Updated 2026-03-03 — references DESIGN_SYSTEM.md |
| HANDOFF.md | Session-by-session changelog for Claude Code sessions | Current (Session 45) |
| BACKLOG.md | Parked features, future versions, known issues | Updated 2026-03-03 — design system resolved |
| COMPETITIVE_RESEARCH_QUESTIONS.md | Demo question guide for SimpleConsign/Aravenda | Updated 2026-03-03 — Aravenda pre-demo findings added |

**Deleted:** COMBINED_DOCS.md (stale duplicate of HANDOFF), VERSION_LOG.md (duplicated HANDOFF + PRODUCT_STRATEGY)

---

## Recent Development Arc (Sessions 4–32)

Sessions 4–9: Built QR scan/receive, payment flow, dashboard, speech-to-text with parser
Sessions 10–13: Header consolidation, shared nav bar, description prompt fixes, camera/mic cleanup
Sessions 14–15: Critical bug fixes (camera leak, payment storage key, DONE button blocking, scan timeout race)
Sessions 16–17: Navigation overhaul (← Checkout button, removed duplicate headers, unified overlays to bottom sheets)
Sessions 18–19: Scan permission fixes (trap overlay, header buttons on denied state)
Sessions 20–21: Codebase audit — touch targets, CSS variables, dead code removal, utils extraction
Sessions 22–24: UI polish — expandable item list, reduced numpad size, removed dev title bar, Title Case buttons, "Sale starts today" checkbox
Sessions 25–26: More UI cleanup — removed ← Checkout header button, Edit Order moved to QR screen, New Customer everywhere, renamed buttons for clarity
Session 27: First-run onboarding walkthrough + "How It Works" replay
Sessions 28–30: Edit Order void loop fix, removed description prompt limit, speech UX fixes (mic guide, quick-tap, blur handler)
Sessions 31–32: Void reason labels on dashboard, filter pills, sort toggle, filter-specific empty states
Session 33 (2026-03-03): **Design system overhaul** — 10-prompt implementation sequence. Token system replacement, button standardization (single 48px height, 4 color variants), input standardization, hardcoded color/size replacement, item list UX overhaul (bottom sheet + inline preview + numbering + inline Added flash), numpad resize to 48px, status badge standardization, bottom sheet polish, final audit + comment cleanup. Service worker bumped from v48 to v57.
Session 34 (2026-03-03): **Order naming + customer ticket page** — Optional order name input (replaces auto "Customer #X"), QR codes now encode URLs to standalone `ticket.html` (customers scan with phone camera to see receipt + QR), renamed "Customer" → "Order" throughout UI, dual-format scanner (URL + legacy JSON), orderName preserved through Edit Order cycle, service worker bumped to v59.
Session 35 (2026-03-03): **Ticket QR fix** — URL-safe base64 encoding for QR data, larger ticket QR (240x240, Level L), robust URL detection in scanner. Service worker v60.
Session 36 (2026-03-03): **Multi-day sale flow** — End Day pauses sale with day summary stats, Resume Sale advances to next day with correct discount, End Sale is permanent (transaction data preserved). Sale states: active/paused/ended. Paused screen shows today's stats, next-day preview, 7-day stale nudge. Dashboard accessible while paused (New Order hidden). Service worker v61.
Session 37 (2026-03-04): **Bug fix: paused screen bleed-through** — Removed `display: flex` from `.paused-screen` CSS that was overriding `.screen { display: none }`, causing paused screen to appear underneath other screens. Service worker v62.
Session 38 (2026-03-04): **Item-level & ticket-level discounts (Prompt 14)** — Haggle discounts on individual items (new price / $ off / % off), stacking on day discount with visual display. Ticket-level discount (% or $ off whole ticket). Extended item data model (dayDiscount, dayDiscountedPrice, haggleType, haggleValue). Transaction model extended with subtotal and ticketDiscount. Cart storage wrapped as {items, ticketDiscount}. Backward compat migrations for all old data. Updated QR data, ticket page, payment screen, and dashboard to show stacking prices. Service worker v63.
Session 39 (2026-03-04): **Shared sale / multi-worker join (Prompt 15)** — Share Sale generates QR code + sale code (e.g., JOH-8291). QR encodes sale config as URL-safe base64 in `?join=` parameter. Worker 2 scans with phone camera → join confirmation sheet → creates matching sale. Independent transaction tracking per device. Join Sale button on setup screen shows scan instruction. Shared badge in header. Sale object extended with shareCode, isShared, sharedAt.
Session 40 (2026-03-04): **UI cleanup (Prompt 16)** — Header buttons collapsed into ☰ hamburger menu (bottom sheet with Dashboard, Scan Ticket, Share Sale, End Day, End Sale). Expandable running total bar (collapsed = total + chevron, expanded = full breakdown + Add/Edit Ticket Discount button). Ticket % button removed from action bar. Discount button added to QR screen for in-place ticket discount without voiding transaction.
Session 41 (2026-03-05): **Checkout UX overhaul** — Taller 48px header as proper nav bar. Removed description input + order name bar, merged order info into always-visible hint strip. Item sheet redesigned with editable "Order #X" title + split description/price tap targets. Keyboard avoidance via visualViewport API. Fixed Edit Ticket crashes (removed element refs). Standardized all 17 sheets to overlay+visible pattern. Setup screen: side-by-side buttons + header with ☰ menu. Add Description flow implemented. Haggle sheet stacking fix.
Session 42 (2026-03-05): **Edit Sale sheet enhancements** — Current Day changed from number input to dropdown select. Confirm/Done button flow prevents accidental sheet close during editing. Remove discount days with sequential renumbering (disabled for completed days, flash error toast).
Session 43 (2026-03-05): **Checkout UX polish** — Description mic button, hint strip merged into total bar, QR screen 2x2 button grid, ticket/order renamed to invoice throughout. Service worker v63 → v73.
Session 44 (2026-03-05): **Dashboard status overhaul** — 5-status system (Open/Unpaid/Paid/Edited/Cancelled), draft transaction persistence, filter pills, lazy voiding, order/invoice naming distinction, dynamic done button, true-centered nav bar. Cart banner removed. Service worker v73 → v85.
Session 45 (2026-03-06): **iOS mic + dashboard bug fixes** — Dashboard TDZ fix, error isolation for row rendering, iOS Safari mic release (destroy/recreate recognition), iOS Chrome early no-speech silent retry, permission persistence to localStorage, quick-tap threshold fix. Service worker v85 → v89.

---

## Discovery & Validation

**Status:** First operator feedback received from Allison (estate sale + consignment operator, via Alissa text, 2026-03-04). She confirmed the checkout bottleneck pain (20-40 person lines), uses Square on phone for payment, tracks consignor numbers on notepads, and emphasized workers need extreme simplicity. Alissa confirmed (2026-03-05 voice note) that Allison does use consignor-style tracking at estate sales too — different family members selling different items, tagged so she knows whose stuff sold and can split payouts. Alissa thinks Allison is open to follow-up questions but may resist trying the app — "she just wants to use her handwritten methods." Key quote: "I think if we came with something really simple she might be open to it." Allison is Alissa's only estate sale connection — need to find more operators independently. Shared project overview doc + prototype link with Alissa (2026-03-05). Aravenda demo missed and rescheduling. SimpleConsign demo still to be scheduled.

**Discovery opener:** "I've been noticing at every estate sale — the checkout person punching every item into that adding machine, printing tape, writing tickets, especially on Day 2 when they manually calculate discounts. Is that as painful on your end as it looks?"

**What we've learned so far:**
- ✅ Operators DO feel the checkout pain — 20-40 person lines, speed is the hard part
- ✅ Workers (not owners) are the real users — simplicity is non-negotiable
- ✅ Square already in use for payment — phone-as-tool is accepted, but phone is contested real estate
- ✅ Consignor/multi-seller tracking is a real workflow — items tagged to seller numbers, payout reconciliation done on notepads after the sale
- ✅ "Why not just a calculator?" is the positioning question we need to answer instantly
- ❓ Is consignor tracking common across operators or specific to consignment-adjacent ones?
- ❓ Would Allison do a side-by-side test at a real sale?
- ❓ What's the full end-to-end checkout flow at her estate sales specifically?

**What we still need to learn:**
- Have they tried to fix it? What failed and why?
- Is there a graveyard of failed attempts?
- How does consignor payout reconciliation work end-to-end? How long does it take?
- Does she use Square at estate sales or just at her store?
- What would make her actually switch from the adding machine?

**Follow-up questions to ask Allison (via Alissa or direct):**
1. "When you're running an estate sale specifically — not your store — what does your checkout table look like? Adding machine? Calculator? Square? Notepads?"
2. "At estate sales, what's the part that slows you down the most or causes the most mistakes?"
3. "Do you use Square at estate sales for the actual ringing up, or just for taking card payments after you've already totaled everything?"
4. "At estate sales with multiple family members selling — do you track consignor numbers during the sale at checkout, or figure it out after? Like are items physically tagged with the consignor number, and your worker writes that down as they ring up?"
5. "After the sale, how does the consignor payout work? Do you sit down with the notepads and add up each consignor's total by hand?"

**Why these matter:** We're still conflating her consignment store workflow with her estate sale workflow. These questions separate the two and tell us whether consignor tracking is a checkout-time problem (worker has to record it while 40 people wait) or a back-office problem (operator tallies it at home after the sale). That distinction determines whether it belongs in the checkout flow or in a reporting feature.

---

## Open Product Questions

- QR data format: raw JSON works for now, may need compression for 50+ item carts
- Should completed transactions persist across sales or reset? (Current: clears on End Sale)
- Speech-to-text reliability on iOS Safari vs Android Chrome — iOS-specific fixes shipped (Session 45), needs field validation
- Setup screen usability: could a 60-year-old figure it out with 2 min training?
- Onboarding walkthrough: is it enough, or do users dismiss and get confused?
- PWA vs App Store: do operators ask "is this in the App Store?" — does it matter for adoption?
- **Consignor/seller tagging:** Is this a checkout-time problem (worker records consignor # per item while ringing up) or a back-office problem (operator tallies payouts after the sale)? If checkout-time, it could be a lightweight optional tag in v0.2. If back-office, it's a reporting/export feature. Need Allison follow-up to clarify.
- **"Store mode" expansion:** Allison uses Square for payment but tracks consignors on notepads — Square has vendor features but she doesn't use them (too slow/complex for real-time checkout). Could we become the fast-entry front end for consignment tracking that feeds into a payout report? Path A: lightweight seller tag in checkout flow + payout breakdown in dashboard. Path B: full store mode for consignment shops. Path A first — validate with field data before considering B. See principle #5.

---

## Principles (reminders for myself)

1. **Design system before field test** — first impressions matter, we get one shot per operator
2. Speed of entry is the product — nothing else matters if it's slower than the adding machine
3. Build for the skeptic — 40-70 year old worker, 2 minutes of training, didn't ask for this
4. Don't become what we're replacing — no inventory setup, no accounts, no platform complexity (see PRODUCT_STRATEGY.md strategic guardrail)
5. Don't build ahead of learning — field testing and discovery conversations shape the roadmap, not assumptions
6. Keep Claude Code focused — specific tasks, separate commits, always update HANDOFF.md
7. Always label prompts with who they're for ("Give this to Claude Code")

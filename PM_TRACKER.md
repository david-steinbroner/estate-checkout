# PM TRACKER — Estate Checkout

**Last updated:** 2026-03-03
**Purpose:** Tracking doc for Claude (PM partner) to maintain context across chat sessions. Human should add this to the project files.

---

## Current Project Status

**Version:** v0.1 (features and design system complete, entering end-to-end testing)
**Current priority:** End-to-end testing on mobile Chrome and Safari, then field test
**Deployment:** Live on Cloudflare Pages (estate-checkout.pages.dev)
**Repo:** https://github.com/david-steinbroner/estate-checkout
**Service worker cache:** v59
**Development sessions:** 32+ (2026-02-27 through 2026-03-03, plus design system implementation session)
**JS modules:** 11 (app, checkout, speech, qr, scan, payment, dashboard, sale-setup, onboarding, storage, utils)

### What's Working (confirmed through Session 32)
- **Sale Setup** — name, "Sale starts today" checkbox (default checked, uncheck reveals date picker), discount schedule with Add Day, Start Sale, "How It Works" link
- **First-run onboarding** — 3-card walkthrough (Set Up Your Sale, Ring Up Items, Mark It Paid), step dots, fade transitions, Skip, replays from "How It Works"
- **Checkout pad** — number pad (48px keys), price display, Add Item, description field, running total, savings display, inline item preview (last 2-3 items with numbering, e.g. "1. Book $12.00"), bottom sheet overlay for full item list with remove buttons, inline "Added!" flash animation, Clear All (confirmation sheet), Create Ticket
- **No-description prompt** — bottom sheet every time item added without description (no limit)
- **Speech-to-text** — hold-to-talk, natural language parser (number words, compound prices, description extraction), confirm/edit/cancel flow, post-permission guide sheet, quick-tap detection ("Hold the button longer"), progressive failure tips, mic permission flow with custom modal
- **QR Handoff** — QR code, itemized summary, Edit Order (voids + reloads), New Customer
- **Edit Order loop** — repeated Edit Order → Create Ticket cycles preserve customer number and reopenedFrom chain
- **QR Scan** — native BarcodeDetector + html5-qrcode fallback for iOS, permission denied error state with Retry, New Customer button
- **Payment Receive** — customer info bar, itemized list, total, Mark Paid with success animation, New Customer
- **Dashboard** — summary stats (customers, revenue, avg ticket), filter pills (All/Pending/Paid/Void) with live counts, sort toggle (Newest/Oldest First), expandable transaction list (accordion), status badges (Pending orange, Paid green, Void gray with reason), action buttons (Mark as Paid/Unpaid, Edit Order, Generate Ticket), filter-specific empty states
- **Transaction statuses** — pending (from Create Ticket), paid (from Mark Paid), void (from Edit Order, with voidReason), unpaid (legacy)
- **Shared header** — sale name, day number, discount badge; Dashboard, Scan Ticket, End Estate Sale buttons; active button highlighting
- **Navigation** — New Customer buttons on QR, Scan, Payment, Dashboard screens
- **Discount auto-calculation** — timezone-aware day detection, configurable per-day percentages
- **PWA + offline** — service worker cache-first strategy (untested in airplane mode)
- **Cloudflare Pages auto-deploy** from GitHub main branch

### What's Left Before Ship

1. **✅ Design system overhaul** — Complete. All 10 implementation prompts executed. Full token system, component library, screen-by-screen rebuild, item list UX overhaul, and final audit/cleanup done. See DESIGN_SYSTEM.md.
2. **End-to-end test pass** on mobile Chrome and mobile Safari
3. **Offline test** — airplane mode full checkout flow
4. **Alissa's independent walkthrough** — can she complete the full flow with zero instruction?
5. **Field test** at real estate sale with Alissa's contact

### Known Issues / Tech Debt
- QR data now encoded as base64 URL; may hit size limits for 50+ item carts — needs field validation
- Offline airplane mode never tested live

---

## Project Documents

| Document | Purpose | Status |
|----------|---------|--------|
| PRODUCT_STRATEGY.md | Strategic positioning, release phases, roadmap, business model | Updated 2026-03-03 — design system marked complete, Phase 1 checklist updated |
| MARKET_INTEL.md | Competitive research, market data, positioning, GTM | Updated 2026-03-03 — Aravenda deep-dive findings added |
| DESIGN_SYSTEM.md | Complete design system spec — tokens, components, screen fixes, implementation prompts | Created 2026-03-03 — all 10 prompts executed and complete |
| PRODUCT_SPEC.md | Detailed screen-by-screen functional spec for v0.1 | Current — may need update to reflect item list UX changes |
| CLAUDE_CODE_RULES.md | Coding standards, tech stack, session protocol for Claude Code | Updated 2026-03-03 — references DESIGN_SYSTEM.md |
| HANDOFF.md | Session-by-session changelog for Claude Code sessions | Current (v57) |
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

---

## Discovery & Validation

**Status:** Waiting on Alissa's conversation with her estate sale contact. Aravenda demo missed and rescheduling (sent technical questions to Carolyn Thompson, President — see COMPETITIVE_RESEARCH_QUESTIONS.md for pre-demo findings from website analysis). SimpleConsign demo still to be scheduled.

**Discovery opener:** "I've been noticing at every estate sale — the checkout person punching every item into that adding machine, printing tape, writing tickets, especially on Day 2 when they manually calculate discounts. Is that as painful on your end as it looks?"

**What we need to learn:**
- Do operators feel the pain, or just customers?
- Have they tried to fix it? What failed and why?
- Would they try something new?
- Is there a graveyard of failed attempts?

---

## Open Product Questions

- QR data format: raw JSON works for now, may need compression for 50+ item carts
- Should completed transactions persist across sales or reset? (Current: clears on End Sale)
- Speech-to-text reliability on iOS Safari vs Android Chrome — untested in field conditions
- Setup screen usability: could a 60-year-old figure it out with 2 min training?
- Onboarding walkthrough: is it enough, or do users dismiss and get confused?
- PWA vs App Store: do operators ask "is this in the App Store?" — does it matter for adoption?

---

## Principles (reminders for myself)

1. **Design system before field test** — first impressions matter, we get one shot per operator
2. Speed of entry is the product — nothing else matters if it's slower than the adding machine
3. Build for the skeptic — 40-70 year old worker, 2 minutes of training, didn't ask for this
4. Don't become what we're replacing — no inventory setup, no accounts, no platform complexity (see PRODUCT_STRATEGY.md strategic guardrail)
5. Don't build ahead of learning — field testing and discovery conversations shape the roadmap, not assumptions
6. Keep Claude Code focused — specific tasks, separate commits, always update HANDOFF.md
7. Always label prompts with who they're for ("Give this to Claude Code")

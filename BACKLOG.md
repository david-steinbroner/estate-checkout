# BACKLOG — Estate Checkout

**Purpose:** Park ideas, feature requests, and future work here so they don't creep into the current version. Claude Code should add items here when out-of-scope requests come up.

**Current priority:** v0.1 feature-complete through v213 (discounts, multi-worker, multi-day, checkout UX overhaul, consignor tracking, Past Estate Sales archive, cloud purge, Invoice Adjustment with surcharges, hash routing for back-button, App Guide, Add to Home Screen affordance, browser-aware install instructions, viewport-fit safe-area). Next: end-to-end testing on mobile Chrome and Safari, then field test.

> **Roadmap alignment:** The version structure below matches PRODUCT_STRATEGY.md §11. All items beyond v0.1 are hypotheses that will be validated by field test feedback. See PRODUCT_STRATEGY.md for the strategic rationale behind each version.

---

## v0.2 — Field Test Fixes (after field testing)

Scope is driven entirely by what we learn in field tests. These are likely candidates, not commitments:

- [ ] **SHARED tag on the originating device.** v174 fixed the false-positive (SHARED was flipping just on opening the Share Sale sheet). Currently SHARED only shows on devices that joined someone else's sale. To show SHARED on the originator when another device actually joins, we need a backend signal — e.g., increment a `device_count` column on each `/sales/by-code/:code` lookup, then poll it from the originator and flip the chip when count > 1.
- [ ] **Exit Sale.** Workers who joined a shared sale via Share Estate Sale can back out to the Setup screen on their device WITHOUT ending the sale for everyone. The cloud copy stays intact, other devices keep working, the leaving worker just loses local access until they rejoin with the share code. Currently the only way for a joiner to "leave" is End Estate Sale Permanently (destructive for everyone) or wiping localStorage.
- [ ] **First-launch walkthrough.** A 3-step guide that fires automatically on first app open, before any sale is created. Currently App Guide (v204) covers the same content but is opt-in via menu. For non-tech operators (40-70), surfacing it once on first launch could reduce time-to-first-sale.
- [ ] One-person checkout flow shortcut (skip QR, mark paid directly from checkout)
- [ ] Dashboard search by customer number
- [ ] Dashboard date range filtering
- [ ] Larger QR codes or alternative handoff method for large carts (50+ items)
- [ ] Worker discount limits (maxDiscountPercent — enforce max haggle authority per worker; placeholder already in data model)
- [ ] Undo last transaction (not just last item)
- [ ] Combined multi-device reporting (merge transaction data from shared sale across devices)
- [ ] Bulk export across multiple past sales (currently per-sale only)

**Moved to v0.1 (completed 2026-03-04):**
- ~~Per-item manual discount override for haggling~~ → Item-level haggle discounts (new price / $ off / % off)
- ~~Edit already-entered items~~ → Tap item in sheet to haggle; Edit Order from QR screen
- ~~Total-level discount~~ → Ticket-level discount (% or $ off)
- ~~Toggle to apply/not apply day discount per item~~ → Haggle system replaces this need

**Moved to v0.1 (completed 2026-03-06):**
- ~~Consignor/seller tagging~~ → Full consignor system: data model, management UI, item tagging, colored dots throughout, Consignor Payouts screen with payout breakdown
- ~~Vendor payout reporting~~ → Consignor Payouts screen covers this for estate sales

**Moved to v0.1 (completed 2026-04-28 to 2026-05-02, v167–v213):**
- ~~Export sale data as CSV~~ → Per-sale export via native share sheet with day picker (v188+, v190 added picker, v206 added signed Adjustment column, surcharge-aware CSV math)
- ~~Past Estate Sales~~ → Local IndexedDB archive of every ended sale; review invoices/stats/consignor revenue; per-sale cloud purge with type-the-name confirm; "Clear all past estate sales" reset (v193, v199 fixed cross-sale data leak with saleId tagging)
- ~~Invoice Adjustment (surcharges)~~ → Was discount-only "Adjust Price"; now Discount/Surcharge/Set Total with % or $ for each, signed preview, signed CSV column (v206)
- ~~App Guide~~ → Replaces What's New menu entry; three-section accordion of FAQs covering setup, daily ops, wrap-up (v204)
- ~~Browser back button + URL routing~~ → Hash routing means refresh stays on current screen, browser back walks screens, screens are bookmarkable; modal-back closes the modal (v203)
- ~~Add to Home Screen entry~~ → Browser-aware install instructions (iOS Safari, Android Chrome with native prompt, Edge, Firefox, Opera, Mac Safari, generic fallback). Notification dot on menu button + install row until tapped. Auto-reappears if user uninstalls. (v212–v213)
- ~~Check for Updates entry~~ → Manual `registration.update()` trigger with inline label feedback ("Checking…" → "✓ Up to date"). Complements existing auto-update on visibility change (v212)
- ~~Critical: invoice cross-sale leak~~ → Pre-v199, every ended sale's archive inherited transactions from previous sales (no saleId scoping; clearTransactions never called between sales). Fixed with saleId tagging at creation, sale-scoped reads everywhere, post-archive purge of just-ended-sale's transactions. (v199)
- ~~Critical: Mark Paid race condition~~ → Tap Mark Paid → navigate to dashboard → first poll returned stale server record and clobbered local "paid" state. Fixed with timestamp-based merge precedence (`_updatedAt` stamped on every local mutation). (v200)
- ~~iOS keyboard pushup on sheets~~ → Sheet was using `dvh` which shrinks under keyboard. Switched to `lvh` + drop `preventScroll: true` on inputs in mid/bottom of sheets so iOS auto-scroll exposes the input naturally. (v206/v208/v211)
- ~~iOS double-tap zoom~~ → `touch-action: manipulation` on body. Doesn't affect pull-to-refresh or pinch-zoom. (v206)
- ~~Edit Estate Sale Details redesign~~ → Bespoke `.edit-sale__row` retired; rebuilt to mirror Setup's grouped-card layout (.ec-card + .discount-row + .consignor-list__item + Edit Mode for batch delete). (v209)
- ~~Pencil edit-icon removed everywhere~~ → Replaced with iOS-native blue tappable text affordance for editable inline values. (v209)
- ~~PWA standalone polish~~ → `viewport-fit=cover` activates `env(safe-area-inset-bottom)` so bottom action bars clear the iOS home indicator in standalone mode. (v210)

## v0.3 — Adjacent Segments: Vintage Markets & Multi-Vendor Sales

Hypothesis: same checkout pain exists at vintage markets, flea markets, pop-up shops. See MARKET_INTEL.md §4.

- [ ] Multi-vendor support (track sales by vendor/booth within a single event — extends consignor model)
- [ ] Flexible discount schedules (time-based, category-based — not just day-based)
- [ ] Possibly a "market organizer" mode

## v0.4 — Broader Event Types

Hypothesis: charity sales, church rummage sales, garage sales share the checkout pain. See MARKET_INTEL.md §4.

- [ ] Multi-station support (several checkout devices at one event)
- [ ] Zero-training volunteer mode
- [ ] Nonprofit reporting (revenue tracking for donors, tax documentation)
- [ ] Simplified garage sale mode (no discount schedule, multi-seller tracking, change calculator)

## v1.0 — Best Checkout Tool for Any Pop-Up Sale

NOT a business management platform. See PRODUCT_STRATEGY.md §11 for what v1.0 is and is not.

- [ ] Invisible cloud backup (no accounts, no login — zero friction)
- [ ] POS integration (Square API — skip manual total entry)
- [ ] App Store / Play Store distribution (only if PWA limitations block adoption)
- [ ] Customer-facing digital receipt (text or email)
- [ ] Polished analytics (revenue trends across sales — simple, visual, glanceable)

---

## Parking Lot (Ideas That Need More Thought)

- Should customers be able to scan their own items and self-checkout?
- Integration with estate sale listing sites (EstateSales.net, etc.)
- Multi-language support (Spanish for Austin market?)
- Bluetooth receipt printer support
- Item categories/tags for basic reporting
- Multiple simultaneous checkout stations (multi-device)

### Explicitly Out of Scope (see PRODUCT_STRATEGY.md strategic guardrail)

These were previously on the roadmap but removed because they conflict with our core positioning of radical simplicity:

- ~~Pre-sale inventory system (photo capture, room-based organization, item catalogs)~~ — This is what PROSALE does. Adding inventory setup burden is how we lose.
- ~~User accounts and login~~ — Replaced by invisible cloud backup in v1.0. No login screen, ever.
- ~~Multi-company SaaS management~~ — We're a checkout tool, not a business platform.
- ~~AI image recognition / pricing suggestions~~ — Cool but adds complexity. Revisit only if field data shows demand.

---

## Known Issues / Tech Debt

| Date | Issue | Severity | Notes |
|------|-------|----------|-------|
| 2026-03-04 | Paused screen bleed-through | Resolved | `.paused-screen` had `display: flex` overriding `.screen { display: none }`. Fixed by removing the explicit display property. |
| 2026-03-04 | Checkout screen too cramped on mobile | Resolved | Header buttons collapsed into ☰ menu, running total made expandable, Ticket % button removed from action bar and relocated to expanded total + QR screen. |
| 2026-03-05 | Bottom sheets hidden behind iOS keyboard | Resolved | Added visualViewport API keyboard avoidance for all overlay sheets. |
| 2026-03-05 | Edit Order/Ticket buttons crash silently | Resolved | Both qr.js and dashboard.js referenced removed `orderNameInput` DOM element. Updated to set `Checkout.orderCustomName`. |
| 2026-03-05 | Haggle sheet hidden behind item edit sheet | Resolved | Both at z-index 100. Fixed by closing item sheet when haggle opens, reopening on close. |
| 2026-03-05 | "Add Description" button did nothing | Resolved | `focusDescription()` was a stub. Implemented full description entry sheet flow. |
| 2026-03-05 | Item sheet used non-standard pattern | Resolved | Converted from `.sheet-backdrop` + `hidden` to `.overlay` + `.visible` class pattern. |
| 2026-03-06 | Dashboard transaction list blank (TDZ) | Resolved | `renderTransactionRow()` referenced `status` before `const` declaration. Moved declaration to top. |
| 2026-03-06 | Single bad transaction blanks entire dashboard list | Resolved | Added try-catch in `renderTransactionList()` `.map()` and `renderTransactionDetail()` call. |
| 2026-03-06 | iOS Safari mic stays active after backgrounding | Resolved | Destroy and recreate `SpeechRecognition` instance in `forceStopRecognition()`. |
| 2026-03-06 | iOS Chrome mic immediately errors (Alissa report) | Resolved | Silent retry for early no-speech, `ensureRecognition()` in `startListening()`, permission persisted to localStorage, quick-tap threshold fix. |
| 2026-03-03 | Design system inconsistency across screens | Resolved | Complete design system shipped. See DESIGN_SYSTEM.md. |
| 2026-03-02 | QR data may hit size limits for 50+ item carts | Low | URL-safe base64 encoded, no compression. Needs field test data to validate real-world cart sizes. Haggle data adds ~30 bytes per item. |
| 2026-03-02 | Offline airplane mode not tested | Medium | Service worker caches all assets but no live test has been done in airplane mode. |

---

## Field Testing Notes
_To be filled in after first real estate sale test._

| Date | Tester | Feedback | Priority |
|------|--------|----------|----------|
| — | — | — | — |

# BACKLOG — Estate Checkout

**Purpose:** Park ideas, feature requests, and future work here so they don't creep into the current version. Claude Code should add items here when out-of-scope requests come up.

**Current priority:** Design system overhaul (see DESIGN_SYSTEM.md). No new features until design system is complete.

> **Roadmap alignment:** The version structure below matches PRODUCT_STRATEGY.md §11. All items beyond v0.1 are hypotheses that will be validated by field test feedback. See PRODUCT_STRATEGY.md for the strategic rationale behind each version.

---

## v0.2 — Field Test Fixes (after field testing)

Scope is driven entirely by what we learn in field tests. These are likely candidates, not commitments:

- [ ] One-person checkout flow shortcut (skip QR, mark paid directly from checkout)
- [ ] Export sale data as CSV
- [ ] Edit already-entered items (tap to adjust description, price, or discount)
- [ ] Per-item manual discount override for haggling
- [ ] Dashboard search by customer number
- [ ] Dashboard date range filtering
- [ ] Larger QR codes or alternative handoff method for large carts (50+ items)
- [ ] Toggle to apply/not apply day discount per item
- [ ] Total-level discount (% or $ off entire cart)
- [ ] Undo last transaction (not just last item)

## v0.3 — Adjacent Segments: Vintage Markets & Multi-Vendor Sales

Hypothesis: same checkout pain exists at vintage markets, flea markets, pop-up shops. See MARKET_INTEL.md §4.

- [ ] Multi-vendor support (track sales by vendor/booth within a single event)
- [ ] Flexible discount schedules (time-based, category-based — not just day-based)
- [ ] Vendor payout reporting (split revenue between market organizer and vendors)
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
| 2026-03-03 | Design system inconsistency across screens | High | Prompts 1-4 done: tokens, buttons (1 height), inputs, touch targets, all hardcoded colors eliminated. Remaining: hardcoded sizes, status badges, bottom sheets, screen polish, final audit. **Still the current priority.** |
| 2026-03-02 | QR data may hit size limits for 50+ item carts | Low | Raw JSON, no compression. Needs field test data to validate real-world cart sizes. |
| 2026-03-02 | Offline airplane mode not tested | Medium | Service worker caches all assets but no live test has been done in airplane mode. |

---

## Field Testing Notes
_To be filled in after first real estate sale test._

| Date | Tester | Feedback | Priority |
|------|--------|----------|----------|
| — | — | — | — |

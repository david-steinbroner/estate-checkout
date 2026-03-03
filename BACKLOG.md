# BACKLOG — Estate Sale Checkout MVP

**Purpose:** Park ideas, feature requests, and future work here so they don't creep into the current version. Claude Code should add items here when out-of-scope requests come up.

**v0.1 Status:** ~95% complete as of Session 32 (2026-03-02). Remaining: end-to-end test pass, offline testing, field test.

---

## Future Versions

### v0.2 — Post-MVP Improvements (after field testing)
- [ ] One-person checkout flow shortcut (skip QR, mark paid directly from checkout)
- [ ] Export sale data as CSV
- [ ] Dashboard date range filtering
- [ ] Dashboard search by customer number
- [ ] Bluetooth receipt printer support
- [ ] Multiple simultaneous checkout stations (multi-device)
- [ ] Item categories/tags for basic reporting
- [ ] Undo last transaction (not just last item)
- [ ] Larger QR codes or alternative handoff method for large carts (50+ items)
- [ ] Edit already-entered items (tap to adjust description, price, or discount)
- [ ] Per-item manual discount override for haggling
- [ ] Toggle to apply/not apply day discount per item
- [ ] Total-level discount (% or $ off entire cart)

### v0.3 — Pre-Sale Inventory System
- [ ] Photo capture of items during estate sale setup
- [ ] Speech-to-text for item descriptions during inventory
- [ ] Room-based organization (living room, kitchen, garage, etc.)
- [ ] Pre-populated item catalog that feeds into checkout
- [ ] Price tag printing (if thermal printer available)

### v1.0 — Full Product
- [ ] User accounts and cloud sync
- [ ] AI image recognition for item identification
- [ ] Pricing suggestions based on comparable items
- [ ] Online listing integration (eBay, Facebook Marketplace, etc.)
- [ ] Analytics dashboard (sales trends, popular items, revenue by sale)
- [ ] POS integration (Square, Clover API)
- [ ] Multi-company support (SaaS model)
- [ ] Customer-facing receipt via text/email

---

## Parking Lot (Ideas That Need More Thought)
- Should customers be able to scan their own items and self-checkout?
- Integration with estate sale listing sites (EstateSales.net, etc.)
- Could the inventory photos be used to auto-generate online sale listings?
- Multi-language support (Spanish for Austin market?)

---

## Known Issues / Tech Debt

| Date | Issue | Severity | Notes |
|------|-------|----------|-------|
| 2026-03-02 | QR data may hit size limits for 50+ item carts | Low | Raw JSON, no compression. Needs field test data to validate real-world cart sizes. |
| 2026-03-02 | `--numpad-btn-size` at 56px is below 64px CLAUDE_CODE_RULES minimum | Low | Reduced from 64px in Session 22 to reclaim vertical space. Touch target still usable but below spec. |
| 2026-03-02 | VERSION_LOG and HANDOFF "Files Changed" weren't maintained every session | Info | Sessions 7, 9, 18-21 missing from Files Changed section. Session logs are complete. |
| 2026-03-02 | Offline airplane mode not tested | Medium | Service worker caches all assets but no live test has been done in airplane mode. |

---

## Field Testing Notes
_To be filled in after first real estate sale test._

| Date | Tester | Feedback | Priority |
|------|--------|----------|----------|
| — | — | — | — |

# HANDOFF — Estate Sale Checkout MVP

**Last updated:** [DATE]
**Last session by:** [WHO]
**Current version:** v0.1

---

## What Was Accomplished
_Nothing yet — project has not started._

---

## Current State

### What Works
- N/A — no code written yet

### What's Broken
- N/A

### What's Half-Done
- N/A

---

## Files Changed This Session
_None — initial setup_

---

## Next Steps (Priority Order)

1. **Initialize git repo** — Create the repository, initial commit with project structure per CLAUDE_CODE_RULES.md, push to GitHub
2. **Set up project scaffold** — PWA manifest, service worker shell, index.html with routing, CSS variables
3. **Build checkout pad screen** — Number pad, add item flow, item list, running total
4. **Add discount logic** — Sale setup screen, discount rules, auto-apply to checkout
5. **Add speech-to-text** — Mic button on checkout pad, parse price from utterance
6. **QR code generation** — Encode itemized list, display QR for scanning
7. **QR scan/receive view** — Second employee scans QR, sees itemized list and total
8. **Sale dashboard** — Transaction count, total revenue, average ticket
9. **PWA + offline** — Service worker caching, install prompt, offline fallback
10. **End-to-end testing** — Run all test scenarios from CLAUDE_CODE_RULES.md

---

## Open Questions

1. **QR data format:** Should the QR encode raw JSON or link to a local page that renders the data? JSON is simpler and works offline. URL approach is prettier but may hit QR size limits with many items.
2. **Sale persistence:** Should completed transactions persist across sales or reset when a new sale is created?
3. **Multi-transaction:** Can two checkout workers use the app simultaneously on different devices for the same sale? (v0.1 answer is probably no — single device per sale)

---

## Known Bugs
_None — no code yet_

---

## How to Test
_No testable build yet. When ready:_
1. Open index.html in mobile Chrome or Safari
2. Follow test scenarios in CLAUDE_CODE_RULES.md Section 7

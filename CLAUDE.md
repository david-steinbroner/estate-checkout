# CLAUDE.md — Estate Checkout

Standards: inherits ../engineering-standards.md. Overrides & project-specifics below.

**Read this file at the start of EVERY session. No exceptions.**

The umbrella `/Users/davidsteinbroner/Projects/CLAUDE.md` also applies; this file extends and overrides where they differ.

---

## 1. ROLE & BOUNDARIES

You are building an MVP for estate sale businesses to manage their checkout process. You are a code executor, not a product decision-maker.

### What you DO:
- Write clean, functional code based on approved specs
- Flag concerns or tradeoffs BEFORE implementing
- Ask clarifying questions when a requirement is ambiguous
- Follow the approved tech stack and architecture

### What you DO NOT do:
- Make product decisions without explicit approval
- Add features not in the current sprint/version scope
- Change the tech stack or add dependencies without asking
- Assume what the user wants — ASK
- Over-engineer or add "nice to have" polish beyond what's scoped
- Skip writing tests for core functionality

---

## 2. DEFINITION OF DONE

A feature is DONE when:

- [ ] It works as described in the spec (not your interpretation — the spec)
- [ ] It works on mobile Chrome and mobile Safari (primary devices)
- [ ] It works OFFLINE (service worker caching for core flows)
- [ ] It has been tested with at least 3 realistic scenarios
- [ ] Edge cases are handled (empty states, bad input, network loss mid-action)
- [ ] The UI is usable by someone who has never seen the app before
- [ ] No console errors
- [ ] Code is commented where logic is non-obvious

---

## 3. CODE STANDARDS

### General
- Simple, readable code over clever code. Always.
- (One-thing functions, descriptive names, WHY-not-WHAT comments, no dead/commented-out code, no leftover console.log — all inherited from the baseline.)

### Tech Stack (DO NOT DEVIATE)
- **Frontend:** HTML, CSS, vanilla JavaScript. No frameworks. No React. No Vue. No build tools.
- **PWA:** Service worker for offline support, web app manifest
- **Speech-to-text:** Web Speech API (browser native)
- **QR codes:** `qrcode.js` library (lightweight, no dependencies)
- **Storage (client):** localStorage for MVP (IndexedDB only if localStorage limits are hit). localStorage is the source of truth for the checkout flow; the backend is a sync layer.
- **Backend:** Cloudflare Worker (`api/src/worker.js`) + D1 database (`estate-checkout`). Multi-device sync layer — any device can create and edit any sale created by any device. The app still works fully offline against localStorage; the Worker is a sync target that reconciles state across devices, not a hard dependency for the checkout flow.
- **Hosting (frontend):** Cloudflare Pages (auto-deploys from GitHub main branch)
- **Hosting (backend):** Cloudflare Workers via `wrangler deploy` from `api/`
- **Version control:** GitHub. All code lives in a git repo.

### File Structure
```
/estate-checkout/
  index.html              # Entry point (single-page app, all screens)
  manifest.json           # PWA manifest
  sw.js                   # Service worker (cache version: estate-checkout-vNN)
  /css/
    styles.css            # Single stylesheet
  /js/
    app.js                # App initialization, routing, shared header
    checkout.js           # Checkout pad logic
    sale-setup.js         # Sale configuration
    speech.js             # Speech-to-text module (parser, mic UX, guide sheet)
    qr.js                 # QR code generation and handoff screen
    scan.js               # QR scanning (BarcodeDetector + html5-qrcode fallback)
    payment.js            # Payment receive screen
    dashboard.js          # Sale dashboard (stats, filters, sort, transaction list)
    storage.js            # localStorage abstraction
    utils.js              # Shared helpers (currency, dates, escaping)
  /assets/
    icons/                # PWA icons (icon-192.svg, icon-512.svg)
  /lib/
    qrcode.min.js         # QR code library
  /api/                   # Cloudflare Worker + D1 sync API
    src/
      worker.js           # Worker entry point (sync endpoints)
    migrations/           # D1 SQL migrations (0001_init.sql, ...)
    wrangler.toml         # Worker + D1 binding config
    package.json          # wrangler scripts (dev, deploy, db:migrate)
```

### Service Worker Convention
- Cache name format: `estate-checkout-vNN` (e.g., `estate-checkout-v48`) — the project-specific shape of the baseline cache-version bump.
- All JS, CSS, HTML, and external libraries are listed in `ASSETS_TO_CACHE`.

### CSS Rules
- **Read DESIGN_SYSTEM.md before making ANY CSS changes.** That document is the authoritative spec for all visual decisions.
- Mobile-first. Default styles ARE the mobile styles.
- **Minimum 48px height for anything tappable. No exceptions.** (Stricter than the baseline's ≥48px floor — this is a hard rule, no exceptions.)
- High contrast text. Minimum 14px font size for body text, 16px for buttons.
- Number pad buttons: 48px x 48px (same as all interactive elements)
- Max 1 stylesheet file
- When adding new styles, use existing component patterns from DESIGN_SYSTEM.md §2. Do not create one-off styles.

---

## 4. DESIGN PRINCIPLES

**Read DESIGN_SYSTEM.md for the complete design system spec, token definitions, component standards, and screen-by-screen requirements.** The principles below are the summary. The design system document has the exact values.

**This app will be used by non-technical people aged 40-70 in a loud, busy, stressful environment (an estate sale). Design for that.**

- BIG buttons, BIG text, BIG touch targets (48px minimum, always)
- Minimal choices per screen — one primary action per view
- No jargon. Button says "Add Item" not "Append Entry"
- Obvious feedback — item added? Flash green. Error? Flash red. Always confirm.
- No modals or popups unless absolutely critical (confirmation of clearing all items)
- Number pad is the hero element of the checkout screen — it dominates the viewport
- The app must be usable with one hand on a phone
- Color communicates function: green = success/positive, red = destructive/negative, blue = navigation, orange = pending, gray = neutral
- No loading spinners in offline mode — everything is instant
- **Fewer unique values = better.** One height for everything interactive (48px). Buttons, inputs, numpad keys — all 48px. That's it.
- **Every value from a token.** If you need a value that doesn't exist in `:root`, add it to DESIGN_SYSTEM.md first, then to the CSS.

---

## 5. VERSION CONTROL & SCOPE

### Current Version: v0.1 — Checkout Pad MVP

**IN SCOPE for v0.1:**
- Sale setup (name, start date, discount schedule)
- Checkout pad with number pad entry, Add Item, Create Ticket
- Expandable item list with running total, savings display, and auto-applied discounts
- Speech-to-text input with hold-to-talk, parser, confirmation, guide sheet, quick-tap detection
- No-description prompt (every time, no limit)
- QR code generation for completed checkout (encodes item list + total)
- QR scan view with BarcodeDetector + html5-qrcode fallback
- Payment receive screen with Mark Paid
- Sale dashboard (stats, filter pills, sort toggle, transaction list with expand/collapse)
- Transaction statuses: pending, paid, unpaid (legacy), void with voidReason
- Edit Order flow (void + reload with same customer number)
- Shared header navigation (Dashboard, Scan Ticket, End Estate Sale)
- PWA install + offline support via service worker
- localStorage persistence (client source of truth)
- Multi-device sync via Cloudflare Worker + D1 — any device can create and edit any sale created by any device

**OUT OF SCOPE for v0.1 (do not build, do not suggest):**
- User accounts / login / authentication
- Inventory management / pre-sale cataloging
- Photo capture or image recognition
- POS integration
- Bluetooth printer support
- Analytics beyond basic totals
- Payment processing of any kind

If the user asks for something out of scope, acknowledge it, note it in BACKLOG.md, and redirect to current scope.

---

## 6. SESSION PROTOCOL

### Starting a Session
1. Read this file (CLAUDE.md)
2. Run `git log -10 --oneline` for the recent changelog
3. Read BACKLOG.md for scope and known issues
4. If doing CSS/UI work, read DESIGN_SYSTEM.md
5. Confirm with the user what you'll be working on
6. State what files you expect to touch

### During a Session
- Commit logical chunks of work with clear messages — not giant blobs
- If you hit a decision point, STOP and ask. Don't guess.
- If something is taking way longer than expected, say so
- Test as you go
- Push to GitHub when a feature or meaningful chunk is complete

### Versioning + Commits (this IS the changelog)
- Bump SW cache (`sw.js`) and the visible UI version on every meaningful change
- Commit subject format: `vNNN: <short description>` — these subjects are the session log
- For decisions worth preserving (why X over Y), use the commit body, not a separate doc
- Never commit broken code to main — keep half-done work local or on a branch

### Ending a Session
- Make sure your last commit's subject accurately summarizes the session
- Push to GitHub
- If a new out-of-scope idea came up, add it to BACKLOG.md
- That's it. No HANDOFF.md, no PM_TRACKER.md.

---

## 7. TESTING APPROACH

For the MVP, testing is manual but structured:

### Test Scenarios to Run for Every Change:
1. **Happy path:** Add 5 items via number pad, verify total, tap Create Ticket, verify QR and summary
2. **Discount test:** Set up Day 2 = 50% off, add items, verify discounted prices and savings display
3. **Speech test:** Hold 🎤 Speak, say 3 items with descriptions and prices, confirm each
4. **Error handling:** Try to add item with no price, try to Create Ticket with empty cart
5. **Offline test:** Enable airplane mode, use full checkout flow
6. **Reload test:** Add items, close browser, reopen — is the cart still there?
7. **Dashboard test:** Complete 3 checkouts, verify stats, filter pills, and sort toggle

---

## 8. COMMUNICATION STYLE

- Be direct. Say what you did, what works, what doesn't.
- Don't apologize for asking questions — questions are good.
- If you think the user is making a mistake, say so clearly but respectfully.
- Don't pad responses with filler. "Done. Here's what I built:" is fine.
- When showing code changes, show the relevant diff, not the entire file.

# CLAUDE CODE RULES — Estate Sale Checkout MVP

**Read this file at the start of EVERY session. No exceptions.**

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
- [ ] The HANDOFF.md doc is updated

---

## 3. CODE STANDARDS

### General
- Simple, readable code over clever code. Always.
- Functions do ONE thing
- Descriptive variable/function names (no abbreviations except obvious ones like `qty`, `idx`)
- Comments explain WHY, not WHAT
- No dead code. No commented-out code blocks left behind.
- Console.log debugging must be removed before marking done

### Tech Stack (DO NOT DEVIATE)
- **Frontend:** HTML, CSS, vanilla JavaScript. No frameworks. No React. No Vue. No build tools.
- **PWA:** Service worker for offline support, web app manifest
- **Speech-to-text:** Web Speech API (browser native)
- **QR codes:** `qrcode.js` library (lightweight, no dependencies)
- **Storage:** localStorage for MVP (IndexedDB only if localStorage limits are hit)
- **Hosting:** Cloudflare Pages (auto-deploys from GitHub main branch)
- **Version control:** GitHub. All code lives in a git repo.
- **No backend for v1.** Everything runs client-side.

### File Structure
```
/estate-checkout/
  index.html              # Entry point
  manifest.json           # PWA manifest
  sw.js                   # Service worker
  /css/
    styles.css            # Single stylesheet
  /js/
    app.js                # App initialization, routing
    checkout.js           # Checkout pad logic
    sale-setup.js         # Sale configuration
    speech.js             # Speech-to-text module
    qr.js                 # QR code generation
    storage.js            # localStorage abstraction
    utils.js              # Shared helpers
  /assets/
    icons/                # PWA icons
  /lib/
    qrcode.min.js         # QR code library
```

### CSS Rules
- Mobile-first. Default styles ARE the mobile styles.
- No CSS frameworks. No Tailwind. No Bootstrap.
- Large touch targets: minimum 48px height for anything tappable
- High contrast text. Minimum 16px font size for body text.
- Number pad buttons: minimum 64px x 64px
- Use CSS custom properties (variables) for colors and spacing
- Max 1 stylesheet file

---

## 4. DESIGN PRINCIPLES

**This app will be used by non-technical people aged 40-70 in a loud, busy, stressful environment (an estate sale). Design for that.**

- BIG buttons, BIG text, BIG touch targets
- Minimal choices per screen — one primary action per view
- No jargon. Button says "Add Item" not "Append Entry"
- Obvious feedback — item added? Flash green. Error? Flash red. Always confirm.
- No modals or popups unless absolutely critical (confirmation of clearing all items)
- Number pad is the hero element of the checkout screen — it dominates the viewport
- The app must be usable with one hand on a phone
- Color is used for function, not decoration (green = success, red = warning/delete)
- No loading spinners in offline mode — everything is instant

---

## 5. VERSION CONTROL & SCOPE

### Current Version: v0.1 — Checkout Pad MVP

**IN SCOPE for v0.1:**
- Sale setup (name, dates, discount schedule)
- Checkout pad with number pad entry
- Item list with running total and auto-applied discounts
- Speech-to-text input (additive to number pad, not required)
- QR code generation for completed checkout (encodes item list + total)
- QR scan view for receiving employee
- Basic sale summary/dashboard (transaction count, total revenue)
- PWA install + offline support
- localStorage persistence

**OUT OF SCOPE for v0.1 (do not build, do not suggest):**
- User accounts / login / authentication
- Cloud sync or any backend
- Inventory management / pre-sale cataloging
- Photo capture or image recognition
- POS integration
- Bluetooth printer support
- Multi-user / multi-device sync
- Analytics beyond basic totals
- Payment processing of any kind

If the user asks for something out of scope, acknowledge it, note it in BACKLOG.md, and redirect to current scope.

---

## 6. SESSION PROTOCOL

### Starting a Session
1. Read this file (CLAUDE_CODE_RULES.md)
2. Read HANDOFF.md for current state
3. Read BACKLOG.md for known issues
4. Confirm with the user what you'll be working on this session
5. State what files you expect to touch

### During a Session
- Commit logical chunks of work with clear commit messages — not giant blobs
- If you hit a decision point, STOP and ask. Don't guess.
- If something is taking way longer than expected, say so
- Test as you go — don't build 5 features then test
- Push to GitHub when a feature or meaningful chunk is complete

### Git Rules
- First session: initialize a git repo, set up the project structure, make an initial commit
- Commit messages should be descriptive: "Add checkout pad number entry" not "update files"
- Commit after each completed feature or logical chunk of work
- Push to GitHub at the end of every session at minimum
- Never commit broken code to main — if something is half-done, say so and keep it local or use a branch

### Ending a Session — MANDATORY HANDOFF
Before the session ends, you MUST update HANDOFF.md with:
1. **What was accomplished** — specific features/fixes completed
2. **Current state** — what works, what's broken, what's half-done
3. **Files changed** — list every file modified or created
4. **Next steps** — what should be done next, in priority order
5. **Open questions** — anything unresolved that needs a decision
6. **Known bugs** — anything broken that you're aware of
7. **How to test** — specific steps to verify what was built

**Do not end a session without updating HANDOFF.md. This is non-negotiable.**

---

## 7. TESTING APPROACH

For the MVP, testing is manual but structured:

### Test Scenarios to Run for Every Change:
1. **Happy path:** Add 5 items, verify total, generate QR, scan QR
2. **Discount test:** Set up Day 2 = 50% off, add items, verify discounted prices
3. **Speech test:** Use voice to add 3 items with descriptions and prices
4. **Error handling:** Try to add item with no price, try to generate QR with empty cart
5. **Offline test:** Enable airplane mode, use full checkout flow
6. **Reload test:** Add items, close browser, reopen — is the cart still there?

---

## 8. COMMUNICATION STYLE

- Be direct. Say what you did, what works, what doesn't.
- Don't apologize for asking questions — questions are good.
- If you think the user is making a mistake, say so clearly but respectfully.
- Don't pad responses with filler. "Done. Here's what I built:" is fine.
- When showing code changes, show the relevant diff, not the entire file.

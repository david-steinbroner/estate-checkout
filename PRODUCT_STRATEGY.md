# PRODUCT STRATEGY & LAUNCH PLAN — Estate Checkout

**Last updated:** 2026-03-04
**Status:** Pre-launch (v0.1 feature-complete — discounts, multi-worker, multi-day, UI cleanup all shipped; entering end-to-end testing)

> **How to read this document:** Strategic positions in this document are framed as hypotheses informed by competitive research (see MARKET_INTEL.md). They will be validated, adjusted, or discarded based on real user feedback from field tests and our estate sale operator network. Nothing here is sacred — but the research gives us a strong starting point and a clear thesis about where the opportunity is.

---

## 1. What This Is

Estate Checkout is a mobile-first Progressive Web App that replaces the printing calculator, paper tickets, and manual discount math at estate sale checkouts. A checkout worker enters item prices by tapping a number pad or speaking them aloud. The app auto-applies day-based discounts, generates a QR code as a digital ticket, and lets the payment worker scan it to confirm payment. A live dashboard gives the sale operator revenue and transaction data they've never had before.

### Why It Matters

Estate sales are a multi-billion dollar industry in the US, and the checkout process hasn't changed in decades. Every sale uses the same manual system: printing calculator, hand-written tickets, mental math for discounts. This creates 5–10 minute waits per customer, hour-long lines, pricing errors, and lost sales when frustrated buyers walk out. The operators know it's slow — they just don't have an alternative that's simple enough for their workers to use.

### Why We Win

**Hypothesis (supported by competitive research — see MARKET_INTEL.md §2–3):** The competitive advantage isn't features — it's simplicity and speed. Every existing solution in this market (PROSALE, SimpleConsign, Aravenda, StickerPrice) fails the same way: they ask operators to do significant pre-sale work (inventory, barcoding, stickering) and commit to complex systems before getting any value. Our research shows that the real competitor isn't these platforms — it's the adding machine. A printing calculator costs $15, requires zero setup, works without internet, and every estate sale worker in America already knows how to use it. If we can't beat the adding machine on speed and simplicity, nothing else matters.

Estate sale workers are typically 40–70 years old (average operator age: 58–59 per EstateSales.NET surveys), non-technical, and get 2 minutes of training at most. They didn't ask for this app and don't trust technology. If the app is even slightly confusing or slower than the adding machine, they'll abandon it mid-sale. Every design decision optimizes for zero-instruction usability and sub-3-second item entry. There is no login, no account creation, no internet requirement, and no learning curve beyond "type the price and tap Add Item."

### Strategic Guardrail: Don't Become What We're Replacing

Our market research reveals a clear pattern: every tool in this space that tries to become a full business management platform ends up too complex for the actual checkout use case. PROSALE requires pre-barcoding every item. SimpleConsign is designed for permanent retail stores. Aravenda costs $289–$559/month and requires Shopify integration — and a deeper analysis of their website (see MARKET_INTEL.md §2) confirms they have no estate sale checkout story at all; their FAQ, videos, and marketing are 100% consignment/inventory focused. These products serve real needs — but they serve operators who want to digitize their entire business, not operators who just want a faster checkout.

**Our thesis is that there's a massive gap between "the adding machine" and "a full management platform" — and nobody is filling it.** We fill it by staying radically simple. The moment we start asking operators to build inventories, create accounts, or learn complex workflows, we become another tool they'll evaluate and reject. This guardrail should inform every roadmap decision: if a feature adds complexity to the checkout experience without a direct speed or usability payoff, it doesn't belong in the core product.

_This hypothesis will be tested directly in field tests. If operators consistently ask for inventory management or more comprehensive features, we'll adjust. But we won't add complexity preemptively._

---

## 2. Target Users

**Primary: Checkout workers** — The person standing at a table in a crowded house, ringing up items. Age 40–70, using their personal phone or a provided tablet. Working in noise, on their feet, often with a line of impatient customers. This person's experience is the product. If they can't use it instantly, nothing else matters.

**Hypothesis (see MARKET_INTEL.md §4):** The operator (owner) decides to adopt, but the worker (checkout person) decides if it actually gets used. Both must be convinced — but the worker's experience is the gating factor. A checkout worker who can't figure out the app in the first 30 seconds will go back to the calculator, and the operator will never use the app again.

**Secondary: Sale operators/owners** — The person who runs the estate sale company. They set up the sale, manage workers, and care about revenue data. They're the buyer — the one who decides whether to adopt the app. They need to see that it makes their operation faster and gives them data they didn't have before.

**Tertiary: Payment workers** — The person at the POS (Square, Clover). They scan the QR code, see the total, punch it into their existing POS, and tap Mark Paid. Their interaction is minimal by design.

**Important framing (see MARKET_INTEL.md §3):** We sit between the checkout step and the payment step. Square and Clover own the payment step — they are not our competitors, they are our complement. We replace the adding machine, not the POS. This distinction matters for positioning, partnerships, and product scope.

---

## 3. UX/UI Design System & Product Design

### The Problem

The current v0.1 build has inconsistent design across screens — different visual patterns, inconsistent spacing, mixed interaction models. This isn't just an aesthetic issue. For our target user (58-year-old operator, 2 minutes of training, standing in a crowded house), visual inconsistency creates cognitive load that directly translates to confusion and abandonment.

**Hypothesis (see MARKET_INTEL.md §1, §7):** Our competitive research shows that the #1 and #2 risks are "workers find it slower than the adding machine" and "workers can't figure it out without extensive training." Both of these are UX problems, not feature problems. StickerPrice has the right idea (QR-based checkout) but gets negative reviews because the UX is clunky — tiny QR stickers that are hard to scan, workflows that aren't intuitive. We can't afford the same mistake. If the app *feels* complicated — even if it technically isn't — we lose.

### Design Principles

These principles are derived from what we know about the target user and the competitive landscape. They should guide every screen, interaction, and visual decision:

**1. One screen, one job.** Every screen should have a single, obvious purpose. The checkout screen adds items. The payment screen confirms payment. The dashboard shows data. No screen should try to do two things. If a user has to think about what a screen is for, it's wrong.

**2. Big targets, big text.** Workers are standing, often in poor lighting, holding a phone in one hand. Touch targets must be large enough to hit without precision. Text must be readable at arm's length. The number pad keys should feel like physical calculator buttons — impossible to miss.

**3. Immediate feedback.** Every action gets instant visual and/or haptic confirmation. Item added? It appears in the list with a brief animation. Price spoken? It echoes on screen before confirming. Payment marked? The screen changes state clearly. No loading spinners, no ambiguous states.

**4. Progressive disclosure.** Show only what the worker needs right now. Settings, history, export, advanced features — these exist but stay out of the way. The checkout worker should never see a button they don't need during active checkout.

**5. Familiar patterns.** The app should feel like a calculator, not like software. The number pad is the anchor. The flow is linear: enter price → add item → next item → finish → QR code. No branching, no modals interrupting the flow, no decisions that aren't about the current item.

**6. Forgiving interaction.** Easy to undo, hard to break. Removing an item from the cart should be one gesture. Accidentally closing the app shouldn't lose the current transaction. There is no destructive action that can't be reversed.

### Design System (Complete — see DESIGN_SYSTEM.md)

The app has a unified design system implemented across all screens. This was completed as a 10-prompt implementation sequence before any external user testing. The full spec lives in DESIGN_SYSTEM.md.

**What was built:**

**Token system:** All visual values (colors, spacing, typography, radii, shadows, transitions, component heights) defined as CSS custom properties in `:root`. No hardcoded values outside the token system. A 7-tier spacing scale, semantic color tokens, and a single universal interactive element height (48px) for all buttons, inputs, and touch targets.

**Component library:** Four button color variants (Primary/Success/Danger/Neutral) at a single 48px height. Standardized inputs with consistent focus states. Status badges as pills with semantic colors. Bottom sheet overlays as the universal pattern for secondary content (item list, confirmations, speech guide, settings).

**Item list UX:** The checkout screen's item list was redesigned from an in-place expand/collapse pattern to a bottom sheet overlay with inline preview. The last 2-3 items always stay visible in a compact preview strip. Tapping opens a full-screen bottom sheet with all items, remove buttons, and item count. Items are numbered (e.g., "1. Book $12.00" or "2. No description $12.00"). An inline "Added!" flash animation confirms each new item on the row itself.

**Numpad:** Keys sized at 48px to match the universal interactive height. The numpad dominates the checkout screen through CSS grid allocation (visual prominence via space, not oversized keys).

**Screen-by-screen consistency:** Every screen rebuilt to the design system — checkout, setup, payment, dashboard, QR, scan, onboarding. All touch targets meet the 48px minimum. All disabled states, focus rings, and transitions are consistent.

_Field testing will tell us where we're right and where we're wrong — especially around touch target sizes, text readability in real sale environments, and the checkout flow pacing. We expect to iterate on the design after real-world observation._

---

## 4. Technical Architecture

### Stack
- **Frontend:** Vanilla JavaScript (no frameworks), HTML, CSS
- **Storage:** localStorage (all data lives on-device)
- **Backend:** None. Zero server dependencies.
- **PWA:** Service worker with cache-first strategy for full offline support
- **QR:** qrcode.js for generation, native BarcodeDetector + html5-qrcode fallback for scanning
- **Speech:** Web Speech API (browser-native, no third-party services)
- **Hosting:** Cloudflare Pages (static site, auto-deploys from GitHub)

### Why This Stack

**Hypothesis (see MARKET_INTEL.md §1):** No backend means no accounts, no auth, no server costs, no downtime, and — critically — no internet requirement. Our research confirms that estate sales happen in residential homes where WiFi and cell signal are unreliable — operators rely on mobile hotspots when they have connectivity at all. The app must work in airplane mode. This isn't a nice-to-have; it's a hard requirement that immediately differentiates us from every cloud-based competitor (PROSALE, SimpleConsign, Aravenda are all cloud-dependent).

localStorage is sufficient for single-sale data. If we need data persistence across sales in the future, the approach should be invisible backup (not "create an account and log in") — see Version Roadmap for more on this.

### Module Structure
11 JS modules: app (routing/orchestration), checkout (number pad and item entry), speech (voice input and parser), qr (QR generation and handoff), scan (QR scanning), payment (payment receive and confirmation), dashboard (stats and transaction management), sale-setup (sale configuration), onboarding (first-run walkthrough), storage (localStorage abstraction), utils (shared helpers).

### Device & Browser Requirements
- **Minimum:** Any smartphone or tablet with a modern browser (Chrome 80+, Safari 14+)
- **Recommended:** Phone or tablet with rear camera (for QR scanning) and microphone (for speech input)
- **Tested on:** Mobile Chrome (Android), Mobile Safari (iOS) — formal test pass pending
- **Screen sizes:** Designed for 375px width and up; usable on tablets
- **No desktop optimization** — this is a standing-in-a-house, phone-in-hand tool

---

## 5. Infrastructure & Deployment

### Source Code
- **Repository:** https://github.com/david-steinbroner/estate-checkout (private)
- **Branch strategy:** Single `main` branch. All work merges directly to main.

### Hosting
- **Platform:** Cloudflare Pages
- **URL:** estate-checkout.pages.dev (will move to custom domain before public launch)
- **Deployment:** Auto-deploys on every push to `main`. No build step — static files served directly.
- **Cost:** Free tier (Cloudflare Pages has generous free limits for static sites)

### Deployment Flow
1. Claude Code builds features locally, commits to GitHub
2. Human pulls, tests locally (`python3 -m http.server 8000`)
3. Tests on phone over local network (`http://192.168.x.x:8000`)
4. When ready, pushes to `main`
5. Cloudflare Pages auto-deploys within ~60 seconds
6. Verify on estate-checkout.pages.dev

### Service Worker & Caching
Cache version is manually bumped each session (currently v63+). On deploy, returning users get the new version on their next app load. Cache-first strategy means the app works offline after first load, but users may need to refresh once to pick up updates. There is no update notification yet — this is a known gap for when the app is in active use by real operators.

---

## 6. Release Strategy

### Phase 1: Design System Overhaul + Testing (Current — March 2026)
**Goal:** Unify the app's UX/UI into a cohesive, polished, trustworthy design system BEFORE any external user touches it. Then validate through end-to-end testing.

**Why this came first:** Our competitive research (MARKET_INTEL.md §1, §7) shows that the target user is 58–59 years old, has been doing estate sales for 15 years with an adding machine, and will abandon any tool that feels confusing or "like software." A UX audit of the pre-overhaul build found 32% of touch targets below mobile accessibility minimums, 38% of design values hardcoded outside the token system, 8 different button heights across screens, and inconsistent visual patterns. First impressions matter — we get one shot with each operator in Alissa's network.

- [x] Complete design system spec (see DESIGN_SYSTEM.md)
- [x] Token system: all colors, spacing, typography, and component sizes defined as CSS variables
- [x] Component library: buttons, inputs, cards, status badges, bottom sheets rebuilt to unified standards
- [x] Screen-by-screen rebuild to design system (checkout, setup, payment, dashboard, QR, scan, onboarding)
- [x] Touch target compliance: every interactive element ≥ 48px
- [x] Visual consistency audit: one button height, one input height, consistent bottom sheets across all screens
- [ ] End-to-end test pass on mobile Chrome (Android) and mobile Safari (iOS)
- [ ] Offline test in airplane mode (full checkout flow without connectivity)
- [ ] Alissa's independent walkthrough (can she set up a sale and check out items with zero instruction?)

**Exit criteria:** App looks and feels like one cohesive product. All touch targets meet 48px minimum. All design values use CSS variables. Alissa can complete the full flow without asking for help. No visual inconsistencies between screens.

### Phase 2: Field Test (Target: April 2026)
**Goal:** Validate the app at a real estate sale with real customers and real pressure.

- Alissa connects us with an estate sale operator willing to try the app at one sale
- We attend the sale, set up the app, and shadow the checkout worker
- The worker uses Estate Checkout alongside (not instead of) their existing system for the first sale
- We observe: speed, confusion points, errors, worker feedback, customer reactions
- We collect: actual cart sizes, speech-to-text reliability in noisy environments, QR scan success rate, offline behavior

**What we're testing:**
- Can a worker use it with 2 minutes of training?
- Is it actually faster than the adding machine for price-only entry?
- Does the QR handoff work smoothly between two people?
- What breaks in the real world that didn't break in testing?

**What we're also testing (design & UX):**
- Does the app *feel* simple or does it *feel* like software?
- Where do workers hesitate, squint, or tap the wrong thing?
- Is the number pad responsive enough for fast entry?
- Do workers understand the flow without being told what comes next?

**Exit criteria:** One successful field test where the app doesn't block or slow down checkout. Worker and operator feedback is neutral-to-positive. Critical bugs identified and fixed.

### Phase 3: Soft Launch (Target: May–June 2026)
**Goal:** Get 3–5 estate sale operators in Austin using the app at real sales without us present.

- Recruit through Alissa's network and Austin estate sale community
- Provide a custom domain (e.g., estatecheckout.com) and a simple landing page
- Operators install as PWA on their devices
- We provide lightweight onboarding (the in-app walkthrough plus a 1-page "Getting Started" PDF or page)
- We collect feedback after each sale via text/email check-in
- Fix issues as they surface; iterate based on real feedback

**Exit criteria:** 3+ operators have used the app at 3+ sales. Core flow is stable. We have a clear picture of what v0.2 needs to be.

### Phase 4: Public Launch (Target: Summer 2026)
**Goal:** Make Estate Checkout available to any estate sale operator who wants it.

- Landing page with clear value prop, screenshots, and "Add to Home Screen" install instructions
- Listing or mention on estate sale community sites and forums (EstateSales.net, Facebook groups, local estate sale associations)
- Free to use (no paywall — growth over revenue at this stage)
- Consider whether to pursue App Store / Play Store distribution (see Section 8)

---

## 7. Website & Landing Page

### What We Need (for Soft Launch)
A single-page site at a custom domain (e.g., estatecheckout.com) with:
- Clear headline: what the app does in one sentence
- 3–4 screenshots or a short demo video showing the checkout flow
- "How to Install" section with step-by-step PWA install instructions for iPhone and Android
- A way to contact us (email, simple form) for support or feedback
- Link to the app itself

This can be a static page hosted on Cloudflare Pages alongside the app, or a separate simple site. No CMS, no blog, no complex infrastructure needed at this stage.

**Hypothesis on messaging (see MARKET_INTEL.md §3):** Our one-line positioning is: **"The fastest way to check out customers at an estate sale. Free. Works offline. No setup."** This directly attacks the adding machine's strengths (free, no setup) while promising the one thing it can't deliver (speed). Every word on the landing page should reinforce this — not feature-list the app, but promise speed and simplicity.

### What We Need (for Public Launch)
Everything above, plus:
- Social proof (quotes or short testimonials from field test operators)
- A "Getting Started" guide or FAQ
- Possibly a short video walkthrough (60–90 seconds)

### Domain
- Register a clean domain (estatecheckout.com, or similar)
- Point it to Cloudflare Pages
- The app itself can live at app.estatecheckout.com or estatecheckout.com/app

---

## 8. Native App Strategy (PWA vs. App Store)

### Current Approach: PWA Only
The app is a Progressive Web App. Users "install" it by adding it to their home screen from the browser. This gives them an app-like icon, full-screen experience, and offline support — no App Store required.

### Why PWA First
- No app review process or approval delays
- No developer account fees ($99/year Apple, $25 one-time Google)
- Instant updates — push to main, everyone gets the new version
- Works on any device with a browser
- Simpler for our current stage (testing and iteration speed matters more than distribution)

### PWA Limitations
- iOS Safari has PWA quirks (no push notifications, occasional cache issues, subtle behavioral differences)
- "Add to Home Screen" is unfamiliar to non-technical users — we'll need clear install instructions
- No App Store presence means no organic discovery through store search
- Some users (especially older demographics) may not trust a "website" the way they trust an "app from the App Store"

**Hypothesis (see MARKET_INTEL.md §1):** Given that the average operator age is 58–59, App Store trust may matter more than we think. This is something to test in field conversations — do operators ask "is this in the App Store?" and does the answer affect their willingness to try it?

### Future: App Store Distribution
If the app gains traction and we want broader distribution, we can wrap the PWA in a native shell:
- **Android:** TWA (Trusted Web Activity) — wraps the PWA in a Play Store listing with minimal native code
- **iOS:** WKWebView wrapper via Capacitor or similar — packages the PWA as a native app for the App Store
- **Timeline:** Only worth the overhead if we have proven demand and the PWA limitations are actually blocking adoption.
- **Cost:** Apple Developer Program ($99/year), Google Play Console ($25 one-time), plus the engineering time to package, test, and maintain the wrapper

---

## 9. Engagement & Adoption

### How Operators Find Us

**Hypothesis (see MARKET_INTEL.md §5–6):** Estate sale operators in Austin are a tight community. Word of mouth is the primary channel. Our research shows that 82–85% of operators use EstateSales.NET, and Instagram usage is growing (42% in 2021, rising). But for Phase 2–3, Alissa's personal network is the distribution channel. A single enthusiastic operator can drive 5–10 referrals in this industry.

**Phase 2–3 (Field Test / Soft Launch):**
- Alissa's personal network and introductions
- Direct outreach to Austin-area estate sale companies
- Demo at a local estate sale association meeting or meetup, if one exists

**Phase 4 (Public Launch):**
- Landing page with SEO basics (target: "estate sale checkout app", "estate sale POS alternative")
- Posts in estate sale operator Facebook groups and forums
- Listing or ad on EstateSales.net (the dominant listing platform — reaches 82% of operators)
- Possible partnership or feature with estate sale associations
- Content marketing: "How to speed up your estate sale checkout" blog post or video targeting operators searching for solutions

### Natural Referral Moment

**Hypothesis (see MARKET_INTEL.md §6):** The best referral moment is during a sale, when another operator or a customer sees the QR code handoff and asks "what is that?" The product itself should trigger this moment naturally. The QR code screen, the payment receive screen, and any digital receipt should include a subtle "Powered by Estate Checkout" watermark or link. This is free distribution built into the product experience.

### How Operators Adopt
1. Operator hears about the app (word of mouth, landing page, demo)
2. Visits the website, sees screenshots and value prop
3. Installs as PWA on their phone ("Add to Home Screen")
4. Runs through the in-app onboarding (30 seconds)
5. Sets up a test sale to try the flow
6. Uses it at their next real sale (ideally alongside their existing system the first time)
7. If it works, they switch over and tell other operators

### Retention & Engagement
Estate sales are event-based (typically 2–3 day sales, a few times per month). The app doesn't need daily engagement — it needs to be reliable and fast every time it's opened. Retention means the operator chooses to use it at their next sale instead of going back to the adding machine.

There are no push notifications, no drip emails, no engagement loops. The product retains users by being better than the alternative every time they use it.

---

## 10. Support Model

### During Field Test (Phase 2)
- We are physically present at the sale
- Real-time bug fixing and support
- Direct feedback collection from the worker and operator

### During Soft Launch (Phase 3)
- Lightweight: text or email check-in after each sale
- We respond to questions and bug reports within 24 hours
- No formal ticketing system — the user base is 3–5 operators
- Known issues and fixes tracked in BACKLOG.md and HANDOFF.md

### At Public Launch (Phase 4)
- FAQ / troubleshooting page on the website
- Contact email for support requests
- Consider a simple feedback form in the app ("Report a Problem" link on the Setup or Dashboard screen)
- No phone support, no chat support — keep it lean until scale demands it
- If we see the same questions repeatedly, we build the answer into the app (better onboarding, clearer labels, in-context help)

### Common Support Scenarios to Plan For
- "The app isn't updating" → Service worker cache issue. Need a "Check for Updates" mechanism or clear instructions for clearing cache.
- "I lost my sale data" → localStorage was cleared (browser settings, private browsing, device storage pressure). No recovery path in v0.1. Invisible backup is on the roadmap.
- "The QR code won't scan" → Lighting, distance, screen brightness, camera permissions. Need troubleshooting guidance.
- "Speech isn't working" → Microphone permissions, ambient noise, browser support. The app already has progressive failure tips built in.
- "How do I install it?" → PWA install is unfamiliar. Need crystal-clear instructions for both iPhone and Android.

---

## 11. Version Roadmap

> **Roadmap philosophy:** Every version should make the checkout experience faster, simpler, or more reliable. We do not add features that increase the operator's pre-sale setup burden or make the checkout worker's job more complex. Our competitive research (MARKET_INTEL.md §2) shows clearly that setup burden and complexity are why operators reject existing tools. We stay in the checkout lane.
>
> **All roadmap items beyond v0.1 are hypotheses.** They represent our best current thinking based on competitive research and user understanding. Real field test feedback will reprioritize, reshape, or remove items. The roadmap is a living document, not a commitment.

### v0.1 — Checkout Pad MVP + Design System (Current — Testing Phase)
Replace the printing calculator. Prove the core flow works at a real estate sale. **Ship with a polished, unified design — not a prototype.**

**Core features (built):**
- Number pad and speech item entry
- Auto-applied day-based discounts with configurable per-day schedule
- Item-level haggle discounts (new price / $ off / % off) stacking on day discount
- Ticket-level discounts (% off or $ off entire ticket) with expandable total bar showing full breakdown
- QR code handoff to payment worker with customer-facing ticket page
- Order naming (optional names or auto-numbered "Order #1")
- Multi-day sale flow (End Day → Resume Sale → End Sale; sale states: active/paused/ended)
- Shared sale / multi-worker join (Share Sale QR + code, independent transaction tracking per device)
- Basic dashboard with revenue data and filtering (All/Pending/Paid/Void with sort toggle)
- Offline-capable PWA
- Item list with bottom sheet overlay, inline preview, item numbering, tap-to-haggle, and inline "Added!" flash
- First-run onboarding walkthrough (3 cards, replayable from "How It Works")
- Collapsed header with ☰ menu (Dashboard, Scan Ticket, Share Sale, End Day, End Sale) — consistent across all active-sale screens

**Design system (complete — see DESIGN_SYSTEM.md):**
- Unified token system (colors, 7-tier spacing, typography, radii, component heights)
- Component library: 4 button variants at universal 48px height, standardized inputs, bottom sheets, status badge pills
- Screen-by-screen consistency pass across all 7 screens
- Touch target compliance (every interactive element ≥ 48px)
- Visual identity that feels like a fast calculator, not software

**Remaining before ship:** End-to-end testing on mobile Chrome and Safari, offline airplane mode test, Alissa's independent walkthrough. All features are implemented — this is now a testing and polish phase.

- **Ship target:** After testing + field test (April 2026)

### v0.2 — Field Test Fixes
Address the top problems and requests from real-world testing. Scope is entirely driven by what we learn in field tests — not predetermined.

**Likely candidates (subject to field test feedback):**
- One-person checkout flow shortcut (skip QR, mark paid directly)
- CSV export of sale data
- Dashboard search and date range filtering
- Larger QR codes or alternative handoff for 50+ item carts
- Worker discount limits (maxDiscountPercent — placeholder already in data model)

### v0.3 — Adjacent Segments: Vintage Markets & Multi-Vendor Sales

**Hypothesis (see MARKET_INTEL.md §4):** The same checkout pain exists at vintage markets, flea markets, pop-up shops, and multi-vendor events — and these segments are directly adjacent to estate sales. Alissa operates in both worlds. The Austin vintage market scene (Austin Flea, Blue Genie Art Bazaar, Round Top/Warrenton vendors) is large, interconnected with estate sales, and has the same manual checkout problem. Expanding to these segments keeps us in our core lane (fast checkout) while growing the addressable market significantly.

**What this version might include:**
- Multi-vendor support (track sales by vendor/booth within a single event)
- Flexible discount schedules (time-based, category-based — not just day-based)
- Vendor payout reporting (split revenue between market organizer and vendors)
- Possibly a "market organizer" mode where one device manages multiple vendors

**What this version does NOT include:** Inventory management, item catalogs, pre-sale setup workflows, or anything that requires operators to do significant work before the sale starts. We stay in the checkout lane.

_This expansion hypothesis will be informed by what we learn in v0.1/v0.2 field tests and by Alissa's conversations with vintage market vendors. If the adjacent segments don't show the same pain or the same adoption willingness, we'll adjust._

### v0.4 — Broader Event Types

**Hypothesis (see MARKET_INTEL.md §4):** Charity sales, church rummage sales, school fundraisers, and garage/yard sales all share a version of the checkout pain — and some (charity sales in particular) look operationally identical to estate sales. These segments have additional needs (multi-station support for large events, volunteer-friendly simplicity, reporting for tax/donation purposes) that build naturally on the core product.

**What this version might include:**
- Multi-station support (several checkout devices at one event, shared totals)
- Even simpler onboarding for volunteer checkout workers (zero-training mode)
- Reporting features useful for nonprofits (revenue tracking for donors, tax documentation)
- Simplified garage sale mode (no discount schedule, multi-seller tracking, change calculator)

### v1.0 — The Best Checkout Tool for Any Pop-Up Sale

**Hypothesis:** If we've validated the core product with estate sale operators, expanded to adjacent segments, and have a growing user base — v1.0 is about reliability, polish, and removing the last friction points. It is NOT about becoming a business management platform.

**What v1.0 looks like:**
- Invisible cloud backup (sale data syncs automatically — no account creation, no login screen, no "sign up to save your data" gate). Implementation TBD — could be device-linked, could be a simple optional email backup. The key requirement is that it adds zero friction to the checkout experience.
- POS integration (Square API — skip manual total entry at the payment step). This is the one integration that directly speeds up the checkout-to-payment handoff and is complementary to our position (see MARKET_INTEL.md §3 on Square as complement, not competitor).
- App Store / Play Store distribution (only if PWA limitations are actually blocking adoption — see §8).
- Customer-facing digital receipt (text or email — eliminates the paper ticket entirely).
- Polished analytics (revenue trends across sales, popular price points) — but framed as "see how your sales are going" not "business intelligence dashboard." Simple, visual, glanceable.

**What v1.0 does NOT look like:**
- User accounts with login screens
- Multi-company SaaS management
- Inventory or item catalog systems
- Complex analytics or reporting dashboards
- Any feature that makes the checkout worker's screen more complicated

_The entire v1.0 scope is a hypothesis. By the time we get here, we'll have months of real-world data and direct operator feedback telling us what actually matters. This roadmap will look different then — and that's the plan._

---

## 12. Business Model (Future — Not v0.1)

v0.1 is free. No paywall, no freemium, no trial. The goal is learning and validation, not revenue.

**Hypothesis on monetization (see MARKET_INTEL.md §4):** Our competitive research shows that estate sale operators have high pricing sensitivity — most are small businesses, and their current "checkout tool" (the adding machine) costs $15 one-time. Asking operators to pay a monthly subscription for a checkout calculator is a hard sell in the core segment.

However, the adjacent and expansion segments may have different willingness to pay:
- **Market organizers** running multi-vendor events have a business need for vendor payout tracking and consolidated reporting — this is a feature they'd pay for.
- **Charity and nonprofit events** often have budgets for event management tools and need reporting for donors and tax purposes.
- **High-volume operators** (30+ sales/year) may value analytics and data export enough to pay a modest fee — once they're already dependent on the core product.

**Possible models (all speculative — to be validated):**
- **Free core, paid expansion features:** Checkout is always free. Multi-vendor management, payout reporting, analytics export, and multi-station support are paid tiers. This keeps the core product frictionless and monetizes the segments with higher willingness to pay.
- **Per-event fee for premium features:** Small fee per event when using advanced features (multi-vendor, multi-station). No subscription commitment — aligns with the event-based usage pattern.
- **Freemium by volume:** Free up to X sales per month, paid above that. Targets high-volume operators who are getting the most value.

**What we will NOT do:** Put a paywall on the core checkout experience. That would immediately negate our primary competitive advantage ("free, no setup") and push operators back to the adding machine. The core checkout must stay free to drive adoption and word-of-mouth in a market where the alternative costs nothing.

_The right model depends entirely on what we learn from field testing and soft launch. We don't need to decide this until we have operators who are actively using and relying on the app._

---

## 13. Key Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Workers find it slower than the adding machine | Fatal — app gets abandoned mid-sale | Speed is the #1 design priority. Field test will validate. See MARKET_INTEL.md §2 on why this is the only metric that matters against our real competitor. |
| Workers can't figure it out without extensive training | Fatal — operators won't adopt | Zero-instruction usability is the north star. Design system overhaul (§3) addresses this directly. Alissa's independent test is the first gate. |
| The app *feels* complicated even if it isn't | High — creates the same adoption barrier as PROSALE/SimpleConsign | Design system (§3) is the primary mitigation. Field test UX observation will surface this. See MARKET_INTEL.md §7 on the onboarding challenge for this demographic. |
| We add too many features and become another complex platform | High — we lose our positioning and become what we're replacing | Strategic guardrail (§1). Every feature evaluated against "does this make checkout faster or simpler?" Roadmap stays in the checkout lane. |
| QR codes don't scan reliably in real conditions | High — breaks the two-person workflow | BarcodeDetector + html5-qrcode fallback. Field test will expose real-world scan issues. |
| Speech-to-text fails in noisy estate sale environments | Medium — voice is a bonus, not the only input | Number pad is the primary input. Speech is additive. Progressive failure tips guide users to the pad. |
| localStorage data loss (browser clear, device issue) | Medium — operator loses sale data mid-sale | Acknowledged limitation for v0.1. Invisible backup on the v1.0 roadmap. |
| iOS Safari PWA quirks | Medium — inconsistent experience on iPhones | Test pass on Safari is a pre-ship gate. Known iOS PWA issues documented and worked around. |
| No organic discovery without App Store presence | Low (for now) — limits growth | PWA-first is right for this stage. App Store is on the roadmap only if PWA limitations block adoption. |
| Market too small or operators unwilling to change | Strategic risk | Alissa's discovery conversations will validate. Adjacent segments (vintage markets, charity sales) significantly expand TAM if estate sales alone are too small. See MARKET_INTEL.md §4. |

---

## 14. Success Metrics

### Field Test (Phase 2)
- Worker can ring up a customer without asking for help
- Average item entry time ≤ 3 seconds (matching or beating the adding machine)
- Zero checkout-blocking bugs during the sale
- Operator says they'd use it again
- **New:** Worker doesn't hesitate or express confusion navigating between screens
- **New:** No "what does this button do?" moments observed during active checkout

### Soft Launch (Phase 3)
- 3+ operators using the app at real sales
- Operators continue using it sale after sale (not reverting to adding machine)
- Average setup time < 2 minutes for a returning operator
- Bug reports are edge cases, not core flow failures
- **New:** Operators describe the app as "simple" or "easy" unprompted (language matters — if they say "it works" that's good, but "it's simple" means we've nailed the positioning)

### Public Launch (Phase 4)
- 20+ operators in Austin using the app regularly
- Positive word-of-mouth referrals (operators telling other operators)
- Landing page converting visitors to installs at a meaningful rate
- Support volume is manageable without dedicated staff
- **New:** At least one organic referral from the in-sale QR code watermark ("I saw it at another sale")

---

## Revision History

| Date | What Changed |
|------|-------------|
| 2026-03-04 | Updated to reflect discount system, multi-worker support, multi-day sale flow, and UI cleanup (header collapse, expandable total). v0.1 feature list expanded. v0.2 candidates pruned (haggle discounts and edit items now in v0.1). Service worker version updated to v63+. |
| 2026-03-03 | Updated to reflect design system completion. §3 rewritten from aspirational spec to documentation of what was built (token system, component library, item list UX, numpad sizing). Phase 1 checklist updated with design items checked off. v0.1 roadmap section updated with complete feature list. Service worker version updated to v57. Strategic guardrail strengthened with Aravenda analysis findings. |
| 2026-03-03 | Major revision — aligned strategy with MARKET_INTEL.md competitive research. Added UX/design system section (§3). Reframed roadmap: removed pre-sale inventory from v0.3 (replaced with adjacent segment expansion), reframed v1.0 away from SaaS platform toward checkout excellence. Added strategic guardrail against feature complexity. Added hypothesis framing throughout. Updated business model to reflect positioning constraints. Added new risks (complexity creep, app feeling complicated). Added UX-specific success metrics. |
| 2026-03-03 | Initial version |

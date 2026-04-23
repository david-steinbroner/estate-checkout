# Estate Checkout

A mobile-first checkout app for estate sales that replaces the printing calculator, paper tickets, and manual discount math.

## What It Does

Estate sale workers enter item prices by tapping a number pad or speaking them aloud. The app auto-applies day-based discounts, generates a QR code as a digital invoice, and lets a payment worker scan it to confirm payment. A live dashboard gives operators revenue and transaction data in real time.

No login. No internet required. No setup beyond naming your sale.

## Tech Stack

- **Frontend:** Vanilla JS, HTML, CSS (no frameworks)
- **Storage:** localStorage (all data on-device)
- **Backend:** None -- zero server dependencies
- **Offline:** Service worker with cache-first strategy (full PWA)
- **QR:** qrcode.js (generation), native BarcodeDetector + html5-qrcode fallback (scanning)
- **Voice:** Web Speech API (browser-native)

## Version & Status

**Version:** v0.1
**Status:** Feature-complete, entering end-to-end mobile testing before first field test
**Live:** [estate-checkout.pages.dev](https://estate-checkout.pages.dev)
**Repo:** [github.com/david-steinbroner/estate-checkout](https://github.com/david-steinbroner/estate-checkout)

## Run Locally

Open `index.html` in a browser. That's it -- no build step, no dependencies to install.

For PWA features (service worker, offline), serve over HTTPS or localhost:

```bash
npx serve .
```

Then open `http://localhost:3000`.

## Deploy

Auto-deploys to Cloudflare Pages on push to `main`.

## Project Structure

```
index.html              Main app (single page, all screens)
sw.js                   Service worker (cache-first offline)
manifest.json           PWA manifest
css/styles.css          All styles + design system tokens
js/
  app.js                Navigation, screen management, header menu
  checkout.js           Number pad, cart, item management
  speech.js             Voice input (hold-to-talk, natural language parsing)
  qr.js                 QR code generation + invoice handoff
  scan.js               QR scanning (camera)
  payment.js            Payment confirmation screen
  dashboard.js          Transaction list, filters, stats
  payouts.js            Consignor payout breakdowns
  sale-setup.js         Sale creation, schedule, consignors
  storage.js            localStorage wrapper
  utils.js              Shared helpers, discount math, consignor colors
lib/qrcode.min.js       QR code library
assets/icons/           PWA icons
```

## What's Done

- Checkout pad with numpad, voice input, item descriptions
- Day-based auto-discount with configurable multi-day schedules
- Item-level haggle discounts (new price, $ off, % off)
- Invoice-level discounts (% off, $ off, new price)
- QR code invoice handoff between checkout and payment workers
- QR scanning with camera (native BarcodeDetector + fallback)
- Live dashboard with 5-status system, filters, sort, stats
- Draft transaction persistence (open invoices update in real time)
- Edit invoice loop with lazy voiding
- Multi-worker shared sale via QR code + human-readable sale code
- Multi-day sale flow (end day, resume, end sale)
- Consignor tracking with colored dots, payout types, payout screen
- Speech-to-text with natural language parsing, iOS mic fixes
- Full design system with unified tokens and 48px touch targets
- PWA with service worker (cache v127)

## What's Next

- End-to-end testing on mobile Chrome and Safari
- Field test at a real estate sale
- v0.2 scope driven by field test feedback (likely: one-person flow shortcut, CSV export, dashboard search)

See `BACKLOG.md` for the full roadmap and `PRODUCT_STRATEGY.md` for strategic context.

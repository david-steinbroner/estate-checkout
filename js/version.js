/**
 * version.js — App version and user-facing changelog
 * Bump APP_VERSION on every deploy; add a corresponding entry to VERSION_HISTORY.
 *
 * Style rule for entries (v174 cleanup): user-facing only, terse, one or two
 * lines per release. No technical jargon, no internal refactor notes — if a
 * change isn't visible to a worker running an estate sale, it doesn't belong
 * here. The git log is the engineering changelog; this is the release-notes
 * surface inside the app.
 */

const APP_VERSION = 'v180';

const VERSION_HISTORY = [
  {
    version: 'v180',
    date: '2026-04-28',
    changes: [
      'Internal: cards and section header labels now use canonical naming (ec-card / ec-section-header). Eyebrow labels in a few places (Add Consignor, Edit Sale, Dashboard stats) are now slightly smaller (13px vs 15px) to match the spec — minor visual tweak.'
    ]
  },
  {
    version: 'v179',
    date: '2026-04-28',
    changes: [
      'Internal: every text input and inline error message in the app now uses canonical naming (ec-input / ec-field-error). No user-visible changes.'
    ]
  },
  {
    version: 'v178',
    date: '2026-04-28',
    changes: [
      'Internal: every button and link in the app now uses the canonical naming (ec-btn / ec-link) — first major step in the design system migration. No user-visible changes except the Join Sale Scan QR button is now green (was blue) and the Cancel buttons in confirmation sheets are now blue-tinted (were white-bordered).'
    ]
  },
  {
    version: 'v177',
    date: '2026-04-28',
    changes: [
      'Internal: design system documentation rewritten to honestly track which components have shipped and which are still on the migration roadmap. No user-visible changes.'
    ]
  },
  {
    version: 'v176',
    date: '2026-04-28',
    changes: [
      'Payment screen action buttons match the rest of the app now (was a tiny bit shorter than every other screen).',
      'Sale Confirmation buttons stack vertically like every other sheet (was the only horizontal pair).',
      'Internal cleanup so future sheets stay cohesive.'
    ]
  },
  {
    version: 'v175',
    date: '2026-04-28',
    changes: [
      'Removed the "New Order" button from the Scan QR screen — it was wiping the active cart on whichever device owned checkout. Use the menu to navigate.',
      'End Sale Permanently: when the typed name doesn\'t match, you now see a clear error message under the field instead of just a disabled button.',
      'Add Consignor: more breathing room between Name, Color, Payout, and Notes sections (was squished).'
    ]
  },
  {
    version: 'v174',
    date: '2026-04-28',
    changes: [
      "What's New sheet cleaned up: left-aligned, no Done button (swipe down to dismiss), and these notes are way shorter going forward.",
      'Bottom action buttons are now the same height on every screen — Scan and Dashboard had been smaller than the rest.',
      "Most text inputs are now left-aligned (matches Apple Wallet, Venmo, etc). The 6-digit join code stays centered — it's a code, not regular text.",
      "Fixed: SHARED tag was showing up just because you opened the Share Sale sheet. It now only appears on devices that actually joined someone else's sale.",
      "Cleaner line breaks across the app — no more single words hanging on their own line."
    ]
  },
  {
    version: 'v173',
    date: '2026-04-28',
    changes: [
      "Add Consignor: color picker is now a single chip you tap to choose from. Saves space and the Delete button on Edit Consignor fits without scrolling.",
      "New way to remove sale days or consignors: tap Remove (next to + Add), then tap the red minus on a row, then tap Remove again to confirm. Two taps so you can't fat-finger it."
    ]
  },
  {
    version: 'v172',
    date: '2026-04-28',
    changes: [
      "Join Sale: scan the organizer's QR code right inside the app — no more switching to your phone's camera app."
    ]
  },
  {
    version: 'v171',
    date: '2026-04-28',
    changes: [
      "Edit Sale changes (name, day, discount) now sync to other devices on a shared sale.",
      "Ending a sale from the Paused screen now requires typing the sale name — same guardrail as the menu version.",
      "New Sale menu redesigned to match the in-sale menu, with What's New and Share Feedback (links to a real form).",
      "Removed the Cancel buttons from menus — swipe down or tap outside to dismiss."
    ]
  },
  {
    version: 'v170',
    date: '2026-04-28',
    changes: [
      "Scan QR screen now has a back button in the top-left.",
      "Add Item: bigger Qty + / − buttons with cleaner icons, mic icon recentered.",
      "Sheets have proper breathing room above their content now."
    ]
  },
  {
    version: 'v169',
    date: '2026-04-28',
    changes: [
      'Dashboard "Avg Invoice" → "Avg" (one line, cleaner).',
      "Filter pills consolidated into a single Filter pill that opens a sheet — Sort and Filter share one row now."
    ]
  },
  {
    version: 'v168',
    date: '2026-04-28',
    changes: [
      "Removed swipe-to-delete on items and days. Tap an item or day to edit, and you'll see explicit Delete buttons there."
    ]
  },
  {
    version: 'v167',
    date: '2026-04-28',
    changes: [
      "Share codes are now 6 digits — way easier to read aloud and type. You can also enter the code manually on the Join sheet if scanning isn't working."
    ]
  },
  {
    version: 'v166',
    date: '2026-04-26',
    changes: [
      "Menu icon is properly centered everywhere now."
    ]
  },
  {
    version: 'v165',
    date: '2026-04-26',
    changes: [
      "Fixed sheets being cut off at the bottom by the Safari URL bar."
    ]
  },
  {
    version: 'v164',
    date: '2026-04-26',
    changes: [
      "New Sale screen simplified: removed separate Start Date and End Date sections. Day 1 is today by default; tap + Add Day to extend."
    ]
  },
  {
    version: 'v163',
    date: '2026-04-26',
    changes: [
      "Removed the top nav bar — the menu button now lives on each screen's title block. Saves space."
    ]
  },
  {
    version: 'v162',
    date: '2026-04-26',
    changes: [
      "Checkout: the Day 1 / discount line now sits inside the running-total card instead of above it."
    ]
  },
  {
    version: 'v161',
    date: '2026-04-26',
    changes: [
      "Bigger iOS-style title blocks on Dashboard and Paused.",
      "QR handoff screen: clearer title (\"Order #N\"), clearer instruction, and the primary action is now \"Mark paid now\"."
    ]
  },
  {
    version: 'v160',
    date: '2026-04-26',
    changes: [
      "Dashboard: stat tiles redesigned as floating white cards on the tinted background."
    ]
  },
  {
    version: 'v159',
    date: '2026-04-26',
    changes: [
      "Fixed: tapping Resume on one device now properly takes the other device back to checkout.",
      "Ending a sale no longer wipes the data on the device that ended it."
    ]
  },
  {
    version: 'v158',
    date: '2026-04-26',
    changes: [
      "Cloud sync is now complete: void/cancel, edit, consignors, end-day, end-sale all sync to joined devices in real time.",
      "End Sale Permanently now requires you to type the sale name to confirm — prevents accidental taps."
    ]
  },
  {
    version: 'v156-v157',
    date: '2026-04-26',
    changes: [
      "New: cloud sync. Two workers on the same sale now see each other's invoices live in the dashboard."
    ]
  },
  {
    version: 'v155',
    date: '2026-04-24',
    changes: [
      "Consignor Payouts page redesigned — Apple Wallet style cards with stats, expandable item list, clean empty state."
    ]
  },
  {
    version: 'v154',
    date: '2026-04-24',
    changes: [
      "Paused screen: \"Resume Sale\" is now the primary green button.",
      "Customer-facing ticket page redesigned to match the rest of the app."
    ]
  },
  {
    version: 'v153',
    date: '2026-04-24',
    changes: [
      "New Sale screen: every section now sits in its own iOS-style grouped card.",
      "Bottom sheets now show a small pull-handle indicator at the top."
    ]
  },
  {
    version: 'v152',
    date: '2026-04-24',
    changes: [
      "Hamburger menu redesigned to look like a real iOS action sheet."
    ]
  },
  {
    version: 'v147-v151',
    date: '2026-04-24',
    changes: [
      "Add Item rebuilt as a full-screen entry experience — Cancel never falls below the fold.",
      "Consistent input styling across the app (Apple Wallet / Venmo style)."
    ]
  },
  {
    version: 'v142-v146',
    date: '2026-04-24',
    changes: [
      "Dashboard: tap an invoice to expand it, see actions as a clean stacked list (Apple Wallet style).",
      "Revenue by consignor card on the Dashboard.",
      "You can change an item's consignor even after the invoice has been paid.",
      "Consignor selector is now a chip on the Add Item screen."
    ]
  },
  {
    version: 'v136-v141',
    date: '2026-04-24',
    changes: [
      "Running total is now a big centered hero number on checkout (Apple Wallet / Venmo style).",
      "Checkout footer redesigned: two clean buttons instead of three squished ones.",
      "QR handoff screen: bigger QR, clearer instruction."
    ]
  },
  {
    version: 'v128-v135',
    date: '2026-04-23',
    changes: [
      "Big design refresh to iOS-native look and feel: system colors, bigger text, more breathing room.",
      "Status pills now show small icons next to the label.",
      "Auto-update — the app pulls the latest version whenever you open it."
    ]
  },
  {
    version: 'v127 and earlier',
    date: '2026-03-04',
    changes: [
      "Foundation builds — discount schedule, multi-worker, multi-day flow, design system."
    ]
  }
];

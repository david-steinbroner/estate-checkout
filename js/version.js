/**
 * version.js — App version and user-facing changelog
 * Bump APP_VERSION on every deploy; add a corresponding entry to VERSION_HISTORY.
 * Keep entries short, in plain language (Alissa-readable).
 */

const APP_VERSION = 'v147';

const VERSION_HISTORY = [
  {
    version: 'v147',
    date: '2026-04-24',
    changes: [
      'Add Item screen rebuilt as a full-screen entry experience (not a small sheet) — Cancel button never falls below the fold anymore',
      'Add Item: big price at the top, description input with mic button inside, then qty + numpad + consignor chip; the green "Add Item" button stays pinned at the bottom',
      'Cancel is now a back arrow at the top-left, "Add Item" / "Edit Item" title in the middle',
      'New Sale: Start Date and End Date are now stacked (full width each) instead of cramped side-by-side',
      'Spacing rules tightened across all sheets — consignor chip no longer touches the numpad, sheet buttons no longer crash into the content above'
    ]
  },
  {
    version: 'v146',
    date: '2026-04-24',
    changes: [
      'Fixed: end date picker on the New Sale screen no longer pushes off the right edge',
      'Fixed: text inputs on the New Sale screen no longer overflow their column (root cause: missing box-sizing)',
      'Fixed: Save / Delete / Cancel buttons on the Add Consignor sheet are no longer stacked on top of each other',
      'Fixed: Apply / Remove / Cancel buttons on the Invoice Discount sheet now match the rest of the app\'s button style',
      'Dashboard: sort toggle ("Newest First ↓") moved to its own row — filter pills now get the full width to display without being cut off'
    ]
  },
  {
    version: 'v145',
    date: '2026-04-24',
    changes: [
      'New "Revenue by consignor" card on the Dashboard — shows each consignor\'s total, item count, and share of revenue at a glance',
      'Only appears when the sale has consignors and at least some paid revenue is attributed to them',
      'Top 4 consignors shown. If there are more, tap "View all" to open the full Consignor Payouts page'
    ]
  },
  {
    version: 'v144',
    date: '2026-04-24',
    changes: [
      'You can now change (or add) an item\'s consignor even after the invoice has been paid — tap the consignor tag on any item in the dashboard to reassign',
      'Items without a consignor show a dashed "Assign" chip — tap to pick one',
      'Works on paid, unpaid, and open orders. Cancelled (voided) transactions stay read-only'
    ]
  },
  {
    version: 'v143',
    date: '2026-04-24',
    changes: [
      'Consignor selector is now a proper chip on the Add Item screen — sits right above the "Add Item" button so it\'s easy to see and tap',
      'The chip shows "Consigned by" and the consignor name in bold, with their color dot on the left',
      'When no consignor is picked yet, it reads "Select consignor" with a dashed circle — clearer call to action than "None"',
      'Only appears when the sale has at least one consignor set up'
    ]
  },
  {
    version: 'v142',
    date: '2026-04-24',
    changes: [
      'Dashboard: when you tap an invoice to expand it, actions now appear as a clean stacked list of text links (Apple Wallet style) instead of a row of squished buttons',
      'Destructive actions ("Cancel invoice", "Cancel order") clearly shown in red',
      '"Mark as paid" shown in green at the top of the list',
      'Confirmation sheets ("Clear all items?", "End Sale Permanently?") now use a solid red button for the destructive action — clearer warning than the old outlined style'
    ]
  },
  {
    version: 'v141',
    date: '2026-04-24',
    changes: [
      'Fixed: QR code was bleeding through onto the checkout screen (screen-hiding rule got overridden in v140)'
    ]
  },
  {
    version: 'v140',
    date: '2026-04-24',
    changes: [
      'QR handoff screen redesigned — QR code is bigger and centered, with clearer instruction: "Hand this phone to your payment worker"',
      'Total shown in a clean row with big bold amount, items list is secondary (small gray text)',
      'Four cramped buttons replaced by one tappable "Mark paid without scanning" link on top, and small secondary links below: Edit invoice · Adjust price · New order'
    ]
  },
  {
    version: 'v139',
    date: '2026-04-24',
    changes: [
      'Dashboard transaction list redesigned — rows are now taller and cleaner (Apple Wallet activity style)',
      'Each row shows the order name on top, the day/time/item count on a second line, and the amount in bold on the right',
      'Status pill sits next to the subtitle instead of competing with the amount — much easier to scan'
    ]
  },
  {
    version: 'v138',
    date: '2026-04-24',
    changes: [
      'Order detail sheet (opens when you tap the order summary) redesigned to match Apple Wallet',
      'Big order total shown at the top of the sheet, with item count just below',
      'Small X close button in the top-right instead of a bottom "Done" button',
      '"Clear all items" now lives in the sheet itself as a red link at the bottom'
    ]
  },
  {
    version: 'v137',
    date: '2026-04-24',
    changes: [
      'Running total is now a big, centered hero number on the checkout screen (Apple Wallet / Venmo style) — no more small text on a black bar',
      'Order name and item count shown just above the total as a subtle secondary label',
      'Better empty state on the order screen: icon + clearer heading + helper text telling you what to do'
    ]
  },
  {
    version: 'v136',
    date: '2026-04-24',
    changes: [
      'Checkout footer redesigned — two full-width buttons instead of three squished ones',
      '"Add Item" is now the primary green button on the right, "Create Invoice" is the secondary blue button on the left',
      '"Create Invoice" stays dimmed until you have at least one item in the order',
      '"Clear all" moved out of the footer — it now shows up as a small red link above the buttons, only when there are items to clear'
    ]
  },
  {
    version: 'v135',
    date: '2026-04-24',
    changes: [
      'New Sale setup page: more breathing room between section headers, inputs, and checkboxes',
      'Checkbox labels are easier to read (bumped up to body size)'
    ]
  },
  {
    version: 'v134',
    date: '2026-04-24',
    changes: [
      'More breathing room between elements — spacing bumped to match the bigger text from v133',
      'Screens should feel less crowded on phone'
    ]
  },
  {
    version: 'v133',
    date: '2026-04-23',
    changes: [
      'Bigger, bolder screen titles — Apple Wallet style',
      'Status pills (Paid, Open, Unpaid, Cancelled) now show a small icon next to the label — faster to scan at a glance'
    ]
  },
  {
    version: 'v132',
    date: '2026-04-23',
    changes: [
      'Added a /reset.html page that force-unregisters stuck service workers (one-time fix for Safari cache problems)'
    ]
  },
  {
    version: 'v131',
    date: '2026-04-23',
    changes: [
      'More reliable auto-update on iOS Safari — the app now bypasses browser cache when checking for new versions',
      'Also checks for updates when you switch back to the app from another one'
    ]
  },
  {
    version: 'v130',
    date: '2026-04-23',
    changes: [
      'Auto-update — the app now silently pulls the latest version whenever you open it (no more manual hard refresh needed)',
      'Still works offline: if there\'s no internet, the app falls back to the cached version',
      'Updates apply between sales — they won\'t interrupt you mid-checkout unless you reload on purpose'
    ]
  },
  {
    version: 'v129',
    date: '2026-04-23',
    changes: [
      'Added "What\'s New" to the menu so you can see what changed in each update',
      'Current version now shown at the bottom of the menu'
    ]
  },
  {
    version: 'v128',
    date: '2026-04-23',
    changes: [
      'New design direction: iOS-native look and feel',
      'Switched to iOS system colors (blue, green, orange, red)',
      'Bigger, more readable text throughout',
      'Prices now show much larger — easier to read at a glance'
    ]
  },
  {
    version: 'v127',
    date: '2026-03-04',
    changes: [
      'Earlier builds — design system, discounts, multi-worker, multi-day flow, UI cleanup'
    ]
  }
];

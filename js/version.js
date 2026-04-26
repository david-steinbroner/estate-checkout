/**
 * version.js — App version and user-facing changelog
 * Bump APP_VERSION on every deploy; add a corresponding entry to VERSION_HISTORY.
 * Keep entries short, in plain language (Alissa-readable).
 */

const APP_VERSION = 'v165';

const VERSION_HISTORY = [
  {
    version: 'v165',
    date: '2026-04-26',
    changes: [
      'Fixed: sheets (Add Consignor, Adjust Price, etc.) were getting cut off at the bottom by the Safari URL bar. The sheets now correctly size against the visible viewport (dvh) instead of the full window (vh).'
    ]
  },
  {
    version: 'v164',
    date: '2026-04-26',
    changes: [
      'New Sale screen radically simpler: removed the separate "Start Date" and "End Date" sections. The Schedule is now the sale — Day 1 defaults to today, "+ Add Day" appends the next day, tap any day\'s date to change it inline.',
      'Three sections (Start, End, Schedule) replaced with one: Sale Days. Less to fill out, less to think about.',
      'Removed "Starts today" and "TBD" checkboxes (no longer needed — Day 1 = today by default, the schedule defines the end).'
    ]
  },
  {
    version: 'v163',
    date: '2026-04-26',
    changes: [
      'Removed the standalone top nav bar — the menu button (☰) now lives in the top-right of each screen\'s hero/title block, and the SHARED chip sits next to it when applicable. Saves a full row of chrome (~76px) and matches the Apple Wallet pattern of "controls live with the card".',
      'Menu button is now a clean white circular icon button with a subtle shadow, embedded in the running-total card on Checkout, the title block on Dashboard, the header on Paused, and pinned top-right on Payouts.'
    ]
  },
  {
    version: 'v162',
    date: '2026-04-26',
    changes: [
      'Checkout screen tightened: the "Day 1" context line now lives inside the hero card with the running total instead of sitting on its own row above. Same information, less wasted vertical space (Apple Wallet Balance Detail pattern).'
    ]
  },
  {
    version: 'v161',
    date: '2026-04-26',
    changes: [
      'Top header is now minimal — just the menu button (and a SHARED chip when multiple devices are joined). No more cramped "Sale name · Day 1 · No discount" line that was getting truncated.',
      'Each screen now shows its own context where it makes sense: Checkout has a small "Day 1 · 2 items" line above the running total; Dashboard now has a big iOS-style title with the sale name and day/discount underneath.',
      '"No discount" is hidden when the discount is zero (less noise)',
      'Sale name now shows at the top of the menu sheet so you can confirm which sale you\'re in',
      'QR handoff screen: title is now "Order #N", instruction reads "Customer scans to keep their ticket", and the primary action is "Mark paid now" instead of "Mark paid without scanning" — reflects that workers no longer scan each other\'s QRs (they use the dashboard)'
    ]
  },
  {
    version: 'v160',
    date: '2026-04-26',
    changes: [
      'Dashboard layout cleanup: the Invoices / Revenue / Avg Invoice stat tiles now sit as floating white cards on the tinted page background — same paradigm as the Sale Ended banner above them, instead of an inverted "white strip with gray boxes" look',
      'Banner spacing aligned with the stats and consignor revenue card so all three sections match'
    ]
  },
  {
    version: 'v159',
    date: '2026-04-26',
    changes: [
      'Fixed: tapping Resume on one device now correctly takes the other device back to the checkout screen automatically (paused-screen polling was missing)',
      'Ending a sale no longer wipes the data on the device that ended it — both the originating device and the joined device now land on the dashboard with a clear "Sale ended" banner and a Start New Sale button',
      'Past sale\'s invoices stay viewable on the dashboard until you tap Start New Sale (so you can review what just happened before moving on)',
      'Scan Invoice now understands the new pointer QR format — scanning fetches the invoice live from the cloud',
      'Banner button styling matches the rest of the design system'
    ]
  },
  {
    version: 'v158',
    date: '2026-04-26',
    changes: [
      'Sync is now complete: voiding/cancelling an invoice, editing an invoice, and adding/editing/deleting a consignor all sync to joined devices in real time',
      'End Day, Resume, and End Sale Permanently now sync — when one worker ends the day, everyone\'s device flips to the Paused screen; anyone can tap Resume to continue',
      'When a sale is ended on another device, you see a clear "Sale was ended elsewhere" alert and get kicked to the setup screen (no more orphaned screens)',
      'End Sale Permanently now requires you to type the sale name to confirm — prevents accidental taps from helpers',
      'The customer ticket page now uses a tiny pointer QR (just the invoice ID) and fetches live data from the cloud — your customers see a real-time receipt that updates if you mark it paid'
    ]
  },
  {
    version: 'v157',
    date: '2026-04-26',
    changes: [
      'Fixed: cloud sync between joined devices was silently broken because the share code was generated locally before the cloud responded. Now Start Sale waits for the cloud to assign the share code before it returns.',
      'Removed the legacy local-only share-code fallback — there\'s exactly one source of share codes now (the cloud).',
      'Share QR now contains just the share code instead of the full sale data — phone fetches the latest config from the cloud on join.',
      'If you\'re offline when starting a sale, the Share Sale screen now clearly says "Sharing requires internet" instead of generating a fake code.'
    ]
  },
  {
    version: 'v156',
    date: '2026-04-26',
    changes: [
      'New: cloud sync. When two workers join the same sale, they now see each other\'s invoices live in the dashboard',
      'New sales automatically save to the cloud; joining a sale via QR pulls the latest config from the cloud',
      'Marking an invoice paid (or unpaid) now syncs to all joined devices within seconds',
      'Existing sales started before this update stay local-only — no migration needed'
    ]
  },
  {
    version: 'v155',
    date: '2026-04-24',
    changes: [
      'Consignor Payouts page rebuilt to match the rest of the app — Apple Wallet style grouped list cards, big Wallet-style page title, and per-consignor breakdown cards with proper rows',
      'Each consignor card now shows: name + payout arrangement at top, then stat rows (Items sold, Revenue, Consignor gets in bold, You keep in green bold)',
      '"View N items" tap-to-expand toggle now reads as a proper iOS row with an animating chevron; expanded item list sits in a tinted sub-section indented from the consignor dot',
      'Empty state: clean heading + helper text when no paid invoices exist yet'
    ]
  },
  {
    version: 'v154',
    date: '2026-04-24',
    changes: [
      'Paused screen redesigned — "Resume Sale" is now a clear primary green button at the bottom; "View Dashboard" and "End Sale Permanently" became simple text links so they don\'t compete for attention',
      'Customer-facing ticket page (the digital receipt customers see when they scan the QR) fully redesigned to match the rest of the app — Apple Wallet style cards with hero total, items list, and QR for the payment worker',
      'Date displayed centered, big bold total, tabular numerals — feels like a real Wallet pass'
    ]
  },
  {
    version: 'v153',
    date: '2026-04-24',
    changes: [
      'New Sale screen redesigned — every section (Sale Name, Start Date, End Date, Schedule, Consignors) now sits in its own white iOS-style grouped list card on a tinted background',
      'Form inputs, checkboxes, and "+ Add" buttons are now rows inside their cards instead of free-floating elements',
      '"Start Sale" / "Join Sale" footer now uses the paired-button pattern (green primary + blue tinted secondary) — same as the checkout footer',
      'Every bottom sheet now has a small iOS pull-handle indicator at the top (signals you can swipe down to dismiss)'
    ]
  },
  {
    version: 'v152',
    date: '2026-04-24',
    changes: [
      'Hamburger menu redesigned — looks like a real iOS action sheet now (grouped list cards with icons and chevrons) instead of a stack of huge buttons',
      'Navigation items (Dashboard, Payouts, Scan, Share, Edit, What\'s New) live in the first white card',
      'State-change actions (End Day in green, End Sale Permanently in red) live in a second white card below',
      'Cancel lives as a bolder standalone button at the bottom — iOS convention',
      'Icons on every row for quick scanning'
    ]
  },
  {
    version: 'v151',
    date: '2026-04-24',
    changes: [
      'Fixed: tapping an item from the Order Detail sheet now properly opens the Edit Item screen on top, instead of showing it behind the Order Detail sheet greyed out'
    ]
  },
  {
    version: 'v150',
    date: '2026-04-24',
    changes: [
      'Inputs now have a subtle 1px border at rest — fixes the "feels weird, like static text" look on pre-populated fields like the date pickers',
      'Date inputs (Start Date, End Date) now show the date centered horizontally instead of pushed to the left edge',
      'Date inputs use a slightly heavier font weight so the date reads more clearly'
    ]
  },
  {
    version: 'v149',
    date: '2026-04-24',
    changes: [
      'All text fields across the app now share one consistent look: light gray tinted background, no border at rest, white background + blue border on focus (Apple Wallet / Venmo style)',
      'Slightly more rounded corners across buttons, inputs, and cards (10–14px instead of 6–12px) to match modern iOS',
      'The Payout Type picker (Percentage / Flat Fee) on the Add Consignor sheet is no longer a generic dropdown — it\'s now a clean tappable pill that opens a bottom sheet with descriptions for each option'
    ]
  },
  {
    version: 'v148',
    date: '2026-04-24',
    changes: [
      'Fixed for real: date inputs on the New Sale page no longer overflow off the right edge. Root cause was iOS Safari rendering native date inputs wider than their CSS width because of a shadow-DOM placeholder. Forced the input to opt out of native styling.'
    ]
  },
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

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

const APP_VERSION = 'v209';

const VERSION_HISTORY = [
  {
    version: 'v209',
    date: '2026-04-30',
    changes: [
      'Fixed for real: End Day icon now actually renders. The label was being swapped via .textContent on the whole row, which wiped the icon span. Now targets just the label.',
      'Edit Estate Sale Details: redesigned to match the Setup screen pattern — every section is a grouped card with the same Day-row and Consignor-row styling. Removing days or consignors uses the standard "Remove → tap minus → tap Remove" flow (same as Setup). Renamed from "Edit Estate Sale" so the entry point is clearer.',
      'Pencil edit icons removed everywhere. Editable inline values (Order #N, sheet titles) are now blue tappable text — same affordance iOS uses for every editable value in Wallet, Notes, Settings.',
      'Edit Item: consignor chip now sits above the numpad so it\'s reachable without scrolling past the numpad keys.',
      'Select Consignor sheet: row alignment fixed. "None" and named consignor rows now align identically — same indent on every row, no more centered-vs-left mismatch.',
      'Note about the URL pill that appears between the input and the keyboard: that\'s iOS Safari chrome and can\'t be suppressed from the page. It goes away when you install the app to your home screen (tap Safari\'s share button → Add to Home Screen). The standalone PWA has no Safari chrome at all.'
    ]
  },
  {
    version: 'v208',
    date: '2026-04-30',
    changes: [
      'Fixed for real: the keyboard no longer pushes the Invoice Adjustment sheet (or any other sheet with an input) up off-screen. The v206 attempt used a viewport meta directive that doesn\'t exist on iOS Safari at all — it was a no-op on iPhone. Now uses `lvh` for sheet sizing plus a focus option that suppresses iOS\'s auto-scroll-to-input behavior.',
      'End Day pause icon now actually renders — the previous v207 attempt used SVG rectangles with a stroke-only style, which drew as nearly-invisible thin outlines. Replaced with proper stroke paths.'
    ]
  },
  {
    version: 'v207',
    date: '2026-04-30',
    changes: [
      'End Day in the menu now has a proper pause icon (||) — the previous arrow icon was too thin to read alongside the others.'
    ]
  },
  {
    version: 'v206',
    date: '2026-04-30',
    changes: [
      'New: Invoice Adjustment replaces Adjust Price / Invoice Discount. Now supports discounts AND surcharges — % or $, in either direction, plus the option to override with a Set Total.',
      'Pick a type first (Discount, Surcharge, or Set Total), then mode (% or $) for the first two. Preview shows the signed adjustment and the new total.',
      'Fixed: tapping into an input on the Invoice Adjustment sheet no longer pushes the sheet up off-screen. The keyboard now overlays the bottom of the sheet — dismiss it to reach the buttons below.',
      'Fixed: double-tapping anywhere in the app no longer zooms in. Pull-to-refresh still works as before.',
      'Existing invoice discounts are migrated automatically when read; nothing changes for sales already in progress.'
    ]
  },
  {
    version: 'v205',
    date: '2026-04-30',
    changes: [
      'In-sale menu reordered: Scan Invoice moves up to second position (right after Dashboard) — it\'s a frequent mid-sale action when a customer comes back with their ticket.',
      'Subtle visual rhythm in the menu — three intent clusters (review the sale, change settings, data + help) read as separate groups via a small breathing gap between them.'
    ]
  },
  {
    version: 'v204',
    date: '2026-04-30',
    changes: [
      'New: App Guide replaces What\'s New in the menu. Short FAQs in three accordion sections — Getting started, Running the sale, Wrapping up & history. Covers what the app is, how to start a sale, how to invite or join helpers, what consignors do, days, dashboard, invoices, QR tickets, scanning, ending/resuming days, exporting, ending the sale permanently, and deleting past sales.'
    ]
  },
  {
    version: 'v203',
    date: '2026-04-30',
    changes: [
      'Browser back button now walks back through screens instead of exiting the app. Same for iOS swipe-from-edge gesture in Safari.',
      'Refresh keeps you on the screen you were on. Past Estate Sale Detail, Past Estate Sales list, dashboard, paused — all stable across refresh.',
      'Closing a sheet via back button (or swipe-back) now closes the sheet without leaving the screen — feels right.',
      'Internal: the URL fragment now reflects the active screen. Bookmarkable, shareable, predictable.'
    ]
  },
  {
    version: 'v202',
    date: '2026-04-29',
    changes: [
      'End Estate Sale Permanently on the Paused screen is now centered, matching the Resume button and the inline action row above it.'
    ]
  },
  {
    version: 'v201',
    date: '2026-04-29',
    changes: [
      'Paused screen actions tightened up: View dashboard and Export are now a single inline row with a dot separator (matching the Sale Ended banner). End Estate Sale Permanently sits below on its own with extra breathing room — clearer visual grouping between everyday actions and the destructive one.'
    ]
  },
  {
    version: 'v200',
    date: '2026-04-29',
    changes: [
      'Fixed: tapping "Mark paid now" on the QR screen and immediately landing on the dashboard sometimes showed the invoice as unpaid. The dashboard\'s background sync was pulling the stale server record before the paid-status update had landed and overwriting the local copy. Local mutations now win until the server catches up.'
    ]
  },
  {
    version: 'v199',
    date: '2026-04-29',
    changes: [
      'Critical fix: invoices were leaking across estate sales in past-sale archives. Each invoice is now tagged with the sale it belongs to at creation time, and archives, exports, and the dashboard all scope to the right sale strictly. Sequential sales no longer cross-contaminate.',
      'Related fix: when joining someone else\'s estate sale that already had invoices, those invoices used to silently disappear from the dashboard because their timestamps predated when this device joined. They now show correctly.',
      'Starting a new estate sale now physically clears the previous sale\'s invoices from this device (the archive snapshot is preserved).',
      'New: "Clear all past estate sales" link at the bottom of the Past Estate Sales screen — one-shot reset for archives that were polluted before this fix. Type DELETE to confirm. Cloud copies are not touched (use the per-sale Delete for that).'
    ]
  },
  {
    version: 'v198',
    date: '2026-04-29',
    changes: [
      'Item descriptions now line up across rows whether or not the item has a consignor — the colored dot always reserves its slot, even when nothing\'s assigned. Looks the same on sales without consignors at all.',
      'Dashboard transaction detail: the "Assign" button on items with no consignor is now a small person-add icon instead of the word "Assign". Cleaner inline.',
      'Edit Item: Delete Item button no longer gets clipped by the iOS Safari URL bar at the bottom — added more breathing room to the footer.',
      'In-sale paused menu: End Estate Sale Permanently no longer requires scrolling to see in full — the sheet expands taller when needed.',
      'Sale Ended banner: the two secondary actions ("Export" and "View past sales") now fit on the same line with a dot separator, as originally intended in v197.'
    ]
  },
  {
    version: 'v197',
    date: '2026-04-29',
    changes: [
      'Sale Ended banner takes up less vertical space — Export Estate Sale Data and View Past Estate Sales are now a single inline row separated by a dot, instead of two stacked links.',
      'When you have no past estate sales yet, only Export shows on its line (no dangling separator).'
    ]
  },
  {
    version: 'v196',
    date: '2026-04-29',
    changes: [
      'Past Estate Sales card on the Setup screen is now the same height as the Estate Sale Name and Consignors cards above it.',
      'Fixed: Past Estate Sale Detail showed "No transactions in this estate sale" even when invoices existed. The empty state now correctly hides whenever there\'s data.',
      '"View Past Estate Sales" link in the Sale Ended banner is now centered, matching the Export link directly above it.'
    ]
  },
  {
    version: 'v195',
    date: '2026-04-29',
    changes: [
      'Past Estate Sales is now a Setup-screen feature. New tappable card on the New Estate Sale screen — shows the count, drills into your archive. Hidden until you\'ve ended at least one sale.',
      'Removed Past Estate Sales from the in-sale menu. Mid-sale you\'re ringing up customers, not browsing archives.',
      'Added a "View Past Estate Sales" link to the Sale Ended banner on the dashboard — quick path from "I just ended this sale" to your archive without going back to Setup.',
      'The Setup hamburger still has Past Estate Sales as a backup, hidden when there\'s nothing to show.'
    ]
  },
  {
    version: 'v194',
    date: '2026-04-29',
    changes: [
      'Fixed: Past Estate Sales screens were rendering on top of the New Estate Sale screen (v193 stacking bug). The list and detail layouts no longer leak through.',
      '"Export Sale Data" buttons everywhere now read "Export Estate Sale Data" — the in-sale menu, the dashboard ended banner, the Paused screen, and the Past Estate Sale Detail screen all match.',
      '"Past Sales" → "Past Estate Sales" in menus and the list header — consistent with the rest of the app.',
      'Past sale with no name set now reads "Untitled Estate Sale" instead of the bare default "Estate Sale" (which collided with the generic noun in the rest of the UI).'
    ]
  },
  {
    version: 'v193',
    date: '2026-04-29',
    changes: [
      'New: Past Sales. Sales you\'ve ended permanently now stick around on this device — open the menu to see the list, tap any past sale to review its invoices, stats, and consignor revenue. The "Past Sales" menu item only appears once you\'ve actually ended at least one sale, in both the in-sale menu and the new-sale Setup menu.',
      'New: Delete a past sale from the cloud. From any Past Sale\'s detail screen, tap "Delete this estate sale" and type the name to confirm. This wipes the cloud copy (so anyone with the share code can no longer reach it) and removes it from this device.',
      'Cloud delete is offline-tolerant: if you\'re offline when you delete, the local copy is removed immediately and the cloud cleanup runs silently next time you\'re online — no extra step on your part.',
      'Past Sales are stored on this device only. If you handed your phone to a tester after ending a sale, they\'ll see your past sales. Delete the ones you don\'t want them to see before handing it over.',
      'Internal: archive uses IndexedDB instead of the smaller localStorage budget — dozens of past sales fit without bumping into quota limits.'
    ]
  },
  {
    version: 'v192',
    date: '2026-04-28',
    changes: [
      'Export Sale Data picker: shows the estate sale\'s name as a subtitle so you can see exactly which sale\'s data you\'re exporting.',
      'Picker rows are now left-aligned (was inheriting centered text from the sheet container — fine for short labels, weird for "Day 1 · Apr 28" type rows). Fixed across all picker sheets in the app.'
    ]
  },
  {
    version: 'v191',
    date: '2026-04-28',
    changes: [
      'Export Sale Data: the picker sheet now opens for every sale, not just multi-day ones. Single-day shortcut was confusing — you\'d tap Export and get the share sheet with no chance to preview what you were exporting.'
    ]
  },
  {
    version: 'v190',
    date: '2026-04-28',
    changes: [
      'Export Sale Data now opens a picker sheet instead of immediately sharing. Pick which days you want included in the CSV — handy for sharing just today\'s revenue with your consignors at end-of-day.',
      'Each day in the picker shows its date and how many invoices were on that day. Days with zero invoices are shown but greyed out. Tap "Deselect All" to start clean and pick specific days.',
      'Sales with only one day skip the picker — straight to share, since there\'s nothing to choose.',
      'Internal: estate sales now persist their per-day dates correctly. Sales with gap schedules (Day 1 = Apr 28, Day 2 = May 5) used to show wrong dates in some views — now accurate everywhere.'
    ]
  },
  {
    version: 'v189',
    date: '2026-04-28',
    changes: [
      'Sale Ended banner redesigned — text was getting squished against the buttons in a horizontal layout. Now stacks vertically: title, hint, full-width Start New Estate Sale button, then the Export Sale Data link below. Reads cleanly on phone width.',
      'The Start New Estate Sale button now uses the same canonical primary button style as every other green CTA in the app — was a bespoke smaller variant that didn\'t match.'
    ]
  },
  {
    version: 'v188',
    date: '2026-04-28',
    changes: [
      'New: Export Sale Data. Tap the menu and pick "Export Sale Data" to share the entire estate sale\'s data as a CSV — handed to the iOS share sheet so you can drop it in Mail, Files, AirDrop, etc.',
      'Same export action also available on the Paused screen (after End Day) and on the Sale Ended banner (after End Estate Sale Permanently) — same data, different moments you might want it.',
      'CSV is one row per item with all the columns you\'d need: day, date, time, invoice, customer, item, qty, prices, day discount, haggle, invoice discount share, consignor, payout %, consignor cut, your cut, status. Open in Excel, Numbers, Google Sheets, whatever.',
      'Multi-device note: when you tap Export, the app pulls the latest from the cloud first so a freshly-joined device that hasn\'t opened the dashboard yet still gets a complete export.'
    ]
  },
  {
    version: 'v187',
    date: '2026-04-28',
    changes: [
      'Every "Sale" reference (buttons, headers, copy) now reads "Estate Sale" — Join Estate Sale, Share Estate Sale, Resume Estate Sale, End Estate Sale Permanently, Start New Estate Sale, etc. Fixes the bug where the Setup screen was reverting to "Start Sale" after returning from an ended sale.',
      'End Estate Sale Permanently confirmation: no more live "doesn\'t match" error while typing. The error only appears if you tap End Estate Sale with a mistyped name. The match is now case-insensitive too — "Johnson Estate" matches "johnson estate" matches "JOHNSON ESTATE".'
    ]
  },
  {
    version: 'v186',
    date: '2026-04-28',
    changes: [
      'Add/Edit Consignor sheet: tapping the Payout dropdown (Percentage / Flat Fee) now opens the picker on top of the Consignor sheet — was opening behind it.',
      'Edit Consignor sheet is now taller so the Delete Consignor button fits without scrolling on most phones.'
    ]
  },
  {
    version: 'v185',
    date: '2026-04-28',
    changes: [
      'Headers and buttons clarified: "New Sale" → "New Estate Sale", "Sale Confirmation" → "Setup Confirmation", "Start Sale" → "Start Estate Sale", "Edit Sale" (in menu and sheet) → "Edit Estate Sale". The word "sale" was overloaded between the multi-day event and a single transaction; calling the event "Estate Sale" everywhere clears it up.',
      'Invoice Discount sheet: the "New Price" pill is now "Set $" so it fits on one line.',
      'Invoice Discount and Adjust Price sheets no longer push up when you tap the input field — the keyboard appears under the sheet instead. Dismiss the keyboard to see the bottom of the sheet if needed.',
      'Date picker on the Sale Days list: picking a date no longer auto-closes the picker. Tap the checkmark (or Done) to confirm — same as iOS native pickers everywhere else.'
    ]
  },
  {
    version: 'v184',
    date: '2026-04-28',
    changes: [
      'Removed the centered "Added!" / error toasts that appeared on item add and discount apply. The row already animates when added, sheets already close on apply — the toast was redundant.',
      'Validation errors in the Adjust Price and Invoice Discount sheets (e.g. "Enter a value", "Discount exceeds subtotal") now appear as inline red text under the input field, the same pattern used everywhere else.',
      'Internal: tokenized the last few magic font sizes and box-shadows so the design system has zero hardcoded values outside the token block.'
    ]
  },
  {
    version: 'v183',
    date: '2026-04-28',
    changes: [
      'Internal: design system migration complete. Card row variants and the outline destructive button moved to canonical naming; dead style tokens removed; missing motion + shadow tokens added. No user-visible changes.'
    ]
  },
  {
    version: 'v182',
    date: '2026-04-28',
    changes: [
      'Internal: numpad, hero numbers, empty states, and flash toasts now use canonical naming. No user-visible changes.'
    ]
  },
  {
    version: 'v181',
    date: '2026-04-28',
    changes: [
      'Internal: status pills, the consignor chip, and the color picker now use canonical naming. No user-visible changes.'
    ]
  },
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

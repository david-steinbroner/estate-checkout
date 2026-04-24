/**
 * version.js — App version and user-facing changelog
 * Bump APP_VERSION on every deploy; add a corresponding entry to VERSION_HISTORY.
 * Keep entries short, in plain language (Alissa-readable).
 */

const APP_VERSION = 'v137';

const VERSION_HISTORY = [
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

/**
 * version.js — App version and user-facing changelog
 * Bump APP_VERSION on every deploy; add a corresponding entry to VERSION_HISTORY.
 * Keep entries short, in plain language (Alissa-readable).
 */

const APP_VERSION = 'v132';

const VERSION_HISTORY = [
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

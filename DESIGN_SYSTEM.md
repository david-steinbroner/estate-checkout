# DESIGN SYSTEM — Estate Checkout

**Last updated:** 2026-03-03
**Status:** Implementation complete. All 10 prompts executed. System fully tokenized.
**Scope:** This document defines the complete design system for Estate Checkout. It is the single source of truth for all visual and interaction decisions. Every screen in the app must conform to this spec.

---

## How to Use This Document

This is a **build guide**. It is written to be handed directly to a coding session as a prompt. Each section defines exact values, exact rules, and exact changes needed. There is no ambiguity by design — if something isn't specified here, ask before implementing.

**Files that will be modified:**
- `css/styles.css` — Complete overhaul of CSS variables, component styles, and screen-specific styles
- `index.html` — Class name updates where component markup needs to change
- `js/*.js` — Any JS that sets inline styles or manipulates classes may need updates

**Files this document replaces or supersedes:**
- The CSS Rules section (§3) and Design Principles section (§4) in `CLAUDE_CODE_RULES.md` — this document is now the authoritative design reference. CLAUDE_CODE_RULES.md should reference this file.
- The UX/UI Design System section (§3) in `PRODUCT_STRATEGY.md` — that section describes the *why*; this document describes the *what* and *how*.

**Implementation order:**
1. Replace the `:root` CSS variables block with the new token system (§1)
2. Rebuild component styles to use new tokens (§2)
3. Screen-by-screen fixes (§3)
4. Remove all hardcoded values — grep for any hex color, px value, or font-size not using a variable (§4)
5. Test on mobile Chrome and Safari at 375px width

---

## §1. Design Tokens

These CSS variables are the foundation. **Every** color, size, spacing, font, and radius in the app must reference a token. No hardcoded values anywhere in the stylesheet.

### Colors

```css
:root {
  /* === Surface & Background === */
  --color-bg: #f5f5f5;                    /* Page background */
  --color-surface: #ffffff;                /* Cards, panels, inputs */
  --color-surface-raised: #ffffff;         /* Modals, sheets, overlays */

  /* === Text === */
  --color-text: #1a1a1a;                  /* Primary text */
  --color-text-secondary: #666666;         /* Secondary/helper text */
  --color-text-on-dark: #ffffff;           /* Text on dark backgrounds */
  --color-text-on-primary: #ffffff;        /* Text on primary-color backgrounds */
  --color-text-on-success: #ffffff;        /* Text on success-color backgrounds */
  --color-text-on-danger: #ffffff;         /* Text on danger-color backgrounds */

  /* === Brand / Primary === */
  --color-primary: #2563eb;                /* Primary actions, links, active states */
  --color-primary-dark: #1d4ed8;           /* Primary hover/active */
  --color-primary-light: rgba(37, 99, 235, 0.1);  /* Primary tinted background */

  /* === Semantic: Success === */
  --color-success: #16a34a;                /* Positive actions, paid status, add buttons */
  --color-success-dark: #15803d;           /* Success hover/active */
  --color-success-light: rgba(22, 163, 74, 0.15); /* Success tinted background */

  /* === Semantic: Danger === */
  --color-danger: #dc2626;                 /* Destructive actions, remove, void */
  --color-danger-dark: #b91c1c;            /* Danger hover/active */
  --color-danger-light: rgba(220, 38, 38, 0.1);   /* Danger tinted background */

  /* === Semantic: Warning/Pending === */
  --color-pending: #b45309;                /* Pending status text */
  --color-pending-light: rgba(217, 119, 6, 0.15); /* Pending tinted background */

  /* === Borders & Dividers === */
  --color-border: #e5e5e5;                 /* Default border */
  --color-border-focus: var(--color-primary); /* Input focus border */

  /* === Interactive States === */
  --color-bg-hover: #e5e5e5;              /* Hover background */
  --color-bg-active: #d4d4d4;             /* Active/pressed background */
  --color-disabled: #999999;               /* Disabled elements */

  /* === Overlays === */
  --overlay-light: rgba(0, 0, 0, 0.2);    /* Light backdrop (item list) */
  --overlay-medium: rgba(0, 0, 0, 0.5);   /* Standard modal backdrop */
  --overlay-dark: rgba(0, 0, 0, 0.7);     /* Heavy overlay (speech) */
  --overlay-opaque: rgba(0, 0, 0, 0.8);   /* Near-opaque (scan status) */
  --overlay-success: rgba(22, 163, 74, 0.95); /* Payment success overlay */

  /* === Scan Screen === */
  --color-scan-bg: #000000;                /* Camera/scan background */
}
```

**Rule:** If you need a color that isn't here, add it as a token. Never use a raw hex/rgba value in a component style.

### Spacing

```css
:root {
  /* === Spacing Scale === */
  --space-xs: 2px;     /* Micro: border offsets, badge padding */
  --space-sm: 4px;     /* Small: inner gaps, tight padding */
  --space-md: 8px;     /* Medium: standard component padding, icon gaps */
  --space-lg: 12px;    /* Large: section padding, card padding */
  --space-xl: 16px;    /* XL: generous padding, modal content gaps */
  --space-2xl: 24px;   /* 2XL: modal/sheet padding, screen sections */
  --space-3xl: 32px;   /* 3XL: major section separation */
}
```

**Rule:** Every padding, margin, and gap must use a spacing token. The scale is: 2, 4, 8, 12, 16, 24, 32. If you need something in between, use `calc()` with tokens — don't invent a one-off value.

### Typography

```css
:root {
  /* === Font Family === */
  --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

  /* === Font Sizes === */
  --font-size-xs: 11px;    /* Smallest: badges, fine print (use sparingly) */
  --font-size-sm: 12px;    /* Small: secondary labels, context strip */
  --font-size-base: 14px;  /* Base: body text, form inputs */
  --font-size-lg: 16px;    /* Large: buttons, section headers */
  --font-size-xl: 20px;    /* XL: screen titles, emphasis */
  --font-size-2xl: 28px;   /* 2XL: large totals, dashboard stats */
  --font-size-price: 36px; /* Price: checkout price display */

  /* === Font Weights === */
  --font-weight-normal: 400;   /* Body text */
  --font-weight-medium: 500;   /* Secondary labels, form elements */
  --font-weight-semibold: 600; /* Buttons, badges, emphasis */
  --font-weight-bold: 700;     /* Prices, totals, strong emphasis */

  /* === Line Heights === */
  --line-height-tight: 1;      /* Icons, single-line elements */
  --line-height-normal: 1.3;   /* Default body text */
  --line-height-relaxed: 1.5;  /* Long-form text, onboarding */
}
```

**Rule:** No hardcoded font sizes. If 13px, 18px, or 40px appear anywhere, they must be replaced with the nearest token or a new token must be added to this scale with justification.

### Border Radius

```css
:root {
  --radius-sm: 4px;    /* Subtle rounding: inputs, small buttons */
  --radius-md: 6px;    /* Standard: cards, primary buttons */
  --radius-lg: 12px;   /* Pronounced: sheets, modal corners */
  --radius-pill: 999px; /* Full pill: filter pills, badges */
}
```

**Change from current:** `--radius-lg` changes from 16px to 12px. Dashboard filter pills move from hardcoded 18px to `--radius-pill`. Sheet top corners use `--radius-lg`.

### Component Heights

```css
:root {
  /* === Interactive Element Heights === */
  /* One height for everything interactive: 48px. No exceptions. */
  --height-touch-min: 48px;    /* MINIMUM height for any tappable element */
  --height-button: 48px;       /* All buttons */
  --height-input: 48px;        /* Form inputs */
  --height-numpad-btn: 48px;   /* Number pad keys (same as buttons) */

  /* === Layout Heights === */
  --height-header-context: 24px;  /* Context strip (sale name, day, discount) */
  --height-header-buttons: 48px;  /* Header button bar */
  --height-header: 72px;          /* Total header (context + buttons) */
  --height-total-bar: 36px;       /* Running total bar */

  /* === Spacing for Modals === */
  --sheet-padding: 24px;       /* Bottom sheet internal padding */
}
```

**Critical rule:** `--height-touch-min: 48px` is the absolute floor. Nothing tappable can be shorter than this. This is non-negotiable — our users are 40–70 years old, standing up, in poor lighting, with a line of customers behind them.

### Shadows & Elevation

```css
:root {
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);                     /* Subtle lift */
  --shadow-md: 0 2px 8px rgba(0, 0, 0, 0.12);                     /* Cards, buttons */
  --shadow-lg: 0 4px 16px rgba(0, 0, 0, 0.15);                    /* Modals, sheets */
  --shadow-qr: 0 2px 12px rgba(0, 0, 0, 0.15);                    /* QR code container */
}
```

### Transitions

```css
:root {
  --transition-fast: 100ms ease;    /* Button press, color change */
  --transition-normal: 200ms ease;  /* Expand/collapse, screen transitions */
}
```

---

## §2. Component Standards

Every component in the app must conform to these specs. When building or modifying any screen, use these components — do not create one-off styles.

### Buttons

**One size, four colors. That's it.**

#### Size: Standard (all buttons and numpad keys)
```
height: var(--height-button)          /* 48px */
font-size: var(--font-size-lg)        /* 16px */
font-weight: var(--font-weight-semibold)  /* 600 */
padding: 0 var(--space-xl)            /* 0 16px */
border-radius: var(--radius-md)       /* 6px */
```

Numpad keys use the same 48px height but with `--font-size-xl` (20px) and `--font-weight-bold` (700) for a calculator feel.

#### Color: Primary (navigation, secondary actions)
```
background: var(--color-primary)
color: var(--color-text-on-primary)
border: none
:active → background: var(--color-primary-dark)
```

#### Color: Success (positive/confirm — "Add Item", "Start Sale", "Mark as Paid")
```
background: var(--color-success)
color: var(--color-text-on-success)
border: none
:active → background: var(--color-success-dark)
```

#### Color: Danger (destructive — "End Estate Sale", "Clear All")
```
background: transparent
color: var(--color-danger)
border: 1px solid var(--color-danger)
:active → background: var(--color-danger-light)
```

#### Color: Neutral (secondary/ghost — "New Customer", "Cancel", header nav)
```
background: var(--color-surface)
color: var(--color-text)
border: 1px solid var(--color-border)
:active → background: var(--color-bg-hover)
```

**Button rules:**
- Every button gets `cursor: pointer`
- Every button gets `-webkit-tap-highlight-color: transparent`
- Disabled state: `opacity: 0.4; pointer-events: none`
- No button in the app is shorter than `--height-touch-min` (48px)
- Full-width buttons in modals/sheets: `width: 100%`
- Icon-only buttons (like remove): still 48x48px minimum, use the same color variants

### Inputs

```
height: var(--height-input)             /* 48px */
font-size: var(--font-size-base)        /* 14px */
padding: 0 var(--space-lg)              /* 0 12px */
border: 1px solid var(--color-border)
border-radius: var(--radius-sm)         /* 4px */
background: var(--color-surface)
:focus → border-color: var(--color-border-focus)
:focus → outline: none
::placeholder → color: var(--color-text-secondary)
```

**All inputs are 48px tall.** No exceptions. The current discount row inputs at 40px must increase.

### Cards / List Items

```
padding: var(--space-md) var(--space-lg)    /* 8px 12px */
border-bottom: 1px solid var(--color-border)
background: var(--color-surface)
min-height: var(--height-touch-min)         /* 48px if tappable */
```

Item rows in the checkout list, dashboard transaction rows, and payment item rows all use this pattern.

### Status Badges

```
display: inline-flex
padding: var(--space-xs) var(--space-md)    /* 2px 8px */
border-radius: var(--radius-pill)           /* 999px */
font-size: var(--font-size-sm)              /* 12px */
font-weight: var(--font-weight-semibold)    /* 600 */
```

| Status  | Text Color              | Background                   |
|---------|-------------------------|------------------------------|
| Paid    | `--color-success`       | `--color-success-light`      |
| Pending | `--color-pending`       | `--color-pending-light`      |
| Unpaid  | `--color-danger`        | `--color-danger-light`       |
| Void    | `--color-text-secondary`| `--color-bg-hover`           |

### Bottom Sheets / Modals

```
/* Backdrop */
position: fixed; inset: 0;
background: var(--overlay-medium)
z-index: 100

/* Sheet */
position: fixed;
bottom: 0; left: 0; right: 0;
background: var(--color-surface-raised)
border-radius: var(--radius-lg) var(--radius-lg) 0 0
padding: var(--space-2xl)                   /* 24px */
max-height: 80vh
overflow-y: auto

/* Sheet title */
font-size: var(--font-size-xl)             /* 20px */
font-weight: var(--font-weight-bold)       /* 700 */
margin-bottom: var(--space-xl)             /* 16px */

/* Sheet buttons — stacked, full-width */
display: flex; flex-direction: column;
gap: var(--space-lg)                        /* 12px */
```

All sheet buttons use the standard button sizes and colors from above. Primary action is a Large Success or Large Primary button. Cancel/dismiss is a Standard Neutral button.

### Filter Pills (Dashboard)

```
height: var(--height-touch-min)             /* 48px */
padding: 0 var(--space-xl)                  /* 0 16px */
border-radius: var(--radius-pill)           /* 999px */
font-size: var(--font-size-base)            /* 14px */
font-weight: var(--font-weight-medium)      /* 500 */
border: 1px solid var(--color-border)
background: var(--color-surface)
```

Active state uses the corresponding status color as background with white text. **Current 36px height must increase to 48px.**

### Order Name Input

```
height: 28px              /* intentional: supplementary input, not primary interactive element */
font-size: var(--font-size-sm)
color: var(--color-text-secondary)
background: var(--color-bg)
border: 1px solid var(--color-border)
border-radius: var(--radius-sm)
```

**Note:** This is an intentional exception to the 48px minimum height rule. The order name input is supplementary — the primary workflow doesn't require naming orders. The 28px height keeps it visually subordinate to the running total bar and item list.

**Note:** `ticket.html` is a standalone customer-facing page with its own inline styles. It is intentionally outside the design system — it must render without importing app CSS/JS.

### Remove / Delete Buttons (Item List)

```
width: var(--height-touch-min)              /* 48px */
height: var(--height-touch-min)             /* 48px */
border: none
background: transparent
color: var(--color-danger)
font-size: var(--font-size-xl)              /* 20px */
display: flex; align-items: center; justify-content: center;
```

**Current 32x32px must increase to 48x48px.** This is the single most impactful touch target fix.

---

## §3. Screen-by-Screen Fixes

All screen-specific fixes implemented. See §2 for component specs. Every screen conforms to the token system and 48px touch target minimum.

---

## §4. Hardcoded Value Elimination Checklist

After implementing §1–§3, run this audit to catch any remaining hardcoded values:

### Colors to grep for and replace
```
#fef2f2          → var(--color-danger-light) or remove
#b45309          → var(--color-pending)
#000             → var(--color-scan-bg) or var(--color-text)
#999             → var(--color-disabled) or var(--color-text-secondary)
#fff / white     → var(--color-text-on-dark) or var(--color-surface) as appropriate
rgba(0, 0, 0,   → use appropriate --overlay-* token
rgba(220, 38,    → use --color-danger-light or animation-specific token
rgba(217, 119,   → use --color-pending-light
rgba(22, 163,    → use --color-success-light or --overlay-success
rgba(37, 99,     → use --color-primary-light
```

### Font sizes to grep for and replace
```
13px  → var(--font-size-sm) or var(--font-size-xs)
18px  → var(--font-size-lg)
20px (non-variable) → var(--font-size-xl)
40px  → var(--font-size-price)
48px  → icon-specific token
72px  → icon-specific token
```

### Spacing to grep for and replace
```
16px (padding/margin/gap) → var(--space-xl)
24px (non-sheet-padding)  → var(--space-2xl)
32px                      → var(--space-3xl)
18px                      → var(--space-xl) or calc expression
```

### Heights to check
```
32px (interactive) → var(--height-touch-min) minimum
36px (interactive) → var(--height-touch-min) minimum
40px (buttons)     → var(--height-button) or var(--height-touch-min)
44px (inputs)      → var(--height-input) (48px)
```

---

## §5. Design Philosophy & Rules for Building

These rules must be followed for ALL future code — not just the design system overhaul. They apply to every CSS change, every new screen, every component modification.

### The Cardinal Rules

**1. Nothing tappable is shorter than 48px.**
This is the most important rule. If a human finger needs to touch it, it's 48px minimum. No exceptions. Not for "secondary" actions, not for "rarely used" buttons, not for icon buttons. 48px minimum, always.

**2. Every value comes from a token.**
No hardcoded colors, no hardcoded font sizes, no hardcoded spacing, no hardcoded radii. If the value you need doesn't exist as a token, add it to the token system in `:root` first, then use it. This is how we maintain consistency across screens.

**3. One component, one pattern.**
A button looks the same everywhere. An input looks the same everywhere. A card looks the same everywhere. There are not "checkout buttons" and "dashboard buttons" — there are buttons, and they use the standard button specs from §2.

**4. Fewer unique values = better.**
The app should use a minimal set of sizes. If we have 8 different button heights, something is wrong. Target: 1 height for everything interactive (48px). Buttons, inputs, numpad keys — all 48px. That's it.

**5. Mobile-first means mobile-only (for now).**
Design for 375px width, one-handed use, standing up, phone in hand. There are no tablet optimizations, no desktop layouts, no responsive breakpoints. If it works beautifully on an iPhone SE, it works everywhere we need it to.

**6. The number pad is the hero.**
On the checkout screen, the number pad dominates via its 3×4 grid — the largest visual block on the screen. Keys are 48px (same as all buttons) but use bold weight and large font for a calculator feel. High contrast, instant feedback. Everything else on the checkout screen is secondary to the pad.

**7. White space is not wasted space.**
Generous padding between elements prevents mis-taps and reduces cognitive load. When in doubt, add more space, not less. The checkout screen is tight by necessity (viewport fitting), but setup, dashboard, and modal screens should breathe.

**8. Color communicates function.**
Green = positive action or success (add item, start sale, mark paid, paid badge). Red = destructive or negative (remove, clear, end sale, void, unpaid badge). Blue = navigation or informational (dashboard, primary actions). Orange = waiting/pending. Gray = neutral or secondary. That's the complete color vocabulary. No decorative color.

### CSS Organization Rules

- `:root` tokens at the top, organized by category (colors, spacing, typography, heights, radii, shadows, transitions)
- Reset/base styles next
- Shared components (buttons, inputs, cards, badges, sheets) next
- Screen-specific styles last, organized by screen (checkout, setup, payment, dashboard, qr, scan, onboarding)
- Within each screen section, styles follow visual top-to-bottom order
- Comments use `/* === Section Name === */` format
- No deeply nested selectors (max 2 levels)
- Class names use BEM-like convention: `.block__element--modifier`

### Naming Conventions

All class names follow the existing BEM-ish pattern. Do not introduce new naming patterns.

```
.component              → Block
.component__child       → Element within block
.component--variant     → Modifier on block
.component__child--variant → Modifier on element
```

Examples from the current codebase (keep these patterns):
```
.header__btn--danger
.item-row__remove
.dashboard-filter--active
.sheet__btn--confirm
```

---

## §6. Implementation Prompts

These are structured prompts for a coding session. Each prompt is a self-contained unit of work that can be done sequentially.

### Prompt 1: Replace CSS Token System ✅
### Prompt 2: Standardize All Buttons ✅
### Prompt 3: Flatten Button Heights + Standardize Inputs ✅
### Prompt 4: Fix Touch Targets + Replace Hardcoded Colors ✅ (combined with Prompt 5)
### Prompt 5: Item List UX Overhaul + Numpad Resize ✅
### Prompt 6: Replace All Hardcoded Sizes + Item Numbering + Inline Flash ✅
### Prompt 7: Fix Item Numbering + Standardize Status Badges ✅
### Prompt 8: Standardize Bottom Sheets + Screen-by-Screen Polish ✅ (combined with Prompt 9)
### Prompt 10: Final Audit ✅

---

## §7. What Success Looks Like

After the design system implementation is complete, the app should:

- **Feel like one product.** A user moving from checkout → QR → payment → dashboard should feel like they're in the same app, not jumping between different prototypes.
- **Feel like a calculator, not software.** The checkout screen is dominated by the number pad. Buttons are large and obvious. There are no menus, no settings panels, no complex navigation trees.
- **Be usable by a 60-year-old standing in a crowded house.** Big touch targets (48px+), high contrast text, clear visual hierarchy, immediate feedback on every tap.
- **Earn trust at first glance.** A polished, consistent design signals "this is a real tool" not "someone's side project." Operators need to trust this enough to replace their adding machine.
- **Have zero hardcoded values.** Every design decision flows from the token system. Changing the primary color or spacing scale can be done by editing `:root` and having it cascade everywhere.

---

## Revision History

| Date | What Changed |
|------|-------------|
| 2026-03-03 | Initial version — complete design system spec with tokens, components, screen fixes, philosophy, and implementation prompts |
| 2026-03-03 | Design system implementation complete. All 10 prompts executed. System fully tokenized. |

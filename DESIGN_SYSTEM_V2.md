# DESIGN SYSTEM V2 — Estate Checkout

**Date:** 2026-04-23
**Status:** Authoritative reference. All new implementation must conform to this document. Supersedes `DESIGN_SYSTEM.md` (kept for history).
**Direction:** iOS-native. Primary reference: Apple Wallet. Secondary: Venmo (amount entry). Tertiary: Facebook Creating Event (multi-step forms).

---

## How to use this document

This is the single source of truth for every visual, structural, and interaction decision in the app. It has two parts:

- **Part 1 — Product:** the *what* and *when*. Design principles, banned patterns, pattern catalog, screen archetypes, interaction rules. Read this when deciding what to build.
- **Part 2 — Frontend:** the *how*. Tokens, component library, implementation rules, quality gates. Read this when writing code.

**Before adding any new UI:**
1. Find the matching pattern in §1.3 or screen archetype in §1.4
2. Assemble from existing components in §2.2
3. Never invent a new component without updating this doc first

**When in doubt:** defer to iOS-native behavior. The user is a 58-year-old estate sale operator whose frame of reference is Apple Wallet and Venmo. Anything that feels "like software" violates this spec.

---

# PART 1 — PRODUCT SPEC

## §1.1 Design principles (inviolate)

These are non-negotiable. If a decision conflicts with a principle, the principle wins.

1. **It's a tool, not an app.** If a decision makes it feel like software — decorative shadows, gradients, startup colors, "fun" illustrations, marketing-style hero sections — reverse it. Apple Wallet is the vibe target: calm, native, trustworthy, invisible.

2. **One hero per screen.** Every screen has exactly ONE element that is visually loudest. On Checkout it's the running total. On Order Detail it's the order name + status pill. On Dashboard it's today's revenue. Everything else supports. No ties, no competing heroes.

3. **Primary action lives in the thumb zone.** Pinned to the bottom, full-width (minus side margins), filled color, single clear label. One primary per screen.

4. **Status is a pill with icon + color + word.** Never only color. Never only a word. The three together make it instant-readable across age and literacy.

5. **Cards group, never decorate.** A tinted rounded rectangle exists ONLY to visually group related info (e.g. Order ID + Email + Total). No decorative cards, no cards-in-cards, no cards for visual rhythm.

6. **Live state updates, no success modals.** When something changes (item added, order paid), the view updates in place. Optional "Marked paid now" subtitle. No toasts, no "Success! ✓" screens, no celebration animations.

7. **Confirm destructive, not affirmative.** Adding an item: happens immediately. Voiding an order, deleting a sale: bottom sheet with red destructive action. Never confirm safe actions.

8. **Native iOS conventions, always.** Back arrow top-left, share/more top-right, bottom sheets not mid-screen modals, context menus for "..." actions, segmented pill controls for view switching. If iOS does it, we do it that way.

9. **Consignor is a first-class citizen of every order.** When a sale has consignors, every item entry shows the consignor chip, every order recap shows the consignor, every dashboard row shows consignor breakdown. Never hidden, never optional to surface.

10. **Offline is the default state.** The app must never show "loading" or "no connection" during core checkout. All checkout-critical behavior works in airplane mode. Sync is invisible if/when it exists.

## §1.2 Banned patterns

Hard "no." If you find yourself reaching for any of these, stop:

- Blue gradients, purple gradients, any gradient for decoration (status gradients in Instagram QR are an exception we do not need)
- Drop shadows for "elevation" except on bottom sheets that are actually floating
- Tailwind-style palette values (`blue-600`, `green-600`, etc.) — use iOS system colors only
- Inter font (not installed; do not install)
- Icons without labels (exception: ubiquitous iOS glyphs — back arrow, share, more, close)
- "Success!" modals with checkmark animations
- Tooltips for user-facing explanation (build clarity into the screen)
- Cards-inside-cards
- Oversized padding that creates artificial breathing room
- Branded custom numpad styling — numpad must feel native iOS
- Dark mode in v1 (light mode only — dark mode is a v2 conversation)
- Any color not in the palette tokens
- Any font-size not in the type scale
- Any spacing value not in the spacing scale
- Grid-of-icons menus (Facebook-style) — use iOS Settings-style grouped list instead
- Loading spinners in checkout-critical paths
- Full-screen modals for confirmations (use bottom sheets)

## §1.3 Pattern catalog

For every product need, the named pattern to use. Components are defined in §2.2.

| Need | Pattern | Reference |
|---|---|---|
| Show one key number (total, revenue) | **Hero Number** | Wallet Balance Details, Venmo Send |
| Group related facts | **Grouped List Card** | Wallet (every screen) |
| Switch between views of same data | **Segmented Pill Control** | Wallet Week/Month/Year |
| Filter a list quickly | **Horizontal Filter Chips** | YouTube filters, Venmo filter row |
| Show an order's state | **Status Pill** | Wallet "Shipped ✓" / "Complete ✓" |
| Confirm a destructive action | **Bottom Sheet + red destructive** | Wallet Delete Order |
| Open a menu of actions on an item | **Context Menu (native popover)** | Wallet "..." Mark/Delete |
| Show empty list | **Empty State** | Wallet "No Orders" |
| Capture a sequence of inputs | **Multi-step form + pinned Continue** | FB Creating Event |
| Enter an amount | **Hero Number + Numpad + Primary** | Venmo Send |
| Tag an item with a category | **Inline Chip Selector** | Venmo Privacy toggle |
| Primary action on screen | **Filled Primary Button (bottom-anchored)** | Venmo Pay |
| Secondary non-destructive action | **Blue Text Link** | Wallet "Manage Order" |
| Destructive link action | **Red Text Link** | Wallet "Delete Order" |
| Pick from many options | **Bottom Sheet w/ list** | Wallet Export Transactions (CSV/OFX/QFX) |
| Settings / menu | **iOS grouped list** | Apple Settings app |

## §1.4 Screen archetypes

Estate Checkout has 8 screen archetypes. Every screen in the app must fit one.

### A. List Screen
*Examples: Dashboard, item list inside an order, transaction history*

- **Top:** screen title (big bold)
- **Below title:** Hero Number card (one key metric — e.g. "Today's Revenue $1,247")
- **Below hero:** Segmented Pill Control (if multiple views exist — e.g. Pending/Paid/Voided)
- **Below segment:** Horizontal Filter Chips (if sub-filters apply)
- **Body:** list rows grouped in Grouped List Cards
- **Top-right:** "..." context menu (if bulk actions exist)
- **Bottom-anchored primary action** ONLY if there is exactly one "add" action available

### B. Detail Screen
*Examples: Order Detail*

- **Top:** back arrow (left), share/more (right)
- **Hero:** merchant-style icon or emoji, centered
- **Name/title:** centered, large
- **Subtitle:** ordered/created timestamp, centered, secondary color
- **Status Pill:** centered or full-width below the subtitle
- **Items:** product rows in a Grouped List Card
- **Metadata:** Grouped List Card with Total, Item count, Consignor summary
- **Actions:** Blue Text Links for non-destructive, Red Text Link for destructive (e.g. Void)
- **NO bottom-anchored button** on Detail screens — actions live in the link list

### C. Entry Screen
*Examples: Checkout (item entry)*

- **Top:** running total as Hero Number, huge, centered
- **Below hero:** item description Text Input (like Venmo "What's this for?")
- **Below input:** Numpad (centered, iOS-native styling)
- **Below numpad:** Inline Chip Selector for consignor (ONLY if sale has consignors)
- **Bottom:** Primary Button "Add Item" (filled green, full-width)

### D. Setup Wizard Screen
*Examples: Sale setup, new sale flow*

- **Top:** back arrow (left), optional step indicator (center), close X (right)
- **Screen title:** big bold
- **Form:** fields stacked, labels above inputs
- **Pickers:** open in Bottom Sheets (dates, consignor lists, discount schedules)
- **Bottom:** Primary Button "Continue"

### E. Confirmation Screen
*Examples: QR handoff*

- **Top:** close X (right) — this is a transient state, not a navigable one
- **Hero:** the content being handed off (giant QR code)
- **Context:** order summary below the hero (small, secondary)
- **Instruction:** single line of explicit copy — e.g., "Hand this phone to your payment worker"
- **Action:** one blue Text Link for the self-scan alternate path (e.g., "Mark as paid without scanning")

### F. Empty State
*Examples: No sales yet, no items in order*

- Centered vertically in the available space
- **Icon:** 64×64, outlined/stroke style, secondary color
- **Heading:** "No sales yet" (title size, semibold)
- **Helper text:** what will appear here when it does (body size, secondary color, max 2 lines)
- **Single text link** for primary action (e.g. "Start a sale")

### G. Settings / Menu Screen
*Examples: main menu, settings*

- iOS Settings-style Grouped List Cards
- **Never a grid of icons** (Facebook grid is banned — too busy)
- Each row: icon left (small, semantic color), label, chevron right
- Group related settings into separate cards

### H. Bottom Sheet
*For: confirmations, pickers, context actions that need more than a menu*

- **Handle indicator** at top (36×5, tertiary color, centered)
- **Short title**, no body text unless needed
- **Primary action:** filled color; destructive: red
- **Close:** X top-right OR pull-to-dismiss
- **Max height:** 85vh — content scrolls

## §1.5 Interaction rules

- **Tap targets:** never below 48×48 px. This includes padding — visual size can be smaller.
- **Tap feedback:** subtle scale-down on press (0.97×), no glows/shadows.
- **State change feedback:**
  - Adding an item: row fades in at top of list, optional inline "Added!" flash label (1s)
  - Marking paid: status pill color changes instantly + subtitle updates to "Marked paid now"
  - Voiding: item greys out with strikethrough, status pill changes to "Voided" red
- **Keyboards:** use native iOS numeric keyboard where input is a standard numeric field. Custom numpad only on the primary Checkout entry screen.
- **Haptic feedback:** subtle tap on Primary actions (Add Item, Mark Paid, Void). Use `navigator.vibrate(10)` if available.
- **Transitions:**
  - Detail drill-in: push from right
  - Bottom sheet: slide up from bottom
  - Dismissal: reverse of entry
  - No fade-in for primary navigation — feels slow
- **Error states:** inline text below the field, red color, never a popup

## §1.6 Consignor rules

Consignors are a real-world requirement per Alissa's feedback from estate sale operators. They must be:

- **Optional:** sales without consignors continue to work exactly as before
- **First-class when present:** if a sale has consignors, they appear everywhere an order or item is shown
- **Editable anytime:** including for paid orders (consignor is a reporting field, not a financial state)
- **Retroactively assignable:** if an item is rung up without a consignor, the operator can assign one later from the item or order view

### Specific UX rules

- **Setup page:** "Add consignors" is a first-class step, not buried. Tap "+ Add Consignor" → type name → done. Add as many as needed. Skip if none.
- **Inline at item entry:** if sale has ≥1 consignor, the consignor chip appears above the "Add Item" button. Default: last-used consignor for this session. Tap chip to change (opens bottom-sheet picker).
- **Editable post-entry:** every item row in an order shows its consignor chip. Tap to edit — even for paid orders.
- **Add consignor retroactively:** from the sale setup page OR from the consignor picker ("+ Add Consignor" option at bottom of picker list).
- **Per-order default:** sale setup has "Default consignor for new items" (optional single-select). Saves taps for single-consignor orders.
- **Dashboard:** "Revenue by consignor" is a Grouped List Card on the Dashboard whenever the sale has consignors. Simple rows: Name | $total | # items | % of revenue.
- **CSV export:** `consignor` column is always included when sale has consignors.

---

# PART 2 — FRONTEND SPEC

## §2.1 Tokens

All tokens live in `css/styles.css` under `:root`. No hardcoded values outside this block. Verified by: grep for hex colors, px values, and font-sizes outside `:root`.

### Colors (iOS system)

```css
:root {
  /* === Surfaces === */
  --color-bg: #F2F2F7;                  /* iOS systemGroupedBackground */
  --color-surface: #FFFFFF;
  --color-surface-tinted: #F2F2F7;      /* grouped list cards on white bg */

  /* === Text === */
  --color-text: #1C1C1E;                /* iOS label */
  --color-text-secondary: #8E8E93;      /* iOS secondaryLabel */
  --color-text-tertiary: #C7C7CC;       /* iOS tertiaryLabel */
  --color-text-on-primary: #FFFFFF;
  --color-text-link: #007AFF;           /* iOS systemBlue */
  --color-text-destructive: #FF3B30;    /* iOS systemRed */

  /* === Semantic === */
  --color-primary: #007AFF;             /* iOS systemBlue */
  --color-success: #34C759;             /* iOS systemGreen */
  --color-danger: #FF3B30;              /* iOS systemRed */
  --color-pending: #FF9500;             /* iOS systemOrange */
  --color-warning: #FFCC00;             /* iOS systemYellow (rare) */

  /* === Status pill backgrounds (15% opacity of semantic color) === */
  --color-status-paid-bg: rgba(52, 199, 89, 0.15);
  --color-status-pending-bg: rgba(255, 149, 0, 0.15);
  --color-status-voided-bg: rgba(255, 59, 48, 0.15);

  /* === Borders & dividers === */
  --color-border: #C6C6C8;              /* iOS separator */
  --color-border-focus: var(--color-primary);
  --color-divider: #E5E5EA;             /* lighter separator (between rows) */

  /* === Interactive states === */
  --color-bg-hover: #E5E5EA;
  --color-bg-active: #D1D1D6;
  --color-disabled: #AEAEB2;

  /* === Overlays === */
  --overlay-sheet-backdrop: rgba(0, 0, 0, 0.4);
  --overlay-scan-bg: #000000;

  /* === Button tints (semi-transparent for secondary buttons) === */
  --color-primary-tint: rgba(0, 122, 255, 0.15);
  --color-success-tint: rgba(52, 199, 89, 0.15);
}
```

### Typography

```css
:root {
  --font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Segoe UI', Roboto, sans-serif;
  --font-family-number: -apple-system, 'SF Pro Rounded', ui-rounded, system-ui, sans-serif;

  /* Scale */
  --font-size-hero: 56px;         /* running total, today's revenue */
  --font-size-title-large: 32px;  /* screen titles (Wallet "Balance Details") */
  --font-size-title: 22px;        /* card titles, section headers */
  --font-size-body-large: 20px;   /* numpad digits */
  --font-size-body: 17px;         /* default body text, row labels */
  --font-size-footnote: 13px;     /* timestamps, helper text, pill labels */
  --font-size-caption: 11px;      /* rare — only when space-constrained */

  /* Weight */
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  /* Line-height */
  --line-height-tight: 1.1;       /* hero numbers */
  --line-height-default: 1.4;     /* body */
  --line-height-relaxed: 1.5;     /* paragraphs */
}
```

### Spacing (7-tier)

```css
:root {
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 12px;
  --space-lg: 16px;
  --space-xl: 20px;
  --space-2xl: 28px;
  --space-3xl: 40px;
}
```

### Radii

```css
:root {
  --radius-sm: 8px;     /* chips, small pills */
  --radius-md: 10px;    /* buttons (iOS default) */
  --radius-lg: 14px;    /* grouped list cards (iOS default) */
  --radius-xl: 20px;    /* bottom sheets (top corners) */
  --radius-pill: 999px; /* status pills, segmented control inner pills */
}
```

### Shadows

iOS uses almost none. Default is `none`.

```css
:root {
  --shadow-none: none;
  --shadow-sheet: 0 -4px 20px rgba(0, 0, 0, 0.08);   /* bottom sheets */
  --shadow-floating: 0 2px 8px rgba(0, 0, 0, 0.06);  /* FABs or true floats, rare */
}
```

### Motion

```css
:root {
  --duration-fast: 150ms;
  --duration-default: 250ms;
  --duration-slow: 400ms;
  --ease-standard: cubic-bezier(0.4, 0.0, 0.2, 1);
  --ease-decelerate: cubic-bezier(0.0, 0.0, 0.2, 1);
  --ease-accelerate: cubic-bezier(0.4, 0.0, 1, 1);
}
```

### Component heights

```css
:root {
  --height-interactive: 48px;        /* buttons, inputs, list rows */
  --height-interactive-small: 36px;  /* pills, chips (with generous padding) */
  --height-interactive-large: 56px;  /* primary CTA at bottom */
}
```

## §2.2 Component library

All components live in `css/styles.css`. All classes prefixed `.ec-`.

### Buttons

**`.ec-btn-primary` — Filled Primary Button**
- Use: the ONE primary action per screen (Add Item, Continue, Mark Paid)
- Background: `--color-primary` or `--color-success` (green for "add/confirm")
- Text: `--color-text-on-primary`, semibold, body size
- Height: `--height-interactive-large` (56px)
- Radius: `--radius-md`
- Width: full-width minus `--space-lg` margins on each side
- Position: bottom-anchored with `--space-lg` bottom margin

**`.ec-btn-secondary` — Tinted Secondary Button**
- Use: only when TWO buttons are genuinely paired (rare — Venmo Request/Pay is the archetype)
- Background: `--color-primary-tint`
- Text: `--color-primary`, semibold
- Same height/radius as primary

**`.ec-btn-destructive` — Destructive Button**
- Use: bottom sheet destructive confirmation only ("Delete", "Void", "Cancel Sale")
- Background: `--color-danger`
- Text: white, semibold
- Same height/radius

**`.ec-link-primary` — Blue Text Link**
- Use: non-destructive secondary actions inside detail screens and cards
- Color: `--color-primary`, semibold, body size
- No background, no border
- Padding: `--space-md` vertical, 0 horizontal (hit area generous, visual minimal)

**`.ec-link-destructive` — Red Text Link**
- Same as blue link but `--color-danger`
- Use: "Void Order", "Delete Sale" inside detail screens

### Inputs

**`.ec-input` — Text Input**
- Background: `--color-surface`
- Border: 1px solid `--color-divider`
- On focus: 2px border `--color-primary`
- Height: `--height-interactive`
- Radius: `--radius-md`
- Padding: 0 `--space-md`
- Font: body size, regular
- Label above (small footnote, secondary color)

**`.ec-numpad` — Custom Numpad (Checkout only)**
- Grid: 4 rows × 3 cols, `--space-sm` gap
- Key size: 64×64 min
- Key: `.ec-numpad-key`
  - Background: `--color-surface`
  - Border: 1px solid `--color-divider`
  - Font: `--font-size-body-large`, regular
  - Color: `--color-text`
- Special keys (backspace, decimal): `--color-surface-tinted` background
- No labels below keys — just the digit/icon

### Containers

**`.ec-card` — Grouped List Card**
- Background: `--color-surface`
- Radius: `--radius-lg`
- Padding: 0 (content has its own padding)
- No shadow
- Optional 1px `--color-border` around for emphasis
- Rows inside: 48px min height, full-width, `--space-lg` horizontal padding
- Between rows: 1px `--color-divider` inset `--space-lg` from left (iOS-style)
- Max 7 rows — split into separate cards above that
- Stack gap between cards: `--space-2xl`

**`.ec-card__row` — Card Row**
- Flex, space-between, `--space-lg` gap
- Label (left): body size, regular, `--color-text`
- Value (right): body size, regular, `--color-text` (tabular-nums for amounts)

### Status

**`.ec-pill-status` — Status Pill**
- Shape: `--radius-pill`
- Padding: `--space-xs` `--space-sm`
- Font: `--font-size-footnote`, semibold
- Gap: `--space-xs` between icon and label
- Variants:
  - `.ec-pill-status--paid`: bg `--color-status-paid-bg`, text+icon `--color-success`, label "Paid" + check icon
  - `.ec-pill-status--pending`: bg `--color-status-pending-bg`, text+icon `--color-pending`, label "Pending" + dot icon
  - `.ec-pill-status--voided`: bg `--color-status-voided-bg`, text+icon `--color-danger`, label "Voided" + x icon

### Controls

**`.ec-segmented` — Segmented Pill Control**
- Container: full-width, `--color-surface-tinted` bg, `--radius-pill`, `--space-xs` padding
- Inner pills: `.ec-segmented__option`, flex-1, `--radius-pill`
- Active pill: `--color-surface` bg, `--shadow-floating`, semibold text
- Inactive pills: transparent bg, regular weight, `--color-text-secondary`
- Use for: view switching (2-4 options max)

**`.ec-chips` — Horizontal Filter Chips**
- Container: scrollable row, `--space-md` gap, no visible scrollbar
- Each chip: `.ec-chip`
  - Background: `--color-surface`
  - Border: 1px `--color-border`
  - Radius: `--radius-pill`
  - Padding: `--space-sm` `--space-md`
  - Font: footnote, semibold
  - Icon + label inline, `--space-xs` gap, optional count badge on right
- Active chip: `--color-primary` bg, white text, no border

**`.ec-chip-selector` — Inline Chip Selector (e.g. consignor chip)**
- Pill-shaped, tap to open picker
- Background: `--color-surface-tinted`
- Border: 1px `--color-border`
- Padding: `--space-sm` `--space-md`
- Font: body size, semibold
- Icon (left) + label + chevron down (right)

### Overlays

**`.ec-sheet` — Bottom Sheet**
- Radius: `--radius-xl` on TOP corners only, 0 on bottom
- Background: `--color-surface`
- Shadow: `--shadow-sheet`
- Handle indicator: 36×5, `--color-text-tertiary`, `--radius-pill`, centered at `--space-md` from top
- Padding: `--space-lg`
- Backdrop: `--overlay-sheet-backdrop`
- Max height: 85vh, content scrolls

**`.ec-menu-context` — Context Menu (iOS native popover)**
- Small floating panel, `--radius-lg`, `--color-surface` bg
- Max 5 options, each a row with icon + label
- Destructive options: red text, separated from non-destructive by a divider
- Shadow: `--shadow-floating`
- Backdrop blur if feasible (iOS-native feel)

### Special

**`.ec-hero-number` — Hero Number**
- Font family: `--font-family-number`
- Size: `--font-size-hero` (56px)
- Weight: `--font-weight-bold`
- Color: `--color-text`
- Line-height: `--line-height-tight`
- `font-variant-numeric: tabular-nums`
- Currency symbol inline, 0.6× the number size

**`.ec-empty-state` — Empty State**
- Centered vertically in parent
- Icon: 64×64, outline style, `--color-text-secondary`
- Heading: `--font-size-title`, semibold, `--color-text`
- Helper: body, regular, `--color-text-secondary`, max 2 lines, centered
- Optional single `.ec-link-primary` below helper

## §2.3 File structure & implementation rules

### CSS organization
- `css/styles.css` contains: tokens → base styles → component classes → screen-specific overrides
- All components prefixed `.ec-` (no exceptions)
- No inline styles in HTML except genuinely dynamic values (computed widths, transition states)
- No `style=""` injection from JS except for dynamic cases

### HTML conventions
- Use semantic elements: `<button>` not `<div>` for buttons, `<nav>` for navigation, `<main>` for primary content
- `aria-label` on all icon-only buttons
- `role="dialog"` on bottom sheets, `role="menu"` on context menus
- All interactive elements keyboard-accessible (Enter/Space must activate)

### JS conventions
- No style generation inline; toggle classes instead
- Animations via CSS transitions; JS only for complex state choreography
- State via class-based modifiers: `.is-active`, `.is-disabled`, `.is-loading`, `.is-selected`

### When adding new UI

1. **Does an existing component fit?** Use it. (Answer: yes, 95% of the time.)
2. **Is it a new variant of an existing component?** Add a modifier class (e.g. `.ec-btn-primary--large`). Do not duplicate.
3. **Is it truly new?** Update this doc FIRST. Then build.

### When adding a new screen

1. Identify the archetype (§1.4, A–H)
2. Assemble from existing components in §2.2
3. If the archetype fits, do not invent a new one

### When adding a new interaction

1. Check §1.5 interaction rules
2. If unclear, default to native iOS behavior
3. Never invent novel interactions for core flows

## §2.4 Quality gates

Before any commit/deploy, verify:

- [ ] No hardcoded hex colors outside `:root`
- [ ] No hardcoded px sizes outside `:root` (positioning offsets are OK)
- [ ] No font-sizes outside the type scale
- [ ] All interactive elements meet 48×48 min tap target
- [ ] Semantic colors (green/orange/red) used only for status, never decoration
- [ ] Every screen has exactly one hero element
- [ ] Every screen has at most one bottom-anchored primary action
- [ ] No nested cards
- [ ] No "Success!" modals
- [ ] All destructive actions confirmed via bottom sheet + red text
- [ ] Status pills use icon + label + color (all three)
- [ ] No drop shadows except bottom sheets and (rare) floating elements
- [ ] All interactive elements have `:focus` states for keyboard accessibility

## §2.5 Migration plan (from current build to V2)

### Files affected
- `css/styles.css` — full token replacement, component class rewrite
- `index.html` — class name updates (old `.status-badge` → `.ec-pill-status`, etc.)
- `js/checkout.js`, `js/dashboard.js`, etc. — class toggles updated where needed

### Migration order (execute sequentially)

1. **Palette + typography token swap** — replace `:root` values only. No structural change. Vibe shift is immediate and evaluable on-phone.
2. **Screen title pass** — swap existing titles to `--font-size-title-large` bold style (Wallet-style)
3. **Status pills** — replace all status badges with `.ec-pill-status` variants
4. **Checkout screen** → Entry Screen archetype (Venmo pattern): hero total + numpad + consignor chip + bottom CTA
5. **Order detail sheet** → Detail Screen archetype (Wallet pattern): header + status pill + item card + metadata card + action links
6. **Dashboard** → List Screen archetype (Wallet Activity pattern): hero revenue card + segmented control + filter chips + transaction list
7. **QR handoff** → Confirmation Screen archetype: explicit copy, single alternate action link
8. **Context menu** for Mark Paid / Void / Delete — replace any existing "more" menus
9. **Bottom-sheet destructive confirmations** — replace any existing modal dialogs
10. **Consignor UX pass** — promote chip inline at entry, make editable post-paid, add retroactive assignment

### Checkpoint after step 3

After the palette/typography/pills are in, stop. Evaluate on phone. If the vibe shift doesn't feel right, reconsider BEFORE doing structural work (steps 4–10). This is cheap insurance against committing hours to a direction that doesn't land.

---

## Revision history

| Date | What changed |
|------|--------------|
| 2026-04-23 | Initial V2. Direction shift from Tailwind SaaS palette to iOS-native (Apple Wallet + Venmo + FB Creating Event references). Added consignor rules (§1.6) based on Alissa's field feedback. Added banned patterns (§1.2). Added screen archetype catalog (§1.4). Tokens fully replaced with iOS system values. |

# DESIGN SYSTEM — Estate Checkout

**Status:** **Migration complete + token gaps closed (v184).** As of v184 every component family in the catalog has been renamed to canonical `.ec-*` naming, with three documented exceptions (`.sheet` itself — too entangled to rename cheaply; `.consignor-color-chip` — already a `.ec-picker-button` modifier; `.join-code-status` — informational status, not a pure field-error). Tokens fully cleaned up: dead tokens removed, all magic numbers tokenized (28px sheet titles → `--font-size-title-medium`, 48px sheet hero amounts → `--font-size-display`), all hardcoded shadows tokenized (`--shadow-button`, `--shadow-card` added). The Flash toast was removed entirely — it violated principles 1.1.6 (success modals) and 1.5 (errors as popups); replaced by live state updates and inline `.ec-field-error` messages.

**Direction:** iOS-native. Primary reference: Apple Wallet. Secondary: Venmo (amount entry). Tertiary: Facebook Creating Event (multi-step forms).

---

## How to use this document

This is the source of truth for every visual, structural, and interaction decision in the app. Three parts:

- **Part 1 — Product:** the *what* and *when*. Design principles, banned patterns, pattern catalog, screen archetypes, interaction rules. Read this when deciding what to build.
- **Part 2 — Frontend:** the *how*. Tokens, component library, implementation rules, quality gates. Each component lists its target name (`.ec-*`) and the legacy name in current code.
- **Part 3 — Migration:** the rollout from legacy to target naming. Read this when shipping a refactor pass.

**Before adding any new UI:**
1. Find the matching pattern in §1.3 or screen archetype in §1.4.
2. Assemble from existing components in §2.2.
3. Use the **target** class name (`.ec-*`) only if the component's row in §3.2 says it has migrated. Otherwise use the legacy name listed in its §2.2 entry.
4. Never invent a new component without updating this doc first.

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

6. **Live state updates, no success modals, no toasts.** When something changes (item added, order paid), the view updates in place — the row animates in, the sheet closes, the running total updates. Optional "Marked paid now" subtitle on the order. No toasts, no "Success!" overlays, no celebration animations. (The `.ec-flash` toast was removed in v184; it had been carved out as an exception for "Added!" but the row-flash animation already conveys that signal — the toast was redundant.)

7. **Confirm destructive, not affirmative.** Adding an item: happens immediately. Voiding an order, deleting a sale: bottom sheet with red destructive action. Never confirm safe actions.

8. **Native iOS conventions, always.** Back arrow top-left, share/more top-right, bottom sheets not mid-screen modals, context menus for "..." actions. If iOS does it, we do it that way.

9. **Consignor is a first-class citizen of every order.** When a sale has consignors, every item entry shows the consignor chip, every order recap shows the consignor, every dashboard row shows consignor breakdown. Never hidden, never optional to surface.

10. **Offline is the default state.** The app must never show "loading" or "no connection" during core checkout. All checkout-critical behavior works in airplane mode. Sync is invisible if/when it exists.

## §1.2 Banned patterns

Hard "no." If you find yourself reaching for any of these, stop:

- Blue gradients, purple gradients, any gradient for decoration
- Drop shadows for "elevation" except on bottom sheets that are actually floating
- Tailwind-style palette values (`blue-600`, etc.) — use iOS system colors only
- Inter font (not installed; do not install)
- Icons without labels (exception: ubiquitous iOS glyphs — back arrow, share, more, close, hamburger)
- "Success!" modals with checkmark animations
- Tooltips for user-facing explanation (build clarity into the screen)
- Cards-inside-cards
- Oversized padding that creates artificial breathing room
- Branded custom numpad styling — numpad must feel native iOS
- Dark mode in v1 (light mode only)
- Any color not in the palette tokens
- Any font-size not in the type scale
- Any spacing value not in the spacing scale
- Grid-of-icons menus (Facebook-style) — use iOS Settings-style grouped list instead
- Loading spinners in checkout-critical paths
- Full-screen modals for confirmations (use bottom sheets)
- Hidden gestures as the only path to a destructive action (no swipe-to-delete; v168 removed it)
- Cancel buttons in hamburger menu sheets (v170 removed; tap-backdrop + swipe-down dismiss)
- Center-aligned text inputs except for OTP/code-style inputs (`.join-code-input`)
- Hardcoded hex colors anywhere outside `:root` (v176 removed the last two: `#fff` → `--color-text-on-danger`, `#aaa` → `--color-text-tertiary`)
- Buttons or sheets that drift from the canonical action-bar height (v174 standardized; v176 caught the payment screen)

## §1.3 Pattern catalog

For every product need, the named pattern to use. Components are defined in §2.2.

| Need | Pattern | Reference |
|---|---|---|
| Show one key number (total, revenue) | **Hero Number** | Wallet Balance Details, Venmo Send |
| Group related facts | **Grouped List Card** | Wallet (every screen) |
| Switch between views of same data | **Segmented Pill Control** | Wallet Week/Month/Year |
| Filter a list quickly | **Filter Pill + Bottom Sheet picker** | iOS Mail filter |
| Show an order's state | **Status Pill** | Wallet "Shipped ✓" / "Complete ✓" |
| Confirm a destructive action | **Confirm Destructive Sheet** | Wallet Delete Order |
| Open a menu of actions on an item | **Context Menu (native popover)** | Wallet "..." Mark/Delete |
| Show empty list | **Empty State** | Wallet "No Orders" |
| Capture a sequence of inputs | **Multi-step form + pinned Continue** | FB Creating Event |
| Enter an amount | **Hero Number + Numpad + Primary** | Venmo Send |
| Tag an item with a category | **Inline Chip Selector** | Venmo Privacy toggle |
| Primary action on screen | **Filled Primary Button (bottom-anchored)** | Venmo Pay |
| Secondary non-destructive action | **Blue Text Link** | Wallet "Manage Order" |
| Destructive link action | **Red Text Link** | Wallet "Delete Order" |
| Pick from many options | **Bottom Sheet w/ list** (Picker List) | Wallet Export Transactions |
| Settings / menu | **iOS grouped list** (Menu Sheet) | Apple Settings app |
| Batch-delete rows | **Edit Mode** (toggle + minus + confirm) | iOS Mail Edit |
| Inline field validation | **Inline Field Error** | iOS Settings |

## §1.4 Screen archetypes

Estate Checkout has 11 screen archetypes. Every screen in the app must fit one.

### A. List Screen
*Examples: Dashboard, item list inside an order, transaction history*

- **Top:** screen title (big bold)
- **Below title:** Hero Number card (one key metric — e.g. "Today's Revenue $1,247")
- **Below hero:** **Filter Pill row** — one Filter pill (label = active filter, opens Picker List sheet) + Sort pill on the same row. Replaces the older "horizontal filter chips" idea — chips overflowed on narrow viewports (the v169 fix).
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
*Examples: Add Item, Edit Item*

- **Top bar:** back arrow (left) + screen title (center, body semibold, e.g. "Add Item" or "Edit Item")
- **Hero:** the **value being entered** as a Hero Number — for item entry that's the **current item's price** (NOT the order's running total). The hero updates live as the user taps the numpad. Centered, 56px, SF Pro Rounded bold, tabular-nums.
- **Below hero:** description Text Input (Venmo "What's this for?" pattern). Mic icon inline at the right edge of the input — iOS Messages dictation pattern, not a separate side-by-side button.
- **Below input:** Quantity row (label + − value + buttons), only when qty > 1 is meaningful
- **Below qty:** Numpad (centered, iOS-native styling)
- **Below numpad:** Inline Chip Selector for consignor (ONLY if sale has consignors)
- **Bottom (sticky):** Primary Button. Label changes by mode: "Add Item" / "Save Changes". In Edit mode, a red Delete Item button stacks below Save Changes (v168).

**Implementation note:** Entry screens are presented as full-viewport overlays (height: 100dvh, not the 80dvh of a bottom sheet) so action buttons never fall below the fold. The `.entry-screen` class explicitly opts out of `.sheet::before` (no swipe handle).

### D. Setup Wizard Screen
*Examples: Sale setup, new sale flow*

- **Top:** menu button top-right (no back — Setup IS the root screen for un-started sales)
- **Screen title:** big bold (Wallet "Balance Details" sized)
- **Form:** **fields stack vertically, full width each, labels above inputs.** Side-by-side / half-row layouts are NOT permitted on mobile viewports. Date pickers especially break in two-column layouts (per v148).
- **Each form section:** wrapped in a Grouped List Card (`.setup-card`). Cards may contain rows of varying types: input rows (`.setup-card__row--input`), action rows (`+ Add Day`, `+ Add Consignor`), split rows pairing an Add with a Remove toggle (Edit Mode entry — see §1.4.I).
- **Pickers:** open in Bottom Sheets (dates, consignor lists, discount schedules, payout type, color)
- **Bottom:** paired button row — primary (Start Sale, green) + secondary (Join Sale, blue tint)

### E. Confirmation Screen
*Examples: QR handoff*

- **Top:** menu button (right) — this is a transient state, not a navigable one
- **Hero:** the content being handed off (giant QR code)
- **Context:** order summary below the hero (small, secondary)
- **Instruction:** single line of explicit copy — e.g., "Hand this phone to your payment worker"
- **Action:** one blue Text Link for the self-scan alternate path; small secondary links below for Edit / Adjust / New Order

### F. Empty State
*Examples: No transactions yet, no items in order*

- Centered vertically in the available space
- **Icon:** 64×64, outlined/stroke style, secondary color
- **Heading:** "No transactions yet" (title size, semibold)
- **Helper text:** what will appear here when it does (body size, secondary color, max 2 lines, balanced via `text-wrap: pretty`)
- **Single text link** for primary action

### G. Settings / Menu Sheet
*Examples: hamburger menu (in-sale and on Setup), version history*

- iOS Settings / action-sheet style **Grouped List Cards** inside a `.sheet--menu` variant
- **Never a grid of icons** (Facebook grid is banned)
- **Never a stack of full-width buttons** for navigation — buttons are for primary actions, not menu navigation
- Each row: icon left (20×20 outlined SVG, secondary color for nav, semantic color for actions), label (body 17px, left-aligned), chevron right for navigation items
- Group related rows into separate cards. Typical layout for the in-sale hamburger menu:
  1. **Sale identity block** — sale name + day/discount summary (so the user can confirm "what sale am I in?")
  2. **Navigation card** — Dashboard, Share Sale, Edit Sale, Scan, etc.
  3. **Sale-state actions card** — End Day (primary green) + End Sale Permanently (destructive red)
  4. **Version label** at the bottom (footnote, tertiary)
- **No Cancel button** in menu sheets (v170 removed). Dismiss via swipe-down or tap-backdrop. (Confirmation sheets in §1.4.H *do* still pair a destructive action with a Cancel — different context.)

### H. Bottom Sheet
*For: confirmations, pickers, context actions that need more than a menu*

- **Handle indicator** at top (36×5, tertiary color, centered at `--space-md` from top)
- **Top padding:** `--sheet-top-padding` (40px), uniform across all variants. Per-sheet styles must NOT override this — only side/bottom padding.
- **Title-to-content gap:** `--sheet-content-gap` (24px) on `.sheet__title`; `--sheet-content-gap-tight` (16px) on `.sheet__title--small` for terse confirms.
- **Buttons:** stack vertically inside `.sheet__buttons`, full-width, gap `--space-md`. The base button height is `--height-button` (48px); sheet-button-stacked CTAs match.
- **Dismiss:** swipe-down handle, tap-backdrop. **No close X** on standard sheets. The v3 `.sheet--detail` variant (left-aligned dense content) also dismisses via swipe-down — the close X was removed in v169.
- **Max height:** 80dvh (dynamic viewport height accounts for the iOS Safari URL bar).

#### Sub-archetype: Confirm Destructive Sheet

- Title `.sheet__title--small`: short question form (e.g., "Cancel Invoice?", "End Sale Permanently?", "Clear all items?")
- Body: 1 line of `.sheet__text` explaining consequence
- Buttons (vertical stack, in `.sheet__buttons`):
  - `.sheet__btn--danger` (red filled) with the destructive verb ("Cancel Invoice", "End Sale", "Clear")
  - `.sheet__btn--secondary` Cancel — the *only* place a Cancel button is permitted on a sheet (v170 removed it from menu sheets)
- For the highest-stakes destructive ops, additionally require type-the-name confirmation in the input above the buttons. Currently: `End Sale Permanently?` requires typing the sale name exactly (case-sensitive) with an inline error if mismatched (v175).

### I. Edit Mode (batch delete pattern)

**Use this whenever a list section needs a way to remove rows in bulk.** Currently used by Sale Days and Consignors on the Setup screen. Replaces swipe-to-delete (v168 removed swipe because hidden gestures fail principle 1.1.8).

**Anatomy:**
- The section's action row (`.setup-card__row--split`) pairs `+ Add` on the left with a Remove toggle on the right (red text). The toggle is hidden when there's nothing to delete.
- Tapping `Remove` flips the section into edit mode: the toggle becomes `Done`, every row gets a red minus circle (`.row-edit-handle`) on the left.

**Two-tap delete:**
1. Tap the minus circle on a row → row becomes "armed". The right side switches from its normal content to a red `Remove` button (`.row-edit-confirm`).
2. Tap the red `Remove` → row deletes. Toggle stays in edit mode for further deletions; if no removable rows remain, edit mode auto-exits.
3. Tap the minus on an armed row to un-arm. Tap `Done` to exit edit mode entirely.

**Why two taps:** these are persistent destructive operations on shared sale state. One-tap minus is too easy to mis-fire.

**While in edit mode, the row's normal interactions are suppressed** — the user can't accidentally open a date picker or detail sheet. Add controls (`+ Add Day`, `+ Add Consignor`) stay live so the user can interleave adds and removes.

### J. Bottom Action Bar

Every screen with a fixed CTA at the bottom uses one shape:

- Container: `padding: var(--bottom-action-padding)` (12px) on all sides; bottom padding adds `env(safe-area-inset-bottom, 0px)` for the iOS home indicator.
- Background: `--color-surface` (or `--overlay-opaque` on Scan, since the camera feed is dark).
- Border: 1px top divider.
- Buttons: `var(--bottom-action-button-height)` (56px). Full width or split row, never smaller than 56px.

**Don't ad-hoc the bar height per screen.** Setup, Checkout, Dashboard, Scan, Paused, Payment all use the same vertical shape so the user's thumb lands in the same place across screens. (v174 standardized 5 of 6; v176 caught Payment.)

### K. Archive / Past Data Screen *(forward-looking)*

For features that haven't shipped yet but are on the roadmap (export sale data, past sales, account history):

- **Top:** screen title (big bold) + back arrow (left)
- **Body:** Grouped List Cards. Each row: primary label, secondary metadata, trailing chevron or value.
- **Tap a row:** drill into Detail Screen archetype (B) for that record.
- **Top-right:** "..." context menu for bulk actions (export selected, delete archived).
- **Empty state** when no records exist (Empty State archetype, F).
- **No bottom-anchored CTA** — actions on archived data are non-additive.

The closest existing implementation is the Payouts screen, which mixes List + Detail. When Past Sales / Export ships, the patterns above are the target.

## §1.5 Interaction rules

- **Tap targets:** never below 48×48 px. This includes padding — visual size can be smaller.
- **Tap feedback:** subtle scale-down on press (0.97×) or opacity shift, no glows/shadows.
- **State change feedback:**
  - Adding an item: row fades in at top of list, optional inline "Added!" Flash (centered toast, 1s) — the *only* permitted use of `.flash--success`.
  - Marking paid: status pill color changes instantly + subtitle updates to "Marked paid now"
  - Voiding: item greys out with strikethrough, status pill changes to "Voided" red
- **Keyboards:** native iOS numeric keyboard via `inputmode="numeric"` for amount fields. The custom Numpad is only on Add Item / Edit Item Entry screens.
- **Haptic feedback:** subtle tap on Primary actions (Add Item, Mark Paid, Void). Use `navigator.vibrate(10)` if available.
- **Transitions:**
  - Detail drill-in: push from right
  - Bottom sheet: slide up from bottom
  - Dismissal: reverse of entry
  - No fade-in for primary navigation — feels slow
- **Inline Field Error:** small red text directly below the field (footnote 13px, `--color-danger`, `margin-top: --space-xs`), shown only after the user has typed something invalid. Never a popup. Auto-clears when the field becomes valid. Implementation: any of the four current classes (`.entry-screen__error`, `.setup-section__error`, `.sheet__field-error`, `.join-code-status--error`) — they're aliases pending unification.
- **Text wrapping:** body uses `text-wrap: pretty` to rebalance line breaks and avoid orphan words at paragraph ends (v174). Older browsers no-op gracefully.
- **Center-alignment:** never on regular text inputs (matches Apple Wallet / Venmo / Instagram). The single exception is OTP/code inputs (`.join-code-input`), which follow the iOS SMS-code pattern.

## §1.6 Consignor rules

Consignors are a real-world requirement per Alissa's feedback from estate sale operators. They must be:

- **Optional:** sales without consignors continue to work exactly as before
- **First-class when present:** if a sale has consignors, they appear everywhere an order or item is shown
- **Editable anytime:** including for paid orders (consignor is a reporting field, not a financial state)
- **Retroactively assignable:** if an item is rung up without a consignor, the operator can assign one later from the item or order view

### Specific UX rules

- **Setup page:** "Add consignors" is a first-class step, not buried. Tap "+ Add Consignor" → fill the consignor sheet → done.
- **Inline at item entry:** if sale has ≥1 consignor, the consignor chip appears above the "Add Item" button. Default: last-used consignor for this session. Tap chip to change (opens bottom-sheet picker).
- **Editable post-entry:** every item row in an order shows its consignor chip. Tap to edit — even for paid orders.
- **Per-consignor color:** chosen from a 10-color palette via the color-picker chip on the consignor sheet (v173). Color appears as a small dot beside every consignor reference in the app.
- **Dashboard:** "Revenue by consignor" Grouped List Card whenever the sale has consignors.
- **CSV export** (future): `consignor` column always included when sale has consignors.

---

# PART 2 — FRONTEND SPEC

## §2.1 Tokens

All tokens live in `css/styles.css` under `:root`. No hardcoded values outside this block. Verified by: grep for hex colors, px values, and font-sizes outside `:root`.

### Migration status of tokens

- ✅ **Defined and used:** the tokens listed below in their respective sections.
- ⚠️ **Aspirational (defined in this doc, NOT in CSS):** `--shadow-sheet`, `--shadow-floating`, `--duration-default`, `--duration-slow`, `--ease-standard`, `--ease-decelerate`, `--ease-accelerate`. Code uses literals or `var(--duration-fast, 150ms)` (which falls through to the literal). Migrating these into `:root` is part of v177-followup.
- 🪦 **Dead in CSS, must be removed:** `--transition-fast`, `--transition-normal`, all four `--shadow-*` definitions in current CSS (`--shadow-none`, `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-qr`) — never referenced. `--color-primary-light` (redundant with `--color-primary-tint`).

### Colors (iOS system)

```css
:root {
  /* === Surfaces === */
  --color-bg: #F2F2F7;                  /* iOS systemGroupedBackground */
  --color-surface: #FFFFFF;
  --color-surface-raised: #FFFFFF;      /* sheet bg */
  --color-surface-tinted: #F2F2F7;      /* grouped list cards on white bg */

  /* === Text === */
  --color-text: #1C1C1E;                /* iOS label */
  --color-text-secondary: #8E8E93;      /* iOS secondaryLabel */
  --color-text-tertiary: #C7C7CC;       /* iOS tertiaryLabel */
  --color-text-on-primary: #FFFFFF;
  --color-text-on-success: #FFFFFF;
  --color-text-on-danger: #FFFFFF;
  --color-text-on-dark: #FFFFFF;        /* on scan-bg */
  --color-text-link: #007AFF;
  --color-text-destructive: #FF3B30;

  /* === Semantic === */
  --color-primary: #007AFF;             /* iOS systemBlue */
  --color-primary-dark: #0062CC;        /* :active state */
  --color-primary-tint: rgba(0, 122, 255, 0.15);
  --color-success: #34C759;             /* iOS systemGreen */
  --color-success-dark: #2A9D43;        /* :active */
  --color-success-tint: rgba(52, 199, 89, 0.15);
  --color-success-light: rgba(52, 199, 89, 0.10);
  --color-danger: #FF3B30;              /* iOS systemRed */
  --color-danger-dark: #C82A22;         /* :active */
  --color-danger-light: rgba(255, 59, 48, 0.10);
  --color-pending: #FF9500;             /* iOS systemOrange */
  --color-pending-light: rgba(255, 149, 0, 0.10);
  --color-warning: #FFCC00;

  /* === Status pill backgrounds (15% opacity of semantic color) === */
  --color-status-paid-bg: rgba(52, 199, 89, 0.15);
  --color-status-pending-bg: rgba(255, 149, 0, 0.15);
  --color-status-voided-bg: rgba(255, 59, 48, 0.15);

  /* === Borders & dividers === */
  --color-border: #C6C6C8;              /* iOS separator */
  --color-border-focus: var(--color-primary);
  --color-divider: #E5E5EA;             /* lighter row divider */

  /* === Interactive states === */
  --color-bg-hover: #E5E5EA;
  --color-bg-active: #D1D1D6;
  --color-disabled: #AEAEB2;

  /* === Overlays === */
  --overlay-light: rgba(0, 0, 0, 0.2);
  --overlay-medium: rgba(0, 0, 0, 0.4);
  --overlay-dark: rgba(0, 0, 0, 0.6);
  --overlay-opaque: #000000;
  --overlay-success: rgba(52, 199, 89, 0.95);
  --overlay-sheet-backdrop: rgba(0, 0, 0, 0.4);

  /* === Special-context === */
  --color-scan-bg: #000000;
  --color-scan-border: #FFFFFF;
  --color-mic-highlight: var(--color-primary);
  --color-mic-pulse: var(--color-danger);
  --color-spinner-track: rgba(255, 255, 255, 0.2);
}
```

### Typography

```css
:root {
  --font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Segoe UI', Roboto, sans-serif;
  --font-family-number: -apple-system, 'SF Pro Rounded', ui-rounded, system-ui, sans-serif;

  /* Scale */
  --font-size-hero: 56px;         /* running total, today's revenue */
  --font-size-price: 56px;        /* alias */
  --font-size-icon-lg: 72px;      /* payment success checkmark */
  --font-size-icon: 48px;         /* onboarding/speech icons */
  --font-size-2xl: 32px;          /* screen titles (Wallet "Balance Details") */
  --font-size-title-large: 32px;  /* alias */
  --font-size-xl: 22px;           /* card titles, section headers */
  --font-size-title: 22px;        /* alias */
  --font-size-lg: 20px;           /* numpad digits */
  --font-size-body-large: 20px;   /* alias */
  --font-size-base: 17px;         /* default body text, row labels */
  --font-size-body: 17px;         /* alias */
  --font-size-sm: 15px;           /* iOS callout */
  --font-size-xs: 13px;           /* timestamps, helper text, pill labels */
  --font-size-footnote: 13px;     /* alias */
  --font-size-caption: 11px;      /* rare — only when space-constrained */

  /* Weight */
  --font-weight-regular: 400;
  --font-weight-normal: 400;      /* alias */
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  /* Line-height */
  --line-height-tight: 1;         /* hero numbers */
  --line-height-normal: 1.3;
  --line-height-default: 1.4;     /* body */
  --line-height-relaxed: 1.5;
}
```

**Note:** the `body` element sets `text-wrap: pretty` globally (v174) so paragraphs avoid orphans automatically.

**Outstanding gap:** sheet titles use **28px** (`.sheet__title`, `.sheet__title-input`) which is between `--font-size-xl` (22px) and `--font-size-2xl` (32px). The sheet hero amount uses **48px** (`.sheet__hero-amount`) which is between `--font-size-2xl` and `--font-size-hero`. Both should either become tokens (`--font-size-title-medium: 28px`, `--font-size-display: 48px`) or be reconciled to the existing scale. Tracked for v177-followup.

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

**Aspirational (not yet in CSS):**
```css
:root {
  --shadow-sheet: 0 -4px 20px rgba(0, 0, 0, 0.08);
  --shadow-floating: 0 2px 8px rgba(0, 0, 0, 0.06);
}
```

These need to be added to `:root` and applied to `.sheet` and `.menu-context` instead of the current literal values. Tracked for v177-followup.

### Motion

**Aspirational (CSS uses literals via `var(--duration-fast, 150ms)` fallback):**
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

Promote into `:root` and remove the literal-fallback pattern.

### Component heights

```css
:root {
  --height-touch-min: 48px;            /* tap-target minimum for everything interactive */
  --height-button: 48px;               /* sheet buttons, secondary CTAs */
  --height-input: 48px;
  --height-numpad-btn: 48px;
  --height-header-context: 52px;
}
```

### Sheet & action-bar layout

```css
:root {
  --sheet-top-padding: 40px;
  --sheet-content-gap: 24px;           /* title → first content */
  --sheet-content-gap-tight: 16px;     /* small titles → first content */
  --bottom-action-padding: var(--space-md);          /* 12px */
  --bottom-action-button-height: 56px;
}
```

## §2.2 Component library

Each component lists:
- **Target name** (`.ec-*` — what we're migrating toward)
- **Current name(s)** in shipping code
- **Status:** 🟢 Migrated / 🟡 Partial / 🔴 Pending

### Buttons

**Filled Primary Button** — 🔴 Pending
- Target: `.ec-btn-primary`
- Current: `.action-bar__button--primary`, `.sheet__btn--confirm`, `.entry-screen__confirm`, `.dashboard-action`, `.payment-action--paid`, `.scan-error__retry`, `.start-sale-button`
- Use: the ONE primary action per screen
- Background: `--color-success` (green for "add/confirm") or `--color-primary` (blue for navigation/continue)
- Text: `--color-text-on-primary` (white), semibold, body
- Height: `--bottom-action-button-height` (56px) when bottom-anchored; `--height-button` (48px) inside sheets
- Radius: `--radius-md`

**Tinted Secondary Button** — 🔴 Pending
- Target: `.ec-btn-secondary`
- Current: `.action-bar__button--secondary`, `.sheet__btn--secondary`, `.payment-action--new`, `.join-sale-button`
- Use: only when TWO buttons are paired (Setup's Join Sale + Start Sale, sheet Cancel + destructive)
- Background: `--color-primary-tint` or `--color-surface`
- Text: `--color-primary` or `--color-text`, semibold

**Destructive Button** — 🔴 Pending
- Target: `.ec-btn-destructive`
- Current: `.sheet__btn--danger`, `.entry-screen__delete`, `.cancel-confirm__danger`, `.paused-action--end`
- Use: confirm-destructive sheet primary, Edit Item Delete, end-sale buttons
- Background: `--color-danger`
- `:active` background: `--color-danger-dark`

**Blue Text Link** — 🔴 Pending
- Target: `.ec-link-primary`
- Current: `.sheet__action-link`, `.qr-action-link`, `.dashboard-tab-link`, `.consignor-list__add`, `.setup-card__action-link`
- Color: `--color-primary`, semibold, body

**Red Text Link** — 🔴 Pending
- Target: `.ec-link-destructive`
- Current: `.sheet__action-link--danger`, `.order-actions__clear`, `.item-sheet-actions .clear-link`, `.setup-card__action-link--remove`, `.paused-action--dashboard` (cosmetic destructive — review)
- Color: `--color-danger`, semibold, body

### Inputs

**Text Input** — 🔴 Pending
- Target: `.ec-input` (single canonical class)
- Current: `.consignor-form__input`, `.entry-screen__input`, `.setup-section__input`, `.haggle-input`, `.invoice-discount__input`, `.join-code-input`, `.consignor-form__payout-input`, `.discount-row__input`, `.sheet__input`
- Background: `--color-surface-tinted`
- Border: 1px `--color-divider` at rest
- Focus: white bg + 1px `--color-primary` border
- Height: `--height-input` (48px). `.discount-row__input` is intentionally 32px — flag as a `.ec-input--compact` modifier when migrated.
- Required hardening (per v148 lessons): `box-sizing: border-box`, `min-width: 0`, `-webkit-appearance: none`, `appearance: none`

**Variants when migrated:**
- `.ec-input--center` — for OTP/code-style inputs only (`.join-code-input`)
- `.ec-input--bold` — for prominent amount entry
- `.ec-input--with-action` — `padding-right: 56px` for inline icon button (mic, clear-X)
- `.ec-input--hero` — no bg/border, 56px font (Add Item hero amount)
- `.ec-input--compact` — 32px height (inline discount edit)

**Inline Field Error** — 🔴 Pending
- Target: `.ec-field-error`
- Current: `.entry-screen__error`, `.setup-section__error`, `.sheet__field-error`, `.join-code-status--error`
- Footnote red text below the field, `margin-top: --space-xs`, `hidden` by default

### Pickers

**Picker Button** — 🟢 Migrated
- Class: `.ec-picker-button` (with `.ec-picker-button__label` and `.ec-picker-button__chevron`)
- Tappable pill that opens a Picker List bottom sheet
- Visual: matches `.ec-input` — tinted bg, no border at rest
- Used by: payout type, consignor color, future export options

**Picker List + Item** — 🟢 Migrated
- Class: `.ec-picker-list` / `.ec-picker-item` (with `__label`, `__hint`, `__check`)
- Bottom-sheet selection rows
- Each row 48px min, full-width, `--space-lg` horizontal padding
- Selected: trailing checkmark visible (`.ec-picker-item--selected`)

**Color Picker** — 🔴 Pending
- Target: `.ec-color-picker` / `.ec-color-dot`
- Current: `.consignor-form__colors` (grid of swatches inside the color picker sheet — v173) and `.consignor-color-chip` (the tappable chip on the consignor form that opens the color picker sheet)
- Each dot 40×40 in the picker, 20×20 in the chip preview (no `--dot-*` token yet — see Token gaps)
- Selected dot: 2px solid `--color-text` ring + 2px white inset

**Numpad** — 🔴 Pending
- Target: `.ec-numpad` / `.ec-numpad-key`
- Current: `.numpad`, `.numpad__button`, `.numpad__button--backspace`
- Grid: 4 rows × 3 cols, `--space-sm` gap
- Key: `--height-numpad-btn` (48px), `--font-size-lg`, `--color-surface` bg, 1px `--color-divider` border
- Backspace key: SVG icon (v170), centered

### Containers

**Grouped List Card** — 🔴 Pending
- Target: `.ec-card` / `.ec-card__row`
- Current: `.setup-card`, `.payouts__card`, `.consignor-revenue`, `.dashboard-stats` (each is a card archetype with slightly different inner padding)
- Background: `--color-surface`
- Radius: `--radius-lg`
- Rows inside: 48px min height, `--space-lg` horizontal padding
- Between rows: 1px `--color-divider`, inset from left by icon+gap width when icons are present
- Stack gap between cards: `--space-2xl`

**Setup Card** — 🟡 Partial (named `setup-card-*` not `ec-card`, but the *row variants are well-defined*)
- Class: `.setup-card`
- Row variants:
  - `.setup-card__row--input` — input field as a row
  - `.setup-card__row--toggle` — checkbox/toggle as a row
  - `.setup-card__row--action` — full-width tappable action ("+ Add Day", "+ Add Consignor")
  - `.setup-card__row--split` — paired controls (Add on left, Remove toggle on right) — Edit Mode entry point

**Section Header (eyebrow label)** — 🔴 Pending
- Target: `.ec-section-header`
- Current: `.setup-section__header`, `.consignor-form__label`, `.edit-sale__label`, `.dashboard-stat__label`, `.consignor-revenue__title`, `.payouts__card-header`
- Style: 13px (`--font-size-xs`) semibold uppercase, letter-spacing 0.5px, `--color-text-secondary`
- Margin-bottom: `--space-xs`. Margin-top within a sheet form: `--space-xl` (v175 fixed the consignor squish here).

### Status

**Status Pill** — 🔴 Pending
- Target: `.ec-pill-status` with variants `--paid`, `--pending`, `--voided`, `--open`, `--cancelled`, `--edited`
- Current: `.dashboard-txn__status` with variants `--paid`, `--open`, `--unpaid`, `--edited`, `--cancelled`
- Shape: `--radius-pill`
- Padding: `--space-xs` `--space-sm`
- Font: `--font-size-xs`, semibold
- Layout: small dot/icon + label
- Backgrounds: `--color-status-paid-bg` / `--color-status-pending-bg` / `--color-status-voided-bg` / etc.

**Outstanding:** the doc historically listed 3 statuses (paid/pending/voided); shipping code has 5. Reconcile when migrating: which is the canonical set? Likely the 5 are right (Open and Edited are real states); update the token list.

### Controls

**Filter Pill (Dashboard)** — 🟡 Partial
- Class: `.dashboard-pill` (with `.dashboard-pill__label`, `.dashboard-pill__chevron`)
- Used for both Filter (opens Picker List sheet) and Sort (toggles direction)
- Note: replaces the older `.ec-segmented` and `.ec-chips` ideas, which were never implemented and would have overflowed on narrow viewports

**Inline Chip Selector (consignor)** — 🔴 Pending
- Target: `.ec-chip-selector`
- Current: `.consignor-chip` (with `__dot`, `__label`, `__prefix`, `__name`, `__chevron`)
- Pill-shaped, tap to open Picker List sheet
- Background: `--color-surface-tinted`
- Border: 1px `--color-border`
- Padding: `--space-sm` `--space-md`
- Layout: leading dot + "Consigned by" prefix + name + chevron-down

### Overlays

**Bottom Sheet** — 🟡 Partial
- Class: `.sheet` (variants: `.sheet--detail` for left-aligned, `.sheet--menu` for grouped-list nav)
- See §1.4.H for the full archetype spec.
- Naming is *not* `.ec-sheet` because the .sheet name is in heavy use across HTML/JS/CSS. Consider this a deliberate exception when migrating; rename only if the migration cost is low.

**Hamburger Menu Sheet** — 🟢 Migrated (sub-components)
- Wrapper: `.sheet--menu`
- Inner classes: `.ec-menu-list`, `.ec-menu-item` (with `__icon`, `__label`, `__chevron`), `.ec-menu-saleblock` (sale identity block at top)
- Item modifiers: `.ec-menu-item--primary` (green End Day), `.ec-menu-item--danger` (red End Sale Permanently)

**Context Menu (popover)** — 🔴 Not implemented
- Target: `.ec-menu-context`
- Use case for the future: long-press on transaction row → Mark Paid / Void / Delete
- Currently destructive actions live as expanded action links inside `.dashboard-txn` rows. Migrating to context menu is a UX call, not strictly required.

**Flash Toast** — 🟡 Partial
- Class: `.flash` with `.flash--success` / `.flash--error`
- Centered fixed toast, used only for ephemeral confirmations like "Added!"
- See principle 1.1.6 — this is the documented exception. Don't use for navigation-completion or status transitions.

### Special

**Hero Number** — 🔴 Pending
- Target: `.ec-hero-number`
- Current: `.running-total__amount` (Checkout), `.payment-total__amount` (Payment), `.qr-hero` (QR), `.dashboard-stat__value` (Dashboard stats), `.payouts__card-* > stat` (Payouts), `.entry-screen__hero` (Add Item)
- Font family: `--font-family-number`
- Size: 56px (use `--font-size-hero`); some smaller hero numbers use 32px (`--font-size-2xl`)
- Weight: `--font-weight-bold`
- Color: `--color-text`
- Line-height: `--line-height-tight`
- `font-variant-numeric: tabular-nums`
- Currency symbol inline, 0.6× the number size

**Empty State** — 🔴 Pending (and inconsistent in code)
- Target: `.ec-empty-state` / `.ec-empty-state__icon` / `.ec-empty-state__title` / `.ec-empty-state__helper`
- Current: `.dashboard-empty`, `.payouts__empty` / `.payouts__empty-title`, `.item-list__empty` / `.item-list__empty-helper` — all bespoke per-screen
- Spec: centered vertically, 64×64 icon (outlined, `--color-text-secondary`), title (font-size-xl, semibold), helper (body, secondary, max 2 lines, `text-wrap: pretty`)
- Optional single text link below helper

## §2.3 File structure & implementation rules

### CSS organization
- `css/styles.css` contains: tokens → base styles → component classes → screen-specific overrides
- **Naming convention:** target is `.ec-*` for everything in §2.2. Until each component migrates, the legacy class names ship. **New components introduced after this revision MUST use the `.ec-*` name from day one.**
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
- State via class-based modifiers: `.is-active`, `.is-disabled`, `.is-loading`, `.is-selected`, `.--editing`, `.--armed`

### When adding new UI

1. **Does an existing component fit?** Use it. (Answer: yes, 95% of the time.) Use the **legacy class name** if listed in §2.2; use the `.ec-*` target name if the component has migrated.
2. **Is it a new variant of an existing component?** Add a modifier class (e.g. `.ec-btn-primary--large`, or `.consignor-form__input--small` if pre-migration). Do not duplicate the base.
3. **Is it truly new?** Add it to §2.2 FIRST (target name, spec). Then build using the `.ec-*` target name from the start. Then add a row to §3.2 marking the new component as "shipped at vNN."

### When adding a new screen

1. Identify the archetype (§1.4, A–K)
2. Assemble from existing components in §2.2
3. If the archetype fits, do not invent a new one
4. If a new archetype is required (rare), add it to §1.4 first with motivation

## §2.3a Inter-element spacing

The 7-tier spacing scale (§2.1) defines token *values*. This section defines *which tier to use* for the gaps between components within a screen or sheet.

### Within a sheet (Bottom Sheet, §1.4.H)
- Title → first content element: `--sheet-content-gap` (24px) for normal titles, `--sheet-content-gap-tight` (16px) for `.sheet__title--small`. Applied via `margin-bottom` on the title.
- Form section → next form section (label-to-label): `--space-xl` (20px) `margin-top` on the label (v175 fixed the consignor squish here).
- Within a section (label → input): `--space-xs` (4px) `margin-bottom` on the label.
- Last content element → button group: `--space-lg` (16px). Enforced via default `margin-top: var(--space-lg)` on `.sheet__buttons`.
- Inside the button group itself: gap `--space-md` (12px) between buttons.

### Within a screen (List, Detail, Entry, Setup, Confirmation, Archive)
- Hero element → first content element: `--space-xl` (20px)
- Between major sections: `--space-lg` (16px) minimum, `--space-xl` (20px) preferred
- Between Setup form sections: `--space-2xl` (28px). Already enforced by `.setup-section { margin-bottom: var(--space-2xl) }`.

### Inline chip selectors (consignor chip)
A chip selector that follows another major component (numpad, input block, picker) MUST have `margin-top: var(--space-lg)` minimum.

## §2.4 Quality gates

Before any commit/deploy, verify:

- [ ] No hardcoded hex colors outside `:root`
- [ ] No hardcoded px sizes outside `:root` (positioning offsets are OK)
- [ ] No font-sizes outside the type scale (or the documented 28px / 48px exceptions, pending tokenization)
- [ ] All interactive elements meet 48×48 min tap target
- [ ] Semantic colors (green/orange/red) used only for status, never decoration
- [ ] Every screen has exactly one hero element
- [ ] Every screen has at most one bottom-anchored primary action
- [ ] No nested cards
- [ ] No "Success!" modals (Flash toast is OK only for ephemeral micro-confirmations)
- [ ] All destructive actions confirmed via Confirm Destructive Sheet (§1.4.H)
- [ ] Status pills use icon/dot + label + color (all three)
- [ ] No drop shadows except bottom sheets (`--shadow-sheet`) and (rare) floating elements (`--shadow-floating`)
- [ ] All interactive elements have `:focus` states for keyboard accessibility
- [ ] **Migration:** new components introduced after v177 use the `.ec-*` target name from day one (not a legacy name)
- [ ] **Cohesion:** if you touched a sheet, it conforms to §1.4.H (handle indicator, top padding, content gap, button stack, no Cancel except in Confirm Destructive variant)

---

# PART 3 — MIGRATION

## §3.1 Migration status

The `.ec-*` component naming convention was introduced as the design target in the V2 redesign (v128, 2026-04-23). As of v178 (2026-04-28), **seven component families have fully migrated:**

- 🟢 **`.ec-menu-*`** — hamburger menu rows, sale identity block (v152)
- 🟢 **`.ec-picker-*`** — picker button, picker list, picker item (v149)
- 🟢 **`.ec-btn`** + `.ec-btn-primary` — green primary CTAs (v178)
- 🟢 **`.ec-btn-secondary`** — blue-tinted paired secondary (v178)
- 🟢 **`.ec-btn-destructive`** — red destructive (v178)
- 🟢 **`.ec-link-primary`** — blue text link (v178)
- 🟢 **`.ec-link-destructive`** — red text link (v178)

Inputs, cards, status pills, and the rest follow on the schedule below.

## §3.2 Migration roadmap

| Component family | Target name | Current name(s) | Status |
|---|---|---|---|
| Filled Primary Button | `.ec-btn-primary` | (target name in use) | 🟢 v178 |
| Tinted Secondary Button | `.ec-btn-secondary` | (target name in use) | 🟢 v178 |
| Destructive Button | `.ec-btn-destructive` | (target name in use) | 🟢 v178 |
| Blue Text Link | `.ec-link-primary` | (target name in use) | 🟢 v178 |
| Red Text Link | `.ec-link-destructive` | (target name in use) | 🟢 v178 |
| Text Input | `.ec-input` (+ `--with-action`, `--amount`, `--code`, `--compact`) | (target name in use) | 🟢 v179 |
| Inline Field Error | `.ec-field-error` (+ `--centered` for entry-screen) | (target name in use) | 🟢 v179 |
| Form Status (informational gray) | `.join-code-status` (kept as one-off — different semantic than field-error) | one use | 🟡 Exception |
| Grouped List Card (base) | `.ec-card` | (target name in use as additive base; `.setup-card`, `.payouts__card`, `.consignor-revenue`, `.dashboard-stat` retained as context-modifier classes) | 🟢 v180 |
| Card Row variants | `.ec-card__row` (+ `--input`, `--toggle`, `--action`, `--split`) | (target name in use) | 🟢 v183 |
| Outline Destructive Button | `.ec-btn-destructive--outline` | (target name in use) | 🟢 v183 |
| Section Header | `.ec-section-header` | (target name in use) | 🟢 v180 |
| Status Pill | `.ec-pill-status--*` (paid/open/unpaid/edited/cancelled) | (target name in use) | 🟢 v181 |
| Inline Chip Selector | `.ec-chip-selector` (+ `__dot`, `__label`, `__prefix`, `__name`, `__chevron`) | (target name in use) | 🟢 v181 |
| Color Picker | `.ec-color-picker` / `.ec-color-dot` (+ `--selected`) | (target name in use; `.consignor-color-chip` kept as the form-side chip that opens the picker — it's a `.ec-picker-button` modifier) | 🟢 v181 |
| Numpad | `.ec-numpad` / `.ec-numpad-key` (+ `--backspace`) | (target name in use) | 🟢 v182 |
| Hero Number | `.ec-hero-number` (+ `--centered`) | (target name in use; only the genuine 56px display number — smaller stat values like `.payment-total__amount` 32px and `.dashboard-stat__value` 22px keep their context-specific classes) | 🟢 v182 |
| Empty State | `.ec-empty-state` (+ `__icon`, `__heading`, `__helper`) | (target name in use across Order #1 sheet, Dashboard, Payouts) | 🟢 v182 |
| Flash Toast | (removed v184) | violated principles 1.1.6 + 1.5; replaced by live state updates (success) and inline `.ec-field-error` (errors) | 🪦 Removed |
| Hamburger Menu | `.ec-menu-*` | (target name in use) | 🟢 Migrated | v152 |
| Picker Button + List | `.ec-picker-*` | (target name in use) | 🟢 Migrated | v149 |
| Bottom Sheet | `.sheet` (kept as exception) | `.sheet`, `.sheet--detail`, `.sheet--menu` | 🟡 Exception | — |
| Context Menu (popover) | `.ec-menu-context` | (not yet implemented) | 🔴 Not built | v183 (if/when needed) |

**Token migration (separate from component migration), tracked for v177-followup:**
- Add to `:root`: `--shadow-sheet`, `--shadow-floating`, `--duration-default`, `--duration-slow`, `--ease-standard`, `--ease-decelerate`, `--ease-accelerate`, `--font-size-title-medium` (28px), `--font-size-display` (48px)
- Remove from `:root`: `--transition-fast`, `--transition-normal`, dead `--shadow-*` tokens, redundant `--color-primary-light`
- Apply: replace literal `var(--duration-fast, 150ms)` with `var(--duration-fast)` once `--duration-fast` is a real token

## §3.3 What we removed (anti-patterns)

These patterns shipped at some point and have since been removed. Don't reintroduce.

- **Swipe-to-delete** (removed v168). Required a fading "Swipe left to delete" hint to be discoverable, which violates principle 1.1.8 "Native iOS conventions" and the broader "no hidden gestures" stance. Replaced by Edit Mode (§1.4.I).
- **Cancel buttons in hamburger menu sheets** (removed v170). Sheet dismiss is universal via swipe-down + tap-backdrop. Confirm Destructive sheets retain their Cancel button — different context.
- **Close X on sheets** (removed v169). Same reason as Cancel — dismissal is universal. The `.sheet--detail` variant kept a close X for a while; now also dismisses via swipe-down only.
- **Center-aligned text inputs** (removed v174). Doesn't match Apple Wallet / Venmo / Instagram. Single exception is OTP/code-style input (`.join-code-input`).
- **Hardcoded hex colors outside `:root`** (last two removed v176). `--color-text-on-danger` and `--color-text-tertiary` replace `#fff` and `#aaa`.
- **Drift in bottom action bar height** (standardized v174 + v176). Five screens were at 56px buttons + 12px padding; Scan, Dashboard, Payment were at 48px + 8px. All now share `--bottom-action-padding` + `--bottom-action-button-height`.
- **Mid-screen confirmation modals** (banned from the start, but worth restating). Use Confirm Destructive Sheet (§1.4.H sub-archetype).

## §3.4 Open questions

Things this doc doesn't resolve, listed so future passes can address them:

- Should the `.sheet` base class migrate to `.ec-sheet`, or stay `.sheet` as a deliberate exception? Migration cost is high (referenced in HTML, JS, and CSS); benefit is naming consistency. Default: stay.
- Should `.flash` migrate to `.ec-flash`, or be deprecated entirely if principle 1.1.6 ends up forbidding it? Currently 1.1.6 carves out an exception; revisit if the exception isn't pulling its weight.
- Status pill canonical state set: 3 (paid/pending/voided) per old doc, or 5 (paid/open/unpaid/edited/cancelled) per shipping code? Default: 5.
- When Past Sales / Export ships, does the Picker List pattern handle the export-format choice ("CSV / PDF / Email")? Default: yes.
- The 28px sheet title and 48px sheet hero amount sit between scale tiers. Promote to tokens (`--font-size-title-medium`, `--font-size-display`) or reconcile to existing tiers? Default: promote to tokens.

---

## Revision history

| Version | What changed |
|---|---|
| v177 (2026-04-28) | Major restructure. Rewrote §2.2 component catalog to show target + current name + migration status for every component. Added §1.4.I (Edit Mode), §1.4.J (Bottom Action Bar), §1.4.K (Archive — forward-readiness), §1.4.H sub-archetype (Confirm Destructive). Reconciled internal contradictions (sheet max-height, input border state, status pill count). Added §3 Migration Roadmap with per-version rollout. Documented previously-undocumented patterns (Flash toast, Inline Field Error, Section Header, Setup Card row variants). Documented removed anti-patterns. Listed token gaps. |
| v128 (2026-04-23) | V2: direction shift to iOS-native palette/typography/archetypes. Tokens fully replaced. Consignor rules added. Banned patterns codified. |

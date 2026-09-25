---
paths:
  - "src/**/*.jsx"
  - "src/index.css"
  - "src/components/motion/**"
  - "src/components/ui/**"
---

# Design System (v1: base from Claude Design, will iterate during the build)

- **Source:** `.claude/design/Axon design system built/`.
  - Tokens, motion and components come from `Axon Foundations.dc.html`.
  - Screens are the per-screen `*.dc.html` files. `screens.json` maps screen ids to components.
- **Status:** v1 is approved as the base concept. Expect refinements while building. When a screen deviates from this file, change this file first, then the code, and log the change in the `00-index.md` changelog.
- **When building a screen:**
  1. Open its design file: the markup, plus the `data-dc-script` block with the sample data.
  2. Match its layout and hierarchy using the tokens below.
  3. Never copy the inline styles from the design files. Translate them into Tailwind utilities and tokens.

## Principles

1. **Chrome recedes, content leads.** One neutral ramp does almost everything. Colour is reserved for meaning: status, due urgency, and the single space accent.
2. **The accent touches only** the active nav icon, the space tile, primary highlights, focus rings and charts. Switching space should feel like changing rooms without repainting the house.
3. **Two content widths:**
   - Reading surfaces cap at 680–760px (the measure is about 70 characters).
   - Data surfaces run fluid with 20px gutters.
4. **Density like Linear:**
   - 14px UI text (`text-sm`, the shadcn default) and 44px rows.
   - Comfort comes from page padding (36–40px), not from padding inside rows.
5. **Keyboard first.** Every list has a focused row, and every overlay shows its shortcut. Monospace marks anything you type, and all dates.

## Colour tokens (`src/index.css`)

These use shadcn naming, plus Axon extras. `--ring` and the chart accent follow the space accent.

```css
:root {
  --background: #ffffff;  --foreground: #1d1d1f;
  --card: #ffffff;        --card-foreground: #1d1d1f;
  --popover: #ffffff;     --popover-foreground: #1d1d1f;
  --muted: #f5f5f5;       --muted-foreground: #6e6e73;
  --accent: #efefef;      --accent-foreground: #1d1d1f;   /* shadcn "accent" = hover/selected row */
  --primary: #1d1d1f;     --primary-foreground: #ffffff;  /* black primary button */
  --secondary: #f5f5f5;   --secondary-foreground: #1d1d1f;
  --destructive: #ff3b30;
  --border: #e7e7e7;      --input: #d4d4d4;
  --ring: var(--space-accent);
  --sidebar: #ffffff;     --sidebar-foreground: #1d1d1f;  --sidebar-border: #e7e7e7;
  --sidebar-accent: #efefef; --sidebar-accent-foreground: #1d1d1f; --sidebar-ring: var(--space-accent);
  /* Axon extras */
  --faint: #aeaeb2;          /* hints, placeholders, disabled */
  --border-strong: #d4d4d4;  /* inputs, dashed, emphasised outlines */
  --ok: #34c759;  --warn: #ff9500;  --review: #af52de;
  --overlay: rgba(0,0,0,.22);
  --chart-1: var(--space-accent); --chart-2: #34c759; --chart-3: #ff9500; --chart-4: #af52de; --chart-5: #ff2d55;
}
.dark {
  --background: #0b0b0b;  --foreground: #f5f5f7;
  --card: #1a1a1a;        --card-foreground: #f5f5f7;
  --popover: #1a1a1a;     --popover-foreground: #f5f5f7;
  --muted: #222222;       --muted-foreground: #98989d;
  --accent: #2c2c2e;      --accent-foreground: #f5f5f7;
  --primary: #f5f5f7;     --primary-foreground: #1d1d1f;  /* white primary button */
  --secondary: #222222;   --secondary-foreground: #f5f5f7;
  --destructive: #ff453a;
  --border: #2c2c2e;      --input: #3a3a3c;
  --sidebar: #0b0b0b;     --sidebar-foreground: #f5f5f7;  --sidebar-border: #2c2c2e;
  --sidebar-accent: #2c2c2e; --sidebar-accent-foreground: #f5f5f7;
  --faint: #636366;  --border-strong: #3a3a3c;
  --ok: #30d158;  --warn: #ff9f0a;  --review: #bf5af2;
  --overlay: rgba(0,0,0,.5);
  --chart-2: #30d158; --chart-3: #ff9f0a; --chart-4: #bf5af2; --chart-5: #ff375f;
}
```

- Expose the extras to Tailwind in `@theme inline`: `--color-faint`, `--color-border-strong`, `--color-ok`, `--color-warn`, `--color-review`, `--color-space`, `--color-space-soft`. This gives utilities such as `text-faint`, `border-border-strong`, `text-ok`, `bg-space-soft` and `text-space`.
- **In dark mode, elevation comes from lightness steps** (background → card → muted → accent), not from shadows.

## Space accents

Components store a **key** (`spaces.color`, `tags.color`) and never a hex value.

| key | light | dark |
|---|---|---|
| slate | #8e8e93 | #98989d |
| blue | #007aff | #0a84ff |
| indigo | #5856d6 | #5e5ce6 |
| violet | #af52de | #bf5af2 |
| pink | #ff2d55 | #ff375f |
| red | #ff3b30 | #ff453a |
| orange | #ff9500 | #ff9f0a |
| amber | #ffcc00 | #ffd60a |
| green | #34c759 | #30d158 |
| teal | #30b0c7 | #40c8e0 |

- **Define them as CSS variables:** `--hue-<key>`, with light and dark values.
- **Scope the space accent to the shell root:** `[data-space-color="blue"] { --space-accent: var(--hue-blue) }`. **Global** uses slate-neutral.
- **Derive the soft accent** as `--space-soft: color-mix(in oklab, var(--space-accent) 10%, transparent)`. Use 14% in dark mode.
- **Crossfade on space switch.** Register the accent so it can be transitioned: `@property --space-accent { syntax: '<color>'; inherits: true; initial-value: #8e8e93 }`, then `transition: --space-accent 320ms var(--ease-standard)` on the shell root.
- **Tinted fills** (tag pills, status pills and space badges) use one recipe in both themes:
  - background: `color-mix(in oklab, <hue> 14%, transparent)`
  - text: `color-mix(in oklab, <hue> 72%, var(--foreground))`

  Put the recipe in one utility. Add `@utility tint-*` in `index.css`, or a `tintStyle(hueKey)` helper in `lib/tint.js` that returns CSS variables. Use it everywhere.
- **Tags** can use **every Tailwind v4.3 palette** (26: the 17 chromatic colours, then the 9 neutrals slate, gray, zinc, neutral, stone, mauve, olive, mist and taupe; `TAILWIND_COLORS` in `lib/tint.js`). They get the next unused colour automatically when they're created, and the swatch picker is a 9-column grid. **Spaces** keep the 10 `HUE_KEYS`, which also drive the CSS-variable accent (the user's request, 2026-09-25).

## Status, priority and due date

Database values stay as they are (`.claude/docs/data-model.md`). Only the labels and visuals are defined here. They live in `features/tasks/constants.js`.

**Corrected 2026-09-25 (the user's own colour scheme, and "just a circle fill" for priority):** status and priority no longer use the tint recipe or signal-bar icons. Each status/priority entry carries a `color` key (a literal Tailwind colour name), and both are rendered with the literal Tailwind classes in `lib/tint.js` (see below), never a CSS variable.

| status (db) | Label | Icon (lucide) | `color` key |
|---|---|---|---|
| todo | To do | `circle` | slate |
| in_progress | In progress | `circle-dot` | blue |
| in_review | In review | `circle-ellipsis` | violet |
| blocked | Blocked | `circle-alert` | pink |
| on_hold | On hold | `circle-pause` | amber |
| done | **Completed** | `circle-check` | green |
| cancelled | Cancelled | `circle-x` | red |

- **Todos** have two states: "Todo" (muted) and "Done" (ok).
- **Status appears in two forms:**
  - As an **icon** in rows and compact contexts, tinted with `textClasses(color)`.
  - As a **filled pill** (`badgeClasses(color)`, with a leading dot) on cards and the board.

| priority | `color` key |
|---|---|
| none | slate |
| low | slate |
| medium | teal |
| high | amber |
| urgent | red |

- **Priority is a plain coloured dot** (the shared `Dot` component), not signal-bar icons. It renders the same in every context: rows, cards, the dialog's priority chip and the priority menu.

### Literal Tailwind colour classes (`src/lib/tint.js`)

For **status and priority badges/pills, and tag pills**, colours are written as literal, fully-spelled Tailwind colour-scale utilities — never a CSS variable, and never a template-built class name (Tailwind's static scanner can't see `` `bg-${color}-100` ``; this is the same lesson as the `border-1.5` bug in the changelog). `lib/tint.js` exports lookup objects keyed by colour name (`slate`, `blue`, `indigo`, `violet`, `pink`, `red`, `orange`, `amber`, `green`, `teal`), each value a literal class string, with accessor functions (`badgeClasses`, `textClasses`, `dotClasses`, `ringClasses`) that fall back to `slate` for an unknown key:

- **Badge/pill background + text:** `bg-{color}-100 text-{color}-700`, plus `dark:bg-{color}-500/15 dark:text-{color}-300` (the dark-mode pairing is a judgement call, not a user spec).
- **Icon-only text tint:** `text-{color}-600`, with a `dark:text-{color}-300` (or `-400` for `slate`) pairing.
- **Dot fill:** `bg-{color}-500` (`slate` uses `bg-slate-400 dark:bg-slate-500` for contrast against `bg-slate-100`).
- **Selection ring** (swatch pickers): `ring-{color}-500` (`slate`: `ring-slate-400`).

This is a **different mechanism from the space-accent tint recipe** below, which stays CSS-variable-based because it drives a whole dynamic theme (nav highlighting, rings, buttons across the app), not a single discrete badge. Don't mix the two: a status/priority/tag pill never reads `--hue-*` or the tint recipe, and a space accent never reads `lib/tint.js`'s literal classes.

- **Due date labels** are set in Geist Mono at `text-xs`:
  - Normal: muted-foreground (`Fri 26 Sep`).
  - `Today` / `Due today`: warn.
  - `Overdue · 3d` / `Overdue 20 Sep`: destructive.
  - Completed: ok (`Completed 18 Sep`).
  - No date: faint.
- **Links** (MR, ticket, doc — a task can have any number, `git-pull-request-arrow` icon): one button (`TaskLinksButton`, shared by the row, card and board card), hidden entirely when a task has none, opening a hover popover that lists every link. It replaces a per-row Tooltip. When a task has several links, the button widens into a pill showing the count next to the icon.

## Typography

- **Fonts:** **Geist** and **Geist Mono**, loaded with `@fontsource-variable/geist` and `@fontsource-variable/geist-mono` (self-hosted, no FOUT).
  - `--font-sans: 'Geist Variable', system-ui, sans-serif`
  - `--font-mono: 'Geist Mono Variable', ui-monospace, monospace`
- **Use tabular numbers** (`tabular-nums`) for every count, stat and date column.

**Use Tailwind's default type scale; there are no custom size tokens.** This was changed on 2026-09-23 at the user's request: the design's 13px UI text read too small, so we moved to the shadcn and Tailwind defaults. Sizes are fixed rather than responsive, the same as shadcn.

| Role | Classes | Size / line height | Use |
|---|---|---|---|
| display | `text-4xl font-semibold tracking-tight` | 36/40 | note and report titles |
| page title | `text-2xl font-semibold tracking-tight` | 24/32 | page titles, greeting |
| section | `text-xl font-semibold tracking-tight` | 20/28 | section headings |
| card title | `text-base font-semibold` | 16/24 | widget and card titles |
| reading | `text-base leading-7` | 16/28 | editor, journal and report body |
| **UI (default)** | `text-sm` (set on `body`) | 14/20 | rows, forms, menus, buttons (the shadcn default) |
| meta | `text-xs` | 12/16 | captions, timestamps, hints |
| mono | `font-mono text-xs` | 12/16 | dates, shortcuts, slugs, quarter labels |
| stat | `text-3xl font-semibold tracking-tight tabular-nums` | 30/36 | stat tiles |

Row heights in the layout table assume 14px text. If a row looks cramped, add height rather than shrinking the text.

## Spacing, radius and elevation

- **Spacing.** The Tailwind default 4px base applies. Key values:
  - 1 = 4px (icon gap), 1.5 = 6px (chip gap), 2 = 8px (inline gap), 3 = 12px (row gap)
  - 4 = 16px (card padding), 5 = 20px (page gutter), 8 = 32px (section gap)
  - 10 = 40px (page padding), 14 = 56px (reading padding)
- **Radius.** Override these in `@theme`:

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | 5px | badges, space badge |
| `--radius-md` | 7px | buttons, inputs, rows, filter chips |
| `--radius-lg` | 10px | cards, menus, popovers |
| `--radius-xl` | 12px | widgets, note cards, toasts |
| `--radius-2xl` | 14px | dialogs, palette |

  **Corrected 2026-09-24 (Feature 04 Phase 3):** tag pills use `--radius-sm` (5px), the same as space badges, matching the source design's board card tags — not the 6px this file previously said. Both are deliberately square-ish, distinct from the fully round status/priority pills.
- **Elevation:**

| Token | Value | Use |
|---|---|---|
| none | none | rows and cards at rest (border only) |
| `--shadow-xs` | `0 1px 1px rgba(16,16,24,.03)` | segmented thumb, inputs, card hover |
| `--shadow-sm` | `0 1px 2px rgba(16,16,24,.04)` | small raised tiles |
| `--shadow-md` | `0 2px 6px rgba(16,16,24,.05)` | popovers, toasts, dragged card |
| `--shadow-lg` | `0 6px 18px rgba(16,16,24,.07)` | dialogs, palette |

**Shadows stay very subtle everywhere** (the user asked for this on 2026-09-23; the design's shadows were heavier). Borders do the separating. Never add shadows heavier than `--shadow-lg`, or ad-hoc `shadow-[…]` values.

- **Borders** are always 1px hairlines (`border-border`). Inputs and dashed outlines use `border-border-strong`.

## Motion (`src/components/motion/presets.js`, the only place these values live)

```js
export const durations = { instant: 0.08, fast: 0.12, base: 0.2, slow: 0.32 }       // seconds; nothing over 320ms
export const easings = {
  standard: [0.2, 0, 0, 1],      // most UI
  enter:    [0.16, 1, 0.3, 1],   // arriving: decelerate hard
  exit:     [0.4, 0, 1, 1],      // leaving: accelerate out
}
export const springs = {
  snappy: { type: 'spring', stiffness: 520, damping: 38, mass: 0.9 },  // dialogs, reorder, drop, sidebar width (~220ms, no overshoot)
  gentle: { type: 'spring', stiffness: 260, damping: 30, mass: 1 },    // sheets, row collapse, card lift (~380ms, 1–2% overshoot)
}
```

Mirror the durations and easings as CSS variables (`--dur-fast`, `--ease-standard`, …) for hover transitions handled in CSS.

| Interaction | Choreography | Timing | Reduced motion |
|---|---|---|---|
| Page transition | **Opacity only.** The incoming page fades from 0 to 1, with no exit and no y-rise (both made the scroll area overflow for a moment). The sidebar and header never animate. | in 120 enter | fade 120 |
| List enter / exit | Items fade and move y 4px → 0, with a 20ms stagger on the first 8 only. Exit: fade and height → 0. Reorder uses `layout`. | 160 enter · layout snappy | fade 120, no stagger |
| Todo / task complete | The box fills with ok/accent and scales 1 → 1.08 → 1, and the check stroke draws. The strike-through sweeps left to right, and the text fades to faint. After a 600ms hold, the row collapses and leaves (when the current filter hides done items). The Undo toast appears. | check 180 · strike 220 · collapse gentle | instant check, fade out 150 |
| Kanban drag | Pickup: scale 1.01, rotate 1°, `shadow-md`, grabbing cursor. The target column's border tints with the accent, and a dashed placeholder opens via `layout`. Drop: spring to the slot, shadow back to none. | lift 120 standard · drop snappy | outline only |
| Dialog | The overlay fades in. The panel goes opacity 0 → 1, scale .96 → 1, y 8 → 0. Exit: opacity and scale .98. | in snappy · out 120 exit | fade 120 |
| Sheet / drawer | Slides in from its edge while the overlay fades. The mobile drawer follows the finger, then springs. | gentle · out 200 exit | fade 120 |
| Command palette | Pops and never slides: opacity 0 → 1, scale .98 → 1. The backdrop blurs from 0 to 2px. The result list animates its height via `layout`. | 120 enter | fade 80 |
| Sidebar collapse | Labels fade out first (80ms), then the width springs from 240 to 56. Expanding reverses this: width first, then labels fade in. | labels 80 · width snappy | instant width |
| Space switch | `--space-accent` crossfades everywhere at once (CSS `@property`). The content runs the normal page transition. | 320 standard | instant |
| Skeleton | A muted block with a hover-tone gradient sweeping left to right. Content replaces it with a 120ms fade. Skeletons match row heights exactly, so nothing jumps. | 1400 linear ∞ | static block |
| Hover lift | Cards: y −1px, `shadow-xs`, `border-strong`. Rows: background change only. | 120 standard | background only |

Variants to export: `fadeIn`, `slideUp` (y 6), `listItem` (y 4 with height exit), `scaleIn` (dialog), `popIn` (palette), `pageTransition`, `staggerItem(0.02, { max: 8 })`, `flashPulse` (added in Feature 05: a one-shot 0→0.4→0 opacity pulse, `durations.slow * 2`, for a `?highlight=<id>` target). For `staggerItem`, pass each item's index as `custom={i}`; only the first 8 items are delayed.

## Layout

| Item | Spec |
|---|---|
| Sidebar | **16rem (256px)** expanded (the user tried 16.5rem and 15.5rem, then settled on 16rem), and shadcn's **3rem** rail. Nav items use the shadcn defaults (32px). `bg-sidebar`, with a hairline right border. **The sidebar matches the page background**: white `#ffffff` in light and `#0b0b0b` in dark. The user tried light grays (`#fafafa`, `#fcfcfc`) on 2026-09-24 and settled on white. The hairline border does the separating. |
| Header | 48px breadcrumb bar with page actions. A second 48px toolbar row appears only where there are filters or tabs. |
| Page padding | 36–40px desktop, 16px mobile |
| Grid | 12 columns, 20px gutters. Dashboard widgets split 7/5 and 6/6. |
| Data max-width | Dashboard capped at 1080px. Tasks, board and calendar are fluid. |
| Reading max-width | 680px for the note editor and journal; 760px for reports (two charts side by side). |
| Right rail | 280–300px for task meta and the note side panel. It becomes a Sheet below 1024px. |
| Row heights | task row 44 · todo row 40 · nav item 32 (shadcn sidebar default) · group header 36 |
| Breakpoints | Below 1024px the right rail becomes a Sheet. Below 768px the sidebar becomes a drawer and rows go two-line. |
| Print (reports) | No chrome, white paper, always light theme |

## Component specs

Each of these maps to a shadcn primitive.

- **Space switcher** (DropdownMenu). A 240px panel with rows 32px high. Global comes first (`layers` icon), then the spaces. Each row has a 20px icon tile in `space-soft`, the name, a check on the current space, and a shortcut hint rendered with `<Kbd>` (Feature 12). A separator, then "New space…" and "Manage spaces…".
- **Primary button** uses `bg-primary`, which is black in light and white in dark. The accent is not used for buttons.
- **Filter bar.** An unset filter is a dashed-border chip with an icon and label, e.g. "Status". A set filter is a filled `space-soft` chip with `text-space` and an ✕ to clear it, e.g. "Priority ≥ Medium". The search field sits on the right (180px).
- **Task table** (the Tasks page's `?view=table`, replacing the grouped task-row list on 2026-09-25, which the user found "too chaotic"). It's a shadcn `Table` driven by TanStack Table v9 (`TaskTable` plus `taskTableColumns.jsx`), inside a rounded border.
  - **Columns:** Task (title, with the description clamped to 2 lines in muted `text-xs` beneath it, capped at `max-w-md` so it never spans the whole column; the only flexible column), then Space (Global only), Status (pill, changed in place), Priority (pill, changed in place, "None" shown), Tags (3 + "+n"), Checklist, Due, Updated (relative), and actions (links and ⋮). Every other column is sized to its content (`w-px whitespace-nowrap`).
  - **Sorting:** click a header to cycle through ascending, descending and off (one column at a time). The sort is kept in the URL (`?sort=due`, `?sort=-due`). Tasks with no due date sort last in both directions. Unsorted, rows keep the manual position order.
  - **Rows** are 44px or taller with the default shadcn hover. Only the title is a button (it opens the task); the row itself isn't clickable.
  - There's no row selection or pagination yet; add them when bulk actions arrive.
- **Entity chip** (HoverCard). An inline pill 24px high with a 6px radius. Task chips use `space-soft` with an accent border and a status icon; note chips use `bg-muted` with a `file-text` icon. The hover card is 300px wide and shows status · priority · due, then the title.
- **Grid task card** (revised 2026-09-25, the user's layout), from top to bottom:
  1. Status and priority pills, then the links button and ⋮.
  2. The title.
  3. The description, clamped to 2 lines.
  4. A **meta row**: checklist progress now, and the linked-notes count from Feature 07. It's rendered only when there's something to show.
  5. A flexible spacer.
  6. **Tags pinned just above the footer.** At most 3, then "+n". Each pill truncates a long name, and hovering shows the full name.
  7. A dashed footer: **"Updated 2d ago"** (`formatRelative(updated_at)`, mono `text-xs`) on the left and the due label on the right. The title is clamped to 2 lines, with the full title on hover.
  - The footer has **no space name**. In Global, the space's emoji alone (with its name for screen readers and on hover) sits before the updated time.
  - Tag pills cap their width (`max-w-40`, or `max-w-60` for `md`) and truncate inside, everywhere they're used.
  - **Hidden tags:** when a group shows "+n", hovering the pills or the count opens a HoverCard listing every tag (150ms open delay, 100ms close delay). With nothing hidden there's no popover. The group turns pointer events back on so hovering works inside the grid card.
  - **Checklist progress** (`ChecklistProgressBadge`, the same everywhere) has a fixed `list-checks` icon plus "3/7", and **colour carries the progress** (the user tried a filling ring and preferred this, 2026-09-25). With nothing checked it's all muted. When partly done, only the done count is emerald. When everything is done, the whole badge is emerald. Don't swap the icon by state.
- **Kanban card / task card.** `bg-card`, a border, 9–10px radius and 12px padding. Status icon and title on the first line; priority, tag pills and a mono due date on the second. The columns are `bg-muted` wells.
- **Note card.** `bg-card`, 12px radius, padding 14×16. Title (600), then a 2-line muted preview, then tags on the left and a mono relative time on the right.
- **Date picker** (Popover + Calendar), 260px wide. Quick chips first: Today, Tomorrow, Fri, Next week. The selected day is `bg-primary`; today uses red text with a muted background.
- **Tag picker** (Popover + Command). Selected tags appear as chips inside the search input. Each option is the tag's **actual badge** (`TagPill size="md"`), not a colour dot plus plain text. It doesn't show the tag's space or scope, and selected tags get a **check icon on the right**. The highlighted row gets **no background** (all the user's requests, 2026-09-25). It ends with "Create "…"".
- **Task dialog** (revised 2026-09-25 after the user reviewed it in the browser; they found the text "so small and heavy"):
  - **Height:** capped by `max-h-dialog` (a utility in `index.css`: `calc(100dvh - 4rem)`). The header and footer stay pinned, and only the middle (title → checklist) scrolls. The description textarea grows with its content and has no scroll of its own. Use the same pattern for any dialog whose content can grow.
  - The header is shadcn's default title and description (see `components.md`), with a ghost `icon-sm` close button beside it.
  - The task title input is `text-xl font-semibold tracking-tight` (the user asked for semibold, 2026-09-25, after trying medium). The description is default `text-sm`.
  - Under the description come the selected tags (`TagPill size="md"`: 26px tall, `text-sm`, removable), then the inline links field.
  - Property chips (`PropertyChip`) are **32px tall with `text-sm`**, never `text-xs`. The priority chip's dot is `size-2` (8px), smaller than the chip's 14px icons.
  - A new task's priority defaults to **Medium** in the dialog (the user changed it from High, 2026-09-25). The database default stays `none`, so board quick-add still creates tasks with no priority.
  - The checklist section appears in **both** modes. When creating a task, items are staged in the dialog (`StagedChecklist`) and bulk-inserted after the task is saved (`useCreateChecklistItems`).
  - The checklist has one disclosure header, "Checklist" in `font-medium`, followed by its progress, or "· saves as you go" while it's empty. There's no second title.
  - **Weight rule for dialog text:** the entity title being edited (the task title input) is `font-semibold`. Dialog headers, section headings and labels (the checklist header, for example) are `font-medium`.
- **Empty state.** A dashed `border-strong` box with a 36px icon tile in the accent colour. Title (600), a one-line reason, and one primary action.
- **Confirm dialog** (AlertDialog). Title, a one-line consequence, then Cancel plus a destructive button.
- **Toast** (Sonner). `bg-card`, 12px radius, `shadow-md`. Icon, message, and an optional outlined action such as Undo.

## Rules

- **Colours** come only from tokens and utilities, never raw hex. The one exception is the accent table in `index.css`.
- **Arbitrary values** (`w-[437px]`, `rotate-[3deg]`) are not allowed. Tailwind **attribute and state variants** are fine, because they don't introduce new values. Examples: `data-[state=open]:`, `group-data-[collapsible=icon]:`, `aria-[invalid=true]:`, `has-[>svg]:`.
- **Space-coloured UI** uses `--space-accent` or `--space-soft`. Per-item colours (tags, spaces in Global) go through the tint helper.
- **Motion** values come only from `presets.js`, or the CSS variables that mirror it.
- **Test both themes.** Every component must work in light and dark before it counts as done.
- **Scrollbars** are styled once, app-wide, in `index.css` (the user's request, 2026-09-25: the default ones looked chunky). They're 10px wide with a 4px pill thumb inset by a transparent border, and no arrow buttons. The thumb is `--border-strong` at rest and `--faint` on hover, so dark mode follows automatically. Chromium and Safari use `::-webkit-scrollbar`, and Firefox gets `scrollbar-width: thin` inside `@supports not selector(::-webkit-scrollbar)`. Never set `scrollbar-width` or `scrollbar-color` on an element elsewhere, except `scrollbar-none` for hidden bars: Chrome ignores the pseudo-elements when either is present.
- **Icon sizes:** 15px in rows, 13–14px in chips and buttons, 16px in empty-state tiles. Stroke width stays at the lucide default.
- **Shortcut hints** always use `<Kbd shortcut="mod+k" />` from `components/shared`, never hardcoded glyphs. Modifiers render as **lucide icons** (Command, ArrowBigUp, Option, CornerDownLeft), matching the design's "⌘K". Screen readers get words.
- **Space identity is an emoji, shown bare** (no tile or background). The space accent colour applies to UI chrome, not the emoji.
- **No `backdrop-blur` on full-screen overlays** (dialog, alert-dialog and sheet use `bg-overlay`). Re-blurring the whole page on every animation frame caused visible frame drops. Blur is only allowed on small surfaces.
- **Animated panels that scale** (dialogs) carry `will-change-transform`, so their content is painted once. Scaling text, especially colour emoji, otherwise re-rasterises every frame. Expensive grids (like emoji) mount one frame after opening, in a fixed-height box.

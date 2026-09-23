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
   - 13px UI text and 42px rows.
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
  --sidebar: #f7f7f6;     --sidebar-foreground: #1d1d1f;  --sidebar-border: #e7e7e7;
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
  --sidebar: #131313;     --sidebar-foreground: #f5f5f7;  --sidebar-border: #2c2c2e;
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
- **Tags** get the next free colour key automatically when they're created.

## Status, priority and due date

Database values stay as they are (`.claude/docs/data-model.md`). Only the labels and visuals are defined here. They live in `features/tasks/constants.js`.

| status (db) | Label | Icon (lucide) | Colour |
|---|---|---|---|
| todo | To do | `circle` | icon: muted-foreground · pill: space accent |
| in_progress | In progress | `circle-dot` | warn |
| in_review | In review | `circle-ellipsis` | review |
| blocked | Blocked | `circle-alert` | destructive |
| done | **Completed** | `circle-check` | ok |
| cancelled | Cancelled | `circle-x` | faint (pill: muted-foreground) |

- **Todos** have two states: "Todo" (muted) and "Done" (ok).
- **Status appears in two forms:**
  - As an **icon** in rows and compact contexts.
  - As a **filled pill** (tint recipe, with a leading dot) on cards and the board.

| priority | Label | Icon | Colour |
|---|---|---|---|
| none | None | `minus` | faint (usually hidden) |
| low | Low | `signal-low` | faint |
| medium | Medium | `signal-medium` | teal |
| high | High | `signal-high` | warn |
| urgent | Urgent | `triangle-alert` | destructive |

- **Due date labels** are set in Geist Mono, 11.5–12px:
  - Normal: muted-foreground (`Fri 26 Sep`).
  - `Today` / `Due today`: warn.
  - `Overdue · 3d` / `Overdue 20 Sep`: destructive.
  - Completed: ok (`Completed 18 Sep`).
  - No date: faint.
- **External link** (MR) icon: `git-pull-request-arrow`.

## Typography

- **Fonts:** **Geist** and **Geist Mono**, loaded with `@fontsource-variable/geist` and `@fontsource-variable/geist-mono` (self-hosted, no FOUT).
  - `--font-sans: 'Geist Variable', system-ui, sans-serif`
  - `--font-mono: 'Geist Mono Variable', ui-monospace, monospace`
- **Use tabular numbers** (`tabular-nums`) for every count, stat and date column.

| Token | Size / line height | Weight | Tracking | Use |
|---|---|---|---|---|
| display | 36/44 | 600 | −0.03em | note and report titles |
| h1 | 26/32 | 600 | −0.025em | page titles, greeting |
| h2 | 19/26 | 600 | −0.015em | section headings |
| h3 | 15/22 | 600 | −0.01em | widget and card titles |
| body-read | 15/26 | 400 | 0 | editor, journal and report body |
| body-ui | 13/20 | 400 | 0 | **default UI text** |
| small | 12/16 | 400 | 0 | meta, captions |
| mono | 12/16 | 400 | 0 (Geist Mono) | dates, shortcuts, slugs, quarter labels |
| stat | 28/28 | 600 | −0.03em, tnum | stat tiles |

Define each token as a Tailwind v4 `@theme` text size with its line height, letter spacing and weight. For example, `--text-ui: 13px; --text-ui--line-height: 20px`, which gives utilities such as `text-ui`, `text-read`, `text-h1` and `text-stat`. The `body` default is `text-ui`.

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

  Tag pills use a 6px radius and space badges 5px. The different shapes keep them from being read as the same kind of thing.
- **Elevation:**

| Token | Value | Use |
|---|---|---|
| none | none | rows and cards at rest (border only) |
| `--shadow-xs` | `0 1px 2px rgba(16,16,24,.06)` | segmented thumb, inputs |
| `--shadow-md` | `0 12px 32px rgba(16,16,24,.10)` | popovers, hover lift, toasts |
| `--shadow-lg` | `0 30px 80px rgba(16,16,24,.22)` | dialogs, palette, dragged card |

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
| Page transition | The outgoing page fades out. The incoming page fades from 0 to 1 and rises y 6px → 0. The sidebar and header never animate. | out 120 exit · in 200 enter | fade 120 |
| List enter / exit | Items fade and move y 4px → 0, with a 20ms stagger on the first 8 only. Exit: fade and height → 0. Reorder uses `layout`. | 160 enter · layout snappy | fade 120, no stagger |
| Todo / task complete | The box fills with ok/accent and scales 1 → 1.08 → 1, and the check stroke draws. The strike-through sweeps left to right, and the text fades to faint. After a 600ms hold, the row collapses and leaves (when the current filter hides done items). The Undo toast appears. | check 180 · strike 220 · collapse gentle | instant check, fade out 150 |
| Kanban drag | Pickup: scale 1.02, rotate 1.5°, `shadow-lg`, grabbing cursor. The target column's border tints with the accent, and a dashed placeholder opens via `layout`. Drop: spring to the slot, shadow back to none. | lift 120 standard · drop snappy | outline only |
| Dialog | The overlay fades in. The panel goes opacity 0 → 1, scale .96 → 1, y 8 → 0. Exit: opacity and scale .98. | in snappy · out 120 exit | fade 120 |
| Sheet / drawer | Slides in from its edge while the overlay fades. The mobile drawer follows the finger, then springs. | gentle · out 200 exit | fade 120 |
| Command palette | Pops and never slides: opacity 0 → 1, scale .98 → 1. The backdrop blurs from 0 to 2px. The result list animates its height via `layout`. | 120 enter | fade 80 |
| Sidebar collapse | Labels fade out first (80ms), then the width springs from 240 to 56. Expanding reverses this: width first, then labels fade in. | labels 80 · width snappy | instant width |
| Space switch | `--space-accent` crossfades everywhere at once (CSS `@property`). The content runs the normal page transition. | 320 standard | instant |
| Skeleton | A muted block with a hover-tone gradient sweeping left to right. Content replaces it with a 120ms fade. Skeletons match row heights exactly, so nothing jumps. | 1400 linear ∞ | static block |
| Hover lift | Cards: y −2px, `shadow-md`, `border-strong`. Rows: background change only. | 120 standard | background only |

Variants to export: `fadeIn`, `slideUp` (y 6), `listItem` (y 4 with height exit), `scaleIn` (dialog), `popIn` (palette), `pageTransition`, `staggerItem(0.02, { max: 8 })`. For `staggerItem`, pass each item's index as `custom={i}`; only the first 8 items are delayed.

## Layout

| Item | Spec |
|---|---|
| Sidebar | 240px expanded, 56px rail. Nav item height 30px. `bg-sidebar`, with a hairline right border. |
| Header | 48px breadcrumb bar with page actions. A second 48px toolbar row appears only where there are filters or tabs. |
| Page padding | 36–40px desktop, 16px mobile |
| Grid | 12 columns, 20px gutters. Dashboard widgets split 7/5 and 6/6. |
| Data max-width | Dashboard capped at 1080px. Tasks, board and calendar are fluid. |
| Reading max-width | 680px for the note editor and journal; 760px for reports (two charts side by side). |
| Right rail | 280–300px for task meta and the note side panel. It becomes a Sheet below 1024px. |
| Row heights | task row 42 · todo row 40 · nav item 30 · group header 36 |
| Breakpoints | Below 1024px the right rail becomes a Sheet. Below 768px the sidebar becomes a drawer and rows go two-line. |
| Print (reports) | No chrome, white paper, always light theme |

## Component specs

Each of these maps to a shadcn primitive.

- **Space switcher** (DropdownMenu). A 240px panel with rows 32px high. Global comes first (`layers` icon), then the spaces. Each row has a 20px icon tile in `space-soft`, the name, a check on the current space, and a mono shortcut hint (`⌘0`–`⌘9`). A separator, then "New space…" and "Manage spaces…".
- **Primary button** uses `bg-primary`, which is black in light and white in dark. The accent is not used for buttons.
- **Filter bar.** An unset filter is a dashed-border chip with an icon and label, e.g. "Status". A set filter is a filled `space-soft` chip with `text-space` and an ✕ to clear it, e.g. "Priority ≥ Medium". The search field sits on the right (180px).
- **Task row** (42px). Priority icon, status icon, title, then flexible space, then tag pills, the MR icon and the mono due label.
  - Rest: transparent.
  - Hover: `bg-muted`.
  - Keyboard-focused (J/K): `bg-accent` plus an inset 2px accent bar on the left.
- **Entity chip** (HoverCard). An inline pill 24px high with a 6px radius. Task chips use `space-soft` with an accent border and a status icon; note chips use `bg-muted` with a `file-text` icon. The hover card is 300px wide and shows status · priority · due, then the title.
- **Kanban card / task card.** `bg-card`, a border, 9–10px radius and 12px padding. Status icon and title on the first line; priority, tag pills and a mono due date on the second. The columns are `bg-muted` wells.
- **Note card.** `bg-card`, 12px radius, padding 14×16. Title (600), then a 2-line muted preview, then tags on the left and a mono relative time on the right.
- **Date picker** (Popover + Calendar), 260px wide. Quick chips first: Today, Tomorrow, Fri, Next week. The selected day is `bg-primary`; today uses red text with a muted background.
- **Tag picker** (Popover + Command). Selected tags appear as chips inside the search input. Each option has a checkbox, a colour dot and the name. It ends with "Create "…"".
- **Empty state.** A dashed `border-strong` box with a 36px icon tile in the accent colour. Title (600), a one-line reason, and one primary action.
- **Confirm dialog** (AlertDialog). Title, a one-line consequence, then Cancel plus a destructive button.
- **Toast** (Sonner). `bg-card`, 12px radius, `shadow-md`. Icon, message, and an optional outlined action such as Undo.

## Rules

- **Colours** come only from tokens and utilities, never raw hex. The one exception is the accent table in `index.css`.
- **Space-coloured UI** uses `--space-accent` or `--space-soft`. Per-item colours (tags, spaces in Global) go through the tint helper.
- **Motion** values come only from `presets.js`, or the CSS variables that mirror it.
- **Test both themes.** Every component must work in light and dark before it counts as done.
- **Icon sizes:** 15px in rows, 13–14px in chips and buttons, 16px in empty-state tiles. Stroke width stays at the lucide default.

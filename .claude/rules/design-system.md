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
| done | **Completed** | `circle-check` | emerald |
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
  - Completed: a darker emerald, `text-emerald-700 dark:text-emerald-400` (`Completed 18 Sep`). It sits a step deeper than the emerald Completed pill (the user's request, 2026-09-25).
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
| Right rail | **16rem (256px), the sidebar's width**, for task meta and the note side panel (the user's choice, 2026-09-26, for symmetry). It becomes a Sheet below 1024px. |
| Row heights | task row 44 · todo row 40 · nav item 32 (shadcn sidebar default) · group header 36 |
| Breakpoints | Below 1024px the right rail becomes a Sheet. Below 768px the sidebar becomes a drawer and rows go two-line. |
| Print (reports) | No chrome, white paper, always light theme |

## Component specs

Each of these maps to a shadcn primitive.

- **Space switcher** (DropdownMenu). A 240px panel with rows 32px high. Global comes first (`layers` icon), then the spaces. Each row has a 20px icon tile in `space-soft`, the name, a check on the current space, and a shortcut hint rendered with `<Kbd>` (Feature 12). A separator, then "New space…" and "Manage spaces…".
- **Primary button** uses `bg-primary`, which is black in light and white in dark. The accent is not used for buttons.
- **Filter bar.** An unset filter is a dashed-border chip with an icon and label, e.g. "Status". A set filter is a filled `space-soft` chip with `text-space` and an ✕ to clear it, e.g. "Priority ≥ Medium". The search field sits on the right (180px).
- **Task table** (the Tasks page's `?view=table`, replacing the grouped task-row list on 2026-09-25, which the user found "too chaotic"). It's a shadcn `Table` driven by TanStack Table v9 (`TaskTable` plus `taskTableColumns.jsx`), inside a rounded border.
  - **Columns:** Task (title, with the description clamped to 2 lines in muted `text-xs` beneath it, capped at `max-w-md` so it never spans the whole column; the only flexible column), then Space (Global only), Status (pill, changed in place), Priority (pill, changed in place, "None" shown), Tags (3 + "+n"), **Version**, Checklist, Due, Updated (relative), and actions (links and ⋮ only).
  - **Empty cells show a muted `-`** (`EmptyCell`), never a blank. A completed task's Due cell shows **only its emerald completion date**, since the status column already says "Completed" (`DueLabel completedPrefix={false}`). Both are the user's requests, 2026-09-25. Every other column is sized to its content (`w-px whitespace-nowrap`).
  - **Sorting:** the grid and table share one sort (`?sort=`) through `sortTasks` in `features/tasks/utils.js`. The toolbar's **Sort** menu offers Manual order, Created, Updated, Priority, Due date, Status and Title. **The default is Created, newest first (`-created`)**, and while it's active the button just reads "Sort". The last choice is **remembered per device** (`axon:tasks:sort` in localStorage). A `?sort=` in the URL wins, and the default is kept out of the URL. Created, Updated and Priority start newest or most urgent first, and the direction can then be flipped. The table's headers are shortcuts that cycle ascending, descending and off, and it's `manualSorting`. Tasks with no due date always sort last, and ties fall back to position. The **board** keeps its manual drag order, so the Sort menu hides there.
  - **Closed tasks** (Completed or Cancelled) keep a normal, full-contrast title on cards, board cards and table rows, with no muted strike-through (the user found it hard to read, 2026-09-25). Todos keep their strike-through.
  - **Rows** are 44px or taller with the default shadcn hover. Only the title is a button (it opens the task); the row itself isn't clickable.
  - There's no row selection or pagination yet; add them when bulk actions arrive.
- **Entity chip** (HoverCard). An inline pill 24px high with a 6px radius, a status icon (tasks) or a `file-text` icon (notes). **Corrected 2026-09-26 (the user's request): never the space accent.** Inline task mentions in a note (typed with **`@` or `[[`**) use `MENTION_CLASSES` + `MENTION_LABEL_CLASSES` (`lib/tint.js`): **no fill** (revised the same day), **`text-blue-600` `font-medium`** text and icon (dark: `blue-400`; WCAG AA checked: 5.25:1 on white, 4.81:1 on muted, 7.46:1 and 6.60:1 on the dark page and card), a **dotted blue underline** on the label (`decoration-blue-400`, offset 3) that turns solid on hover, one common task icon (`square-check-big`), and **no status icon**. The chip looks the same while loading, and the prose link style skips `.axon-mention`, so it can't recolour it. Linked lists (the note rail's Linked tasks, now **below the details**) have **no fill**: a status icon and the title, underlined on hover. In linked lists, a mention link shows just a faint **@** icon (a tooltip explains it; no "Mentioned" word). **The hover card is a mini task card** (352px, `w-88`): pills and versions, a 2-line title and description, tags, and a dashed footer with "Updated …" and due; the space emoji only in Global. (All the user's requests, 2026-09-26.) The hover card is 300px wide and shows status · priority · due, then the title.
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
  - **Versions** (`VersionBadge`, free text, several per task): shadcn's `secondary` badge with the tags' `rounded-sm` radius, tabular numbers, and truncation at `max-w-32`. They sit **at the right end of the title row** on the grid card and in the task dialog (removable ✕ there), beside the links button and ⋮ in table rows, and in the board card's top row. Cards, rows and previews show **one**, then "+n", with a HoverCard listing them all, like the tags (the user's request, 2026-09-26; it was 2 and a tooltip). They're added from the dialog's "Version" chip, which suggests versions already used in the space, newest first.
  - **Card footer** text ("Updated …" and the due label) uses the normal sans font, not mono (the user's request, 2026-09-25). Mono due labels remain everywhere else.
  - **Checklist progress** (`ChecklistProgressBadge`, the same everywhere) has a fixed `list-checks` icon plus "3/7", and **colour carries the progress** (the user tried a filling ring and preferred this, 2026-09-25). With nothing checked it's all muted. When partly done, only the done count is emerald. When everything is done, the whole badge is emerald. Don't swap the icon by state.
- **Kanban card / task card.** `bg-card`, a border, 9–10px radius and 12px padding. Status icon and title on the first line; priority, tag pills and a mono due date on the second. The columns are `bg-muted` wells.
- **Note card** (Feature 06, following the grid task card): `bg-card`, `rounded-xl`, at least 148px tall (`min-h-37`), the whole card a link. A 2-line semibold title (no leading icon: it was tried on 2026-09-26 and removed the same day, because it broke the card's left edge and every card here is a note; the icon stays only where notes and tasks mix, on the task page's linked-notes cards and in chips) ("Untitled" in faint) with its versions (`VersionBadgeGroup`, like the task card) and ⋮ (Pin/Unpin, Move to Trash) on its right, a 2-line muted excerpt, a spacer, tags pinned above the footer (`TagPillGroup max={3}`), and a dashed footer with "Updated 2d ago" in the normal sans font (space emoji before it in Global). The notes list has **no sort** (always newest edit first) and shows a **Pinned** section before **All notes**; its second view is a Table (Note + excerpt, Space in Global, Tags, Version, Updated, ⋮; empty cells show the muted `-`).
- **Note editor** (Feature 06): the sidebar is **left as the user set it** — no auto-collapse on `notes/:noteId` (the user's request, 2026-09-25, overriding design 07b; they collapse it themselves if they want). The header holds the save state, a pin toggle, a Details (`panel-right`) toggle and ⋮. A 680px reading column (`max-w-170`): the display title on its own, directly above the body (tags and versions moved to the rail on 2026-09-26, the user's request: a note's metadata sits in one place, like the task page; the "Edited …" line went too, since the rail shows Updated), then the body in `text-base leading-7`. A **256px** right rail (`w-64`, **the sidebar's width, for symmetry**: the user's request, 2026-09-26, after trying 280 and 352; hairline left border) lists Space, Created, Updated, Words, a **Tags** row (removable pills + a dashed "+ Tag" picker), a **Versions** row (removable badges + a dashed "+ Version" picker), then Linked tasks; below `lg` the toggle opens a Sheet instead.
- **Notes tag filter** (revised 2026-09-26, the user's request: chips didn't scale to many tags): the **same Tags filter as the Tasks page** (`TagPicker mode="filter"`, an outline "Tags · n" button opening a searchable multi-select), on the right of the toolbar before the view switch, with a ghost "Clear" when search or tags are set. The earlier inline chips (design 07a) are gone.
- **Editor extras** (Phase 2): the table menu is a bar like the bubble menu, anchored under the table (bottom-start), with row, column and header controls; deletes turn destructive on hover. Code blocks show a borderless 28px language Select in the top-right corner on hover or focus, and syntax colours use the tint-text recipe (hue 72% + foreground). The shortcuts cheat sheet is a shadcn Dialog with two columns of 32px rows, the label left and `Kbd` right.
- **Editor images** (Feature 15): block images at their natural width, capped at the column (`max-w-full`), `rounded-lg`, with the natural aspect ratio reserved so reloads don't jump. Uploading shows the local preview at 50% with a centred spinner; loading shows a muted skeleton; failure shows a dashed muted box, "Image unavailable" with Retry. Selected: `ring-2 ring-ring` with a 2px offset, plus a small "Alt text" button in the bottom-left corner and a **resize handle on each side** (a 6×40px `bg-foreground/70` pill on a 12px hit area, `cursor-ew-resize`): drag to resize (80px up to the column; the aspect ratio kept), arrow keys for 20px steps, and a double-click to reset (the user's request, 2026-09-25). The drop cursor is `--ring`, 2px.
- **Task detail page** (Feature 07): a main column capped at 720px (`max-w-180`), padded 40/56.
  - **Title:** `text-3xl` semibold (the design's 26px sits between our steps).
  - **Description:** the rich editor at `text-sm leading-6`, only as tall as its content (the user's request, 2026-09-25).
  - Then the checklist, then "Activity": one oldest-first stream on a thin line with 24px round icon markers, automatic entries as sentences with a faint relative time (absolute date in a tooltip), and manual entries as `bg-card` cards labelled "Work log". The composer card is at the bottom.
  - **Rail:** **256px** (`w-64`), **the same width as the sidebar** for a symmetric frame (the user's request, 2026-09-26, after trying 300, 320 and 352); the same width as the note rail with 84px labels (`w-21`), and a Sheet below `lg`. Link cards are 36px bordered rows (an icon, "!1431 · group/project", ↗). The footer has a Pinned switch and a `destructive` "Move to Trash".
- **Links** (Feature 07 Phase 2):
  - On the task page, "Linked notes" is a 2-column grid of excerpt cards (`rounded-xl`, a file icon + title, a 2-line `text-xs` excerpt, faint "Updated …"; the whole card links; ✕ on hover unlinks).
  - In the note rail, "Linked tasks" (below the details): entity chips with a due label and a hover ✕, then **Link task** (picker) and **New task**, which opens the full task dialog in the note's space and links what it saves (the user's request, 2026-09-26; it replaced a quick title field).
  - **Link a note** (task page) is a proper Dialog (the user's request, 2026-09-26): shadcn's default header, `sm:max-w-2xl`, `max-h-dialog` with a pinned search and a scrolling list (its own scroll area, themed scrollbar, capped at `max-h-120`) of **note-card rows without the footer** (a 2-line semibold title with versions on the right, a 2-line excerpt, tags; the space emoji when the note is from another space or in Global). The highlighted row gets `border-border-strong` and `shadow-xs`. The task picker stays a compact command dialog with a `SpaceBadge` per result.
  - Counts: note card footer right (`square-check-big` + n); task card meta row (`file-text` + n).
- **Editor popups:** the bubble menu is a 36px `bg-popover` bar (`rounded-lg`, `shadow-md`) of 28px icon buttons with tooltips and `aria-pressed`, then a "Turn into" menu; link editing swaps an inline URL field into the bar. The `/` menu is a 280px panel (`rounded-xl`, `shadow-md`) titled "Blocks", with 36px rows: a 24px bordered icon tile, the label, and the markdown hint in mono faint. Highlight marks use `--warn` at 28%.
- **Date picker** (Popover + Calendar), 260px wide. Quick chips first: Today, Tomorrow, Fri, Next week. The selected day is `bg-primary`; today uses red text with a muted background.
- **Tag picker** (Popover + Command). Selected tags appear as chips inside the search input. Each option is the tag's **actual badge** (`TagPill size="md"`), not a colour dot plus plain text. It doesn't show the tag's space or scope, and selected tags get a **check icon on the right**. The highlighted row gets **no background** (all the user's requests, 2026-09-25). It ends with "Create "…"".
- **Task dialog** (revised 2026-09-25 after the user reviewed it in the browser; they found the text "so small and heavy"):
  - **Height:** capped by `max-h-dialog` (a utility in `index.css`: `calc(100dvh - 4rem)`). The header and footer stay pinned, and only the middle (title → checklist) scrolls. The description textarea grows with its content and has no scroll of its own. Use the same pattern for any dialog whose content can grow.
  - The header is shadcn's default title and description (see `components.md`), with a ghost `icon-sm` close button beside it.
  - The task title is `text-xl font-semibold tracking-tight` (the user asked for semibold, 2026-09-25, after trying medium), and it **wraps onto more lines** instead of cutting a long title off (`TitleTextarea`, the user's request, 2026-09-25). Versions stay top-right of the first line. The description is the **compact rich editor** (Feature 06 Phase 3): borderless, default `text-sm`, "Add description…", markdown shortcuts, the selection bubble and `/` (no H1 or Table), and no toolbar. It grows inside the scrolling body; while an edit loads its description, it shows a 2-line skeleton.
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

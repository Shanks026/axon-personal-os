# Design v1 vs Feature Plans: Deltas

**Source:** Claude Design v1 (`Axon design system built/`), compared with feature docs 02–14 on 2026-09-23.

**How this file is used:**
- Step 4 of the `axon-feature` skill says: before building any phase, fold that feature's deltas below into its feature doc. Then mark the row `✅ folded`.
- **Adopt** means the design wins; update the doc to match.
- **Keep plan** means the plan wins; the design is illustrative.
- **Decide** means ask the user first.

Global decisions that already apply everywhere are recorded in `.claude/rules/design-system.md`.

---

## Global (already decided)

| # | Delta | Resolution |
|---|---|---|
| G1 | **Tasks & Todos are one module.** The nav item is "Tasks & Todos", with tabs All · Tasks · Todos · In progress · Completed. There is no standalone Todos page on desktop. | **Adopt.** `/s/:slug/todos` redirects to `tasks?tab=todos`. Feature 05 becomes "Todos inside the Tasks module" (the data, the components and the tab). The mobile design still shows a separate Todos screen; on mobile, use the same Tasks module with its tabs. |
| G2 | **The task views** are a card **grid** (default), **board** and **list**, switched with a three-way segmented control. Cards show a description preview, a filled status pill, priority, tags, checklist progress, due date and an MR icon. In Global, the space goes in the card footer. Todos appear as cards, with "↳ parent" when they're checklist items. | **Adopt.** The list view stays as the dense option. The grid needs `description_text` (first 140 characters) in the list select. |
| G3 | "Done" is labelled **"Completed"** for tasks. Todos use "Todo" / "Done". | **Adopt** (labels only; DB values unchanged). |
| G4 | Two header heights: 56px (Dashboard, Tasks, Calendar) and 48px with a sidebar toggle (everything else). | **Standardise on 48px with a `panel-left` toggle.** Page-level alerts (e.g. "2 overdue · Review") go in the header actions slot. |
| G5 | Two palettes appear: iOS hues on some screens, the 10-key palette on others. | **Use the 10-key palette only** (`design-system.md`). |
| G6 | Card radius is 16 on the dashboard and 12 elsewhere. | Use 12 (`--radius-xl`) for widgets everywhere. |
| G7 | The design implies several new shared components. | Added to `axon-data-patterns.md` §10, each built with the feature that first needs it: `StatusPill`, `PriorityPill`, `SegmentedControl`, `FilterDropdownButton`, `HeaderAlert`, `ThemeToggleButton`, `Kbd`, `ItemCard`, `PropertyRow`, `PropertyChip`, `SwitchRow`, `ExternalLinkCard`, `TagChipFilter`, `CountTiles`, `ThemePreviewCard`, `HeroEmptyState`, `ErrorPage`, `Splash` (with a progress bar), `Fab`, `EditorAccessoryBar`, plus a `lib/fiscal.js` `getFiscalWeek()` helper. |

## Open decisions for the user

| # | Question | Recommendation |
|---|---|---|
| D1 | The note rail shows **note→note backlinks**, which aren't planned: mentions only link notes to tasks. | Leave them out of v1. Add `[[note]]` mentions and a `note_links` table as a backlog item after Feature 07. |
| D2 | The note editor's bubble toolbar has **"Make task"**, which creates a task from the selected text and replaces the selection with a mention chip. | Adopt it in 07 Phase 3, since it reuses the mention creation flow. |
| D3 | **Choosable journal templates** (the "Standup template" label). | v1 ships the standup template only. Template choice goes to the backlog. |
| D4 | **Fiscal week numbers** (W13) in Calendar and Journal. | Adopt, using the `getFiscalWeek(date, fyStartMonth, weekStartsOn)` helper. |

---

## Per feature

### 02 Auth and Settings (✅ folded: auth into Phase 1, settings into Phase 2)
- **Adopt:**
  - Signup has Name, Email and Password, with **no confirm field**. The password minimum is **10**.
  - The inline login error reads "That password doesn't match this email."
  - A "Forgot?" link sits beside the Password label.
  - ~~Check-email has "Open mail app" and a resend countdown.~~ **Superseded:** email confirmation is disabled, so signup goes straight to `/spaces`. The check-email design is used only for the forgot-password "check your inbox" state.
  - Reset shows "For <email>".
  - The layout is split: a 46% brand panel and a 360px form.
- **Adopt (settings):**
  - Sections are **Preferences** and **Profile & account** (merged).
  - Week start is **Monday or Sunday** only (a segmented control).
  - The time zone shows its GMT offset.
  - Theme is picked from **three preview cards**.
  - The FY preview is a strip of four quarter tiles, with the current one outlined.
  - Nav is 240px with "Back to <space> · Esc"; content max-width 640.
- **Keep plan:**
  - The copy says "confirmation link", because we use a password flow, not a magic link. The design's "sign-in link… 15 minutes" copy isn't used.
  - The callback and expired-link states use the same layout.

### 03 Spaces and shell (✅ folded; gallery and card counts come with 04 and 06; switcher shortcut hints and the Inbox badge come with 12 and 13)
- **Adopt:**
  - Card counts (open tasks, notes) are in scope **from Phase 1**. They're a count query per table, and they show zeros until the tables exist.
  - The Global card comes first, showing aggregate counts.
  - Cards get a grip handle on hover, a `…` menu, a dashed ghost "New space" card, and a collapsed "Archived N" row.
- **Adopt (space dialog):**
  - The dialog is 520px. The slug preview reads `axon.app/s/<slug>` with a pencil icon.
  - ~~The icon picker is an inline searchable grid (9 columns, 18 icons).~~ **Changed:** spaces use **emoji only**, shown plainly with no tinted tile. The picker is an inline searchable 9-column emoji grid that also accepts any pasted emoji. Space images move to Feature 15.
  - There are 10 colour swatches. The submit button shows ⌘↵.
- **Adopt (delete dialog):** 440px, with **six count tiles** (tasks, notes, todos, events, journal days, reports). Counts for tables that don't exist yet are omitted.
- **Adopt (sidebar):**
  - Search ⌘K and Quick capture ⌘J buttons sit under the switcher. They're stubs until Features 12 and 13.
  - Nav: Dashboard, Inbox (with a badge), Tasks & Todos, Notes, Journal, Calendar, Reports.
  - Then Pinned, then a footer with Trash, Settings, and a user row (initials, name, theme icon).
- **Gallery layout:** max-width 1040, 3 columns, gap 16, cards min-height 176.

### 04 / 05 Tasks and Todos (restructured by G1 and G2) (✅ 04 items folded into 04 Phase 1; board items at Phase 2; todo items at 05)
- **Adopt:**
  - The header has **New todo** (secondary) and **New task** (primary), and a count in weight 300.
  - The toolbar has a 340px search on the left. On the right: Status, Priority, Tags and Due dropdowns, plus the view segmented control.
- **Adopt (board):**
  - **5 columns** (To do, In progress, In review, Blocked, Completed). Cancelled is hidden from the board. Tasks only.
  - Columns are 270px `bg-muted` wells with "+ Add task".
  - The drop slot is a 96px dashed accent box.
- **Adopt (new task dialog):**
  - A Linear-style layout: a space chip with "› New task", a large title, and **"Add description…"**. Description is now in the create dialog; it's saved as a plain paragraph in the Tiptap doc.
  - Property chips for status, priority, start, due, tags and link.
  - A **"Create more"** switch, and ⌘↵ to submit.
- **Adopt:** loading uses skeleton cards 208px tall. The empty state says "Press C".
- **Doc changes:**
  - 05 no longer builds `TodosPage`. It builds `TodosTab` inside `TasksPage`, plus `TodoCard` and `TodoDialog`, and keeps the `TodoChecklist` phase.
  - `?highlight=` becomes `tasks?tab=todos&highlight=<id>`.
  - Todo groups (Overdue, Today, Upcoming, Someday) apply in list view within the Todos tab.

### 06 Notes
- **Adopt (list):**
  - "New note" goes in the header. The toolbar has the grid/list toggle, **inline tag chip filters** (All, sprint, rca…) and a 220px search.
  - There's no sort control (always sorted by last updated).
  - Sections are "Pinned", then "All notes". Cards show a linked-task count.
  - The grid is 3 columns, with cards min-height 148.
- **Adopt (editor):**
  - The sidebar **auto-collapses to the rail** on the editor route.
  - The header has the save state, a pin button and a `panel-right` rail toggle.
  - The tags row has "+ Tag" and "Edited 2h ago".
  - Max-width 680, a 36px title, a 15/1.7 body and a 280px rail.
- **Adopt (bubble toolbar):** bold, italic, strike, code, link, H2, **highlight** (adds `@tiptap/extension-highlight`), and "Make task" (in 07, per D2).
- **Adopt (slash menu):**
  - Items: H1, H2, bulleted list, checklist, quote, code, table, divider, and Link task (in 07), each with a markdown hint.
  - **Keep plan** additions: Text, H3 and numbered list are kept, but listed last.
- **Adopt (rail):** Linked tasks (tagged `mention` or `linked`, in 07), then metadata: Created, Updated and **Words**. Backlinks are left out, per D1.

### 07 Task detail and linking
- **Adopt:**
  - The header has breadcrumbs, **prev/next** (chevron up/down, J/K, following the current filtered list order), and a `…` menu.
  - The section is called "Linked notes" and shows excerpt cards in 2 columns.
- **Adopt (activity):**
  - One "Activity" stream, **oldest first**, with **no toggle**.
  - The composer sits at the bottom ("Log work or leave a note… ⌘↵"). Manual entries are cards labelled "Work log".
- **Adopt (rail):**
  - Fields: Status, Priority, Start, Due, Space, Created, Completed, Tags, then an **ExternalLinkCard**. It parses GitLab MR URLs into "!1431 · thmp/buyer-web" and handles Jira too.
  - The footer has a **Pinned switch** (pin UI moves forward from 14 for tasks) and "Move to Trash".
- **Layout:** main column max-width 720 with padding 40/56. The rail is 300px with 84px labels. The checklist has a 120px progress bar.

### 08 Calendar
- **Adopt:**
  - The header doubles as the toolbar: title, a mono subtitle ("W13 · Global"), Today, ‹ ›, the Month/Week/Day/Agenda segments, and "+ Event".
  - Legend: a filled dot marks an event, a hollow square a due item.
  - All-day and due chips sit in the week's day-header cells.
- **Keep plan:**
  - The **month grid is 6 rows.** The design shows 5, which is wrong for months that span 6 weeks.
  - The "Show tasks/todos" toggle is kept, but moved into a small `⋯` layers menu.
- **Adopt (week view):**
  - A 56px time gutter and 56px per hour, scrolled to 08:00.
  - Weekend columns are tinted with `bg-sidebar`.
  - Today's number and the now-line are red (destructive), and the now-line has a dot.
  - Events use a soft background with a 3px left border in the space colour.
  - Dragging lifts the event, leaves a dashed origin ghost, and shows a resize bar.
- **Adopt (event dialog):** read-style icon rows, plus a footer button "Create meeting note" (Phase 3).

### 09 Journal
- **Adopt:**
  - The date strip is a **fixed 14-day grid with ‹ ›** (day cells 56px tall). A "Sep 2026" button opens the mini month.
  - The title is the date plus "Q2 · W13" (D4). The state shows "Saved".
  - Section headings are uppercase, with Blockers in red.
  - Max-width 660 and a 300px rail.
- **Adopt (rail):**
  - Titled **"Done today · auto-listed for reference"**. It includes status changes from `task_activity`, not just completions.
  - The **"Insert into Today"** button moves into the rail.
- **Drop:** the streak and entry-count indicator. It isn't in the design; move it to the backlog.

### 10 Dashboard
- **Adopt:**
  - Header actions: **"Write today's log"** and **New task**. This replaces the Journal prompt widget.
  - **4 tinted stat tiles:** Overdue ("oldest 3d"), Due today, In progress, and Completed · Q2 ("+4 vs Q1").
  - **Global:** the per-space breakdown cards sit **above Today**. Each has open/overdue/done pills and a progress bar.
  - **Today** is a 3-column `ItemCard` grid, with a link to "All tasks & todos".
  - **Quarter progress** (W1–W13, with the current week faded) and **Upcoming** (date column plus time pill) share a 7/5 row.
  - **Recent notes** are 4 muted cards with a tag and no snippet.
  - **Remove** the In progress widget; the tile links to the filtered tasks instead.
- **Layout:** max-width 1120. `dashboard_summary` needs `oldest_overdue_days`.

### 11 Reports
- **Adopt (list):**
  - The button is "Generate report".
  - Quarter cards show a big "N tasks completed" plus "created · **carried**". **Carried** means open at the period end and created before the period start. Add it to `report_stats` as `tasks.carried_over`.
  - The current quarter is outlined in the accent with a Draft badge. Future quarters are dashed ("Starts 1 Oct").
  - A missing past quarter reads "35 tasks completed · No report yet", with Generate.
- **Adopt (report page):**
  - The header has "Numbers from…", Refresh, an Export dropdown, and a primary **"Mark final"** (lock) button.
  - **4 tiles with deltas vs the previous quarter:** Completed, Created, In progress at end, and Overdue.
  - The byline reads "Quarterly report · <name> · <space description>".
  - **Section order:** Summary, Highlights, In progress, Key notes, Next quarter focus, **Blocked or carried over**.
  - Charts: completed per week and a priority donut (1.4fr / 1fr), then "By tag" at full width.
- **Adopt (generate dialog):**
  - A **2-step wizard**: scope as two cards, then the period plus a preview of 4 stats ("Current quarter · 7 days left").
  - Buttons are Back / Create draft. **No title field**; the title is automatic and editable on the page.
- **Print:** white paper with 56/64 padding, always the light theme.

### 12 Command palette and shortcuts
- **Adopt (palette):**
  - The scope chip reads **"All spaces"** (or the space name).
  - **Tab filters by type.** This moves out of the backlog into Phase 1.
  - Rows get a subtitle ("edited yesterday").
  - The palette is 640px, with a 2px backdrop blur.
- **Adopt (shortcut remap):**
  - New todo **⇧C**. Toggle sidebar **⌘\\**. Toggle theme **⌘⇧L**.
  - Switch space **⌘0** (Global) and **⌘1–9**, by space position.
  - Set status **S** and priority **P** on the focused row.
  - The `g o` shortcut is dropped, since Todos no longer has its own page.
  - Before building, check that ⌘digit isn't swallowed by the browser (Chrome uses ⌘1–9 for tabs). The fallback is Alt+digit.
- **Adopt (help dialog):** 760px, two columns, no filter input.

### 13 Inbox and quick capture
- **Adopt:**
  - Actions show only on the **focused row**, as key chips: Task **T**, Todo **D**, Note **N**, Event **E**, Move **M**, Discard **⌫**.
  - Items show a **kind icon and a source**:
    - Add a column `inbox_items.source text not null default 'quick_capture' check (source in ('quick_capture','email','api'))`. Only quick_capture is used until Feature 18.
    - The kind icon is derived, not stored: a URL means bookmark, a leading "?" means question, otherwise idea.
  - Inbox zero says "You triaged N things today", which needs a processed-today count.
  - Page max-width 760.
- **Adopt (capture dialog):**
  - 560px, with no "Keep capturing" switch and no Event type.
  - ⇥ cycles the type chips (Inbox, Task, Todo, Note). The space select is on the right, and ⌘↵ submits.
- **Keep plan:** the Processed tab and bulk select stay in Phase 2. They're power features the design simply doesn't show.

### 14 Pins and trash
- **Adopt:**
  - Trash groups are Tasks, Notes, **"Todos & events"**, Journal and Reports. The last two appear only when non-empty.
  - Rows show "Deleted 2h ago" and **"Nd left"** (red at 3 days or fewer), with Restore and × (delete forever).
  - "Empty trash" is a destructive outline button. Its confirm shows `CountTiles` by type.
  - Max-width 860, with rows 44px tall.
- **Note:** pin toggles ship earlier, with task detail (07) and the note editor (06). Feature 14 then adds the sidebar Pinned list, pins on report pages, and the shared `PinToggle` refactor.

### States and mobile
- **States:**
  - Toasts: the Undo toast shows a **⌘Z** hint, and ⌘Z triggers the last undo. There's an offline error variant.
  - 404 and 500 pages show a large mono code, a ref line, and CTAs including Search ⌘K.
  - The splash has a progress bar and "Syncing your spaces…".
- **Mobile (Feature 20, plus responsive work in each feature):**
  - A 52px header with 44px touch targets and 16px gutters.
  - A **FAB** on Dashboard and Tasks, and the drawer uses the 240px sidebar.
  - The note editor has a keyboard accessory bar (H2, list, checklist, bold, mention, collapse). **Image** waits for Feature 15.

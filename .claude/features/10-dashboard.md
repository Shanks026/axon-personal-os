# Feature 10: Dashboard (per Space and Global)

**Product**: Axon, a personal second-brain OS
**File**: `.claude/features/10-dashboard.md`
**Status**: 🔵 Planned
**Depends on**: 08, 09
**Last Updated**: September 2026

---

## Context

The dashboard is the index route of every space (`/s/:slug`) and of Global. It answers "what needs me today, and how is this quarter going?" in one glance. Phase 1 composes widgets from hooks that already exist (tasks, todos, events, notes, journal), adding only a few list params. Phase 2 adds one aggregate RPC, `dashboard_summary`, for fiscal-quarter numbers and a weekly completion chart, using `lib/fiscal.js` for quarter boundaries and shadcn Chart for rendering.

---

## Phase Overview

```
Phase 1: Widgets
  DashboardPage with Greeting, Today, In progress, Upcoming, Recent notes and Journal prompt widgets,
  each with its own skeleton, empty and error state.

Phase 2: Quarter insights
  dashboard_summary() RPC, StatTiles row, QuarterProgressWidget chart with delta vs previous quarter,
  Global-only SpaceBreakdownWidget.
```

**After each phase, stop and wait for approval.**

---

## Phase 1: Widgets

### Goal
Opening a space (or Global) lands on a dashboard showing:
- A greeting with the user's name, today's date and the current fiscal quarter.
- What is overdue or due today (tasks and todos, with quick completion).
- What is in progress.
- The next seven days of events and due tasks.
- The five most recently edited notes.
- Whether today's journal entry has been written.

Widgets stagger in, and each loads, fails and shows its empty state independently.

### Before Starting: Confirm With Codebase
1. Features 08 and 09 are complete. Confirm: `useTasks` supports `status`, `dueFrom`, `dueTo`; `useTodos` supports `dueTo`, `isDone`; `useEvents`; `useNotes`; `useJournalDates`; `todayISO`/`zonedDayRange` in `lib/dates.js`; `useNow` in `src/hooks/`.
2. Confirm `TodoItem` (`features/todos/components/TodoItem.jsx`) props and that its toggle is optimistic. Confirm the tasks feature's status constants (for example `OPEN_STATUSES`) and a quick-complete mutation (`useUpdateTask` with `{ status: 'done' }`).
3. `usePreferences()` returns `fyStartMonth` and `timezone`; `useMyProfile()` returns `full_name`; `lib/fiscal.js` exports `getFiscalQuarter` and `formatQuarter`.
4. Check the current `motion/react` stagger API used by `staggerContainer` in `presets.js`.

### 1.1 Database
No database changes in this phase.

### 1.2 API Layer
The dashboard has no Supabase access of its own in Phase 1. It composes existing hooks. Additive params:

| File | New params | Query |
|---|---|---|
| `features/tasks/api.js` `fetchTasks` | `limit`, `orderBy` (`'position'` default, `'due_date'`, `'updated_at'`) | `.order(orderBy, { ascending: orderBy !== 'updated_at', nullsFirst: false })`; `if (limit) q = q.limit(limit)` |
| `features/todos/api.js` `fetchTodos` | `limit` | `.limit(limit)` |
| `features/notes/api.js` `fetchNotes` | `limit` (order is already `updated_at desc`) | `.limit(limit)` |

`src/features/dashboard/utils.js` (tests in `src/tests/features/dashboard/utils.test.js`):
- `greetingFor(hour)`: "Good morning" for 5–11, "Good afternoon" for 12–17, "Good evening" otherwise.
- `quarterProgress(todayISO, { start, end })` returns `{ day, totalDays, percent }` (inclusive days). Tests cover the first day, the last day, and a leap-February quarter when the FY start is December.
- `mergeUpcoming(events, tasks, timeZone)` returns items grouped by local day, events before tasks, each group sorted by time.

`src/features/dashboard/hooks/useDashboardDates.js` returns `{ today, tomorrow, in7, dayRange, weekRange, quarter }`, derived from `useNow()` (so it rolls over at midnight) and `usePreferences()`.

### 1.3 Components

```
src/features/dashboard/
├── utils.js
├── hooks/useDashboardDates.js
├── components/
│   ├── DashboardGrid.jsx            # responsive grid + stagger container
│   ├── WidgetCard.jsx               # Card shell: icon, title, action link, body, footer
│   ├── WidgetSkeleton.jsx           # rows={n} list-shaped skeleton
│   ├── DashboardTaskRow.jsx         # compact task row with quick-complete
│   ├── Greeting.jsx
│   ├── TodayWidget.jsx
│   ├── InProgressWidget.jsx
│   ├── UpcomingWidget.jsx
│   ├── RecentNotesWidget.jsx
│   └── JournalPromptWidget.jsx
└── pages/DashboardPage.jsx          # /s/:slug (index) and /s/:slug/dashboard
```

- **`DashboardPage`**: `usePageHeader({ title: isGlobal ? 'Global' : space.name })`. It renders `Greeting`, then `DashboardGrid` containing the widgets in this order: Today, Upcoming, In progress, Journal prompt, Recent notes.
- **`DashboardGrid`** `({ children })`: `grid gap-4 md:grid-cols-2 xl:grid-cols-3`. Today spans two columns on `xl`. It is a `motion.div` with `staggerContainer()`, and each child is wrapped in `slideUp`. The stagger plays on the first mount of the page (a page entrance, not a list re-render), and data arriving later doesn't re-trigger it.
- **`WidgetCard`** `({ icon: Icon, title, action, children, className })`: a shadcn `Card` with the header icon and title. `action` is a small "View all" `Link`.
- **`DashboardTaskRow`** `({ task, showSpace })`:
  - A round "complete" button (`aria-label="Mark done"`, tooltip) that calls `useUpdateTask` `{ status: 'done' }` optimistically, then `toast('Task completed', { action: Undo → previous status })`.
  - The title is an `EntityLink`, followed by the `formatDueLabel(due_date)` chip (overdue in destructive text), a priority icon, and a `SpaceBadge` when `showSpace`.
- **`Greeting`**: "Good morning, Chris" (the first word of `full_name`, or no name), then `formatDate(today)` and `formatQuarter(getFiscalQuarter(today, fyStartMonth), fyStartMonth)` with "day 85 of 92" from `quarterProgress`. The hour comes from the profile time zone.
- **`TodayWidget`**:
  - Tasks: `useTasks({ spaceIds, status: OPEN_STATUSES, dueTo: today, orderBy: 'due_date' })`, split into Overdue (`due_date < today`) and Due today.
  - Todos: `useTodos({ spaceIds, isDone: false, dueTo: today })`, rendered with `TodoItem` (quick toggle). Toggled rows stay visible, struck through, until the next refetch, so they don't jump.
  - Empty: `EmptyState` "You're clear for today" with the action "Plan tomorrow" linking to `p.tasks()`.
- **`InProgressWidget`**: `useTasks({ spaceIds, status: ['in_progress','in_review'], orderBy: 'updated_at', limit: 8 })`. Rows show a status badge. "View all" goes to `p.tasks({ status: 'in_progress' })`. Empty: "Nothing in progress", with the action "Open tasks".
- **`UpcomingWidget`**: `useEvents({ spaceIds, from: now, to: end of in7 })` plus `useTasks({ spaceIds, status: OPEN_STATUSES, dueFrom: tomorrow, dueTo: in7 })`, merged by `mergeUpcoming`. Day headers read "Tomorrow" or "Fri 25 Sep". Events show `formatTimeRange` and link to `paths.calendar({ view: 'day', date, event: id })`. "View all" goes to the calendar agenda view. Empty: "A quiet week ahead", with the action "New event" (navigates to the calendar with the dialog open).
- **`RecentNotesWidget`**: `useNotes({ spaceIds, limit: 5 })` (kind `note` only since 09). Each row shows the title (or "Untitled"), a `content_text` snippet (1 line, truncated), `formatRelative(updated_at)` and a `SpaceBadge` in Global. Empty: "No notes yet", with the action "New note".
- **`JournalPromptWidget`**:
  - In a space: `useJournalDates({ spaceIds: [space.id], from: today, to: today })`. Written shows "Today's entry is written", with the action "Open". Not written shows "How's today going?", with the primary action "Write today's entry" linking to `p.journal()`.
  - In Global: one line per active space with a written/not-written indicator and a link to that space's journal.
- **States:** every widget renders `WidgetSkeleton` while `isLoading`, a compact `ErrorState` with `refetch` on error, and its own `EmptyState` (compact variant) when empty. One failing widget never blanks the page.

### 1.4 Routes and Integration
- `router.jsx`: the `/s/:spaceSlug` index route and `dashboard` both render `features/dashboard/pages/DashboardPage.jsx`.
- `RootRedirect` already targets the space root, so nothing else changes.

### 1.5 Impact on Existing Features
| Existing feature | Impact | Action |
|---|---|---|
| 04 `fetchTasks` | New `limit`, `orderBy` | Add them |
| 05 `fetchTodos` | New `limit` | Add it |
| 06 `fetchNotes` | New `limit` | Add it |
| 03 placeholder dashboard | Replaced | Swap the placeholder page |

### 1.6 Not in This Phase
- Aggregate counts, charts and per-space breakdown (Phase 2)
- A customisable widget layout (backlog)

### 1.7 Checklist: Before Marking Complete
- [ ] `/s/<slug>` and `/s/global` render the dashboard; Global rows show space badges
- [ ] The greeting shows the right fiscal quarter label for the profile's FY start and time zone
- [ ] Today lists overdue and due-today tasks separately; quick-complete is optimistic with Undo; todo toggles work via `TodoItem`
- [ ] Upcoming merges events and due tasks for the next 7 days, grouped by day
- [ ] Recent notes never includes journal entries
- [ ] The journal prompt reflects today's entry and links to the journal
- [ ] Each widget shows its own skeleton, error (with retry) and empty state; forcing one query to fail leaves the others working
- [ ] The widgets stagger in once on page entry and never re-animate on refetch
- [ ] `greetingFor`, `quarterProgress` and `mergeUpcoming` tests pass
- [ ] `npm run lint`, `npm test` and `npm run build` pass
- [ ] `axon-rules` audit is clean for the changed files
- [ ] `00-index.md` status and changelog are updated

**Stop here. Show the result and wait for approval.**

---

## Phase 2: Quarter Insights

### Goal
A row of stat tiles shows open, overdue, due-today, in-progress and blocked tasks, and tasks completed this quarter. A quarter progress widget charts tasks completed per week this fiscal quarter, with the change against the previous quarter. In Global, a space breakdown shows each space's open and completed-this-quarter counts. All of it comes from one RPC call.

### Before Starting: Confirm Phase 1 Is Approved
1. Phase 1 is `✅ Complete`.
2. **Load the `dataviz` skill before writing any chart or stat-tile code.** Follow its form, colour and tile guidance, mapped onto shadcn `chart` CSS variables (`--chart-1…5`). Don't pick palette values yourself: the design system owns them.
3. Check the current shadcn `chart` API (`ChartContainer`, `ChartConfig`, `ChartTooltip`, `ChartTooltipContent`) and the Recharts version it pins.
4. `lib/fiscal.js` `getFiscalQuarter` and `getQuarterRange` exist; derive the previous quarter with `getQuarterRange` (quarter 1 wraps to quarter 4 of `fiscalYear - 1`).

### 2.1 Database
Migration `create_dashboard_summary`. It introduces the shared helper `week_start_of`, which `report_stats` (11) also uses. The functions read `profiles.timezone` and `profiles.week_starts_on` for the caller, so completion timestamps bucket into local days and the user's weeks.

```sql
create or replace function public.week_start_of(p_date date, p_week_starts_on int)
returns date
language sql
immutable
set search_path = ''
as $$
  select p_date - ((extract(dow from p_date)::int - p_week_starts_on + 7) % 7);
$$;

create or replace function public.dashboard_summary(
  p_space_ids     uuid[],
  p_today         date,
  p_quarter_start date,
  p_quarter_end   date,
  p_prev_start    date,
  p_prev_end      date
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with prefs as (
    select coalesce(p.timezone, 'UTC') as tz, coalesce(p.week_starts_on, 1)::int as ws
    from (select 1) as one
    left join public.profiles p on p.id = (select auth.uid())
  ),
  t as (
    select tk.space_id, tk.status, tk.due_date,
           (tk.completed_at at time zone prefs.tz)::date as completed_on
    from public.tasks tk
    cross join prefs
    where tk.space_id = any (p_space_ids)
      and tk.deleted_at is null
  ),
  open_t as (
    select * from t where status not in ('done', 'cancelled')
  ),
  done_q as (
    select t.space_id, public.week_start_of(t.completed_on, prefs.ws) as wk
    from t cross join prefs
    where t.status = 'done' and t.completed_on between p_quarter_start and p_quarter_end
  ),
  weeks as (
    select gs::date as week_start
    from prefs,
         generate_series(public.week_start_of(p_quarter_start, prefs.ws)::timestamp,
                         p_quarter_end::timestamp, interval '7 days') as gs
  )
  select jsonb_build_object(
    'open_tasks',             (select count(*) from open_t),
    'overdue',                (select count(*) from open_t where due_date < p_today),
    'due_today',              (select count(*) from open_t where due_date = p_today),
    'in_progress',            (select count(*) from open_t where status in ('in_progress', 'in_review')),
    'blocked',                (select count(*) from open_t where status = 'blocked'),
    'completed_this_quarter', (select count(*) from done_q),
    'completed_prev_quarter', (select count(*) from t
                                where status = 'done' and completed_on between p_prev_start and p_prev_end),
    'completed_by_week', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'week_start', w.week_start,
               'count', (select count(*) from done_q d where d.wk = w.week_start))
             order by w.week_start), '[]'::jsonb)
      from weeks w
    ),
    'per_space', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'space_id', s.id,
               'open', (select count(*) from open_t o where o.space_id = s.id),
               'completed_this_quarter', (select count(*) from done_q d where d.space_id = s.id))),
             '[]'::jsonb)
      from unnest(p_space_ids) as s(id)
    )
  );
$$;

revoke execute on function public.dashboard_summary(uuid[], date, date, date, date, date) from public, anon;
grant execute on function public.dashboard_summary(uuid[], date, date, date, date, date) to authenticated;
```

- `completed_prev_quarter` counts tasks still `done` whose `completed_at` falls in the previous quarter. A reopened task loses `completed_at` (by trigger), which is intended.
- `completed_by_week` covers the whole quarter, so future weeks are 0 and the chart axis is stable.

Verify with `execute_sql` as the user (`set local role authenticated` plus `request.jwt.claims`): the counts match hand-written queries for one space, and another user's space id yields zeros. Run advisors.

### 2.2 API Layer
`src/features/dashboard/api.js`:

| Export | Details |
|---|---|
| `dashboardKeys` | `{ all: ['dashboard'], summary: (p) => ['dashboard','summary', p] }` with `p = { spaceIds, today, quarterStart, quarterEnd, prevStart, prevEnd }` |
| `fetchDashboardSummary(p)` | `supabase.rpc('dashboard_summary', { p_space_ids, p_today, p_quarter_start, p_quarter_end, p_prev_start, p_prev_end })` (ISO dates) |
| `useDashboardSummary(p)` | `enabled: spaceIds?.length > 0`, `staleTime: 0` (refetches on every dashboard visit, so there is no cross-feature invalidation) |

`useDashboardDates` gains `prevQuarter`. `utils.js` gains `quarterDelta(current, previous)`, which returns `{ diff, percent | null, direction: 'up' | 'down' | 'flat' }` (`percent` is null when `previous` is 0). Tested.

### 2.3 Components

```
src/features/dashboard/components/
├── StatTiles.jsx
├── StatTile.jsx
├── QuarterProgressWidget.jsx
└── SpaceBreakdownWidget.jsx
```

- **`StatTiles`**: one `useDashboardSummary` call feeds six `StatTile`s: Open, Overdue, Due today, In progress, Blocked, and Done this quarter. It sits between `Greeting` and the grid, as a responsive row (2 columns on mobile, 3 on `md`, 6 on `xl`).
- **`StatTile`** `({ label, value, to, tone })`: a large number with the label. It is a `Link` when `to` maps to an existing tasks filter (for example `p.tasks({ status: 'blocked' })`); otherwise it is static. `tone="danger"` is used only for Overdue when it is above 0. The number counts up on first render (`motion` `animate` on a motion value; skipped under reduced motion).
- **`QuarterProgressWidget`**: `WidgetCard` titled "Q2 FY 2026–27".
  - A header line: "42 done · ▲ 17% vs Q1", using `quarterDelta` (it reads "first quarter tracked" when the previous quarter is 0), plus a `quarterProgress` bar ("day 85 of 92").
  - Body: a shadcn `ChartContainer` `BarChart` of `completed_by_week` (x = `formatDateShort(week_start)`, y = count), with a tooltip and the current week highlighted. The chart spans two columns on `xl`.
  - Empty (no completions this quarter): the chart area shows the `EmptyState` "No tasks completed this quarter yet".
- **`SpaceBreakdownWidget`** (rendered only when `isGlobal`): a mini card per `per_space` row showing `SpaceIcon`, name, open count, and completed-this-quarter count. Clicking a card goes to `paths.space(slug).dashboard()`. Cards are sorted by `completed_this_quarter` descending.
- **States:** the tiles show skeleton blocks while loading. On error, the tiles row collapses to one `ErrorState` line with retry and the Phase 1 widgets are unaffected. The chart skeleton is a bar-shaped block.
- **Motion:** the tiles join the page stagger. Chart bars use Recharts' own entrance only when `useReducedMotion()` is false (`isAnimationActive` bound to it).

### 2.4 Routes and Integration
- `DashboardPage` composes `Greeting`, then `StatTiles`, then `DashboardGrid` (with `QuarterProgressWidget` first, and `SpaceBreakdownWidget` in Global).

### 2.5 Impact on Existing Features
| Existing feature | Impact | Action |
|---|---|---|
| 11 Reports | Reuses `week_start_of` | Its migration depends on this one |
| `data-model.md` | New helper and RPC signature | Keep the RPC summary in sync |

### 2.6 Not in This Phase
- Clicking a chart bar to filter tasks for that week
- Trend sparklines inside the tiles

### 2.7 Checklist: Before Marking Complete
- [ ] The `dataviz` skill was loaded before the chart and tile work, and its guidance is followed
- [ ] The migration is applied and mirrored; advisors are clean; the function is not executable by `anon`
- [ ] The RPC counts match manual SQL for a space, and are zero for a foreign space id
- [ ] Weekly buckets respect `week_starts_on` and the profile time zone (a task completed at 23:30 local lands on the local day)
- [ ] The tiles show correct counts in a space and in Global; linked tiles open the filtered task list
- [ ] The quarter chart covers every week of the quarter; the delta against the previous quarter is correct, including the zero-previous case
- [ ] `SpaceBreakdownWidget` shows only in Global and links to each space's dashboard
- [ ] Completing a task and revisiting the dashboard updates the tiles
- [ ] `quarterDelta` tests pass
- [ ] `npm run lint`, `npm test` and `npm run build` pass
- [ ] `axon-rules` audit is clean for the changed files
- [ ] `00-index.md` DB registry, status and changelog are updated

**Stop here. Show the result and wait for approval.**

---

## Data Model Summary (after all phases)

```
dashboard_summary(p_space_ids, p_today, p_quarter_start, p_quarter_end, p_prev_start, p_prev_end) → jsonb
  reads: tasks (RLS-scoped), profiles (timezone, week_starts_on)
week_start_of(p_date, p_week_starts_on) → date   (shared with report_stats)
```

### `dashboard_summary` result
| Key | Type | Notes |
|---|---|---|
| `open_tasks` | int | status not done or cancelled |
| `overdue` / `due_today` | int | open tasks, `due_date` before or equal to `p_today` |
| `in_progress` | int | `in_progress` plus `in_review` |
| `blocked` | int | status `blocked` |
| `completed_this_quarter` / `completed_prev_quarter` | int | by local `completed_at` date |
| `completed_by_week` | `[{ week_start, count }]` | every week in the quarter |
| `per_space` | `[{ space_id, open, completed_this_quarter }]` | one per input space id |

## Out of Scope (All Phases)
- A customisable or draggable widget layout: backlog
- Goals and OKR targets per quarter: backlog
- Time tracking: never planned

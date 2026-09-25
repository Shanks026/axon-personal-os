# Feature 08: Calendar and Events

**Product**: Axon, a personal second-brain OS
**File**: `.claude/features/08-calendar.md`
**Status**: 🟡 Phase 1 ✅, Phase 2 next
**Depends on**: 07
**Last Updated**: September 2026

---

## Context

Work on THMP is driven by meetings (stand-ups, grooming, demos) as much as by tasks, and today those live only in an external calendar. This feature adds **events** to each space and a custom calendar built on `date-fns` (no FullCalendar), so meetings, due tasks and due todos sit on one timeline. It follows the standard scope pattern (`useEvents({ spaceIds, from, to })`), keeps view and date in the URL like `useTaskFilters`, and reuses `SpacePickerField`, `DatePickerField`, `EntityLink` and the notes API for meeting notes.

---

## Phase Overview

```
Phase 1: Month, Agenda and events CRUD
  events table, calendar api + URL state + grid utils, CalendarPage with Month and Agenda views,
  EventDialog, and tasks/todos with a due date shown as all-day chips.

Phase 2: Week and Day time grid
  TimeGrid with now-line and overlap layout, click-drag to create, drag to move/resize events
  (15-min snap), drag task chips to reschedule in Month, optimistic updates.

Phase 3: Meeting notes
  "Create meeting note" from an event, events.note_id, note icon on chips, linked event in the note side panel.
```

**After each phase, stop and wait for approval.**

---

## Phase 1: Month, Agenda and Events CRUD ✅ Complete

### Goal
At `/s/:slug/calendar` the user sees a Month view (6-week grid) or an Agenda view (next 30 days, grouped by day), navigates with Today / previous / next, and switches views; the view and date live in the URL. They can create, edit and soft-delete events (with Undo), by clicking a day or the "New event" button. Tasks and todos with a due date appear as all-day chips, toggleable with a "Show tasks / todos" filter. In Global, events from every active space appear, coloured by space accent, and the create dialog requires a space.

### Design deltas and later decisions (✅ folded 2026-09-26)
These override anything below that disagrees with them.
- **No space picker** (the user's rule since 2026-09-25: an item's space is fixed at creation). `EventDialog` resolves the space with `useDefaultSpaceId(initialValues?.space_id ?? event?.space_id)`, as `TaskDialog` and `TodoDialog` do, and shows it as a read-only row (emoji + name). Every `SpacePickerField` mention below is void.
- **Colours come from `lib/tint.js`, never the space accent variable.** An event chip's dot uses `dotClasses(space.color)` (a space's `color` is one of the 10 `HUE_KEYS`, which `tint.js` covers). So in Global each space's events keep their own colour, and inside a space they share that space's colour. Due items use `textClasses(space.color)` on a hollow square.
- **Header** (G4: 48px breadcrumb header): the page follows the Tasks page layout. The title row shows the range title (`text-3xl`, "September 2026") with a mono subtitle ("Q2 FY 2026–27 · W13", plus "· Global" in Global; fiscal week from `getFiscalWeek`, D4). On the right: Today, ‹ ›, a `SegmentedControl` (Month / Week / Day / Agenda; Week and Day disabled until Phase 2), a `⋯` layers menu, and "New event". The breadcrumb header gets no actions.
- **Layers menu:** the "Show tasks / todos" toggles live in a small `⋯` `DropdownMenu` (checkbox items), not a "Show" button.
- **Legend:** a filled dot marks an event; a hollow square marks a due item (task or todo). A todo's square is its checkbox. Done todos strike through; done tasks keep full contrast (no strike-through, the 2026-09-25 rule) and fill their square with a check.
- **Month grid:** 6 rows (the design's 5 rows are wrong for 6-week months). Weekend cells get a faint tint (`bg-muted/40`; the design's `bg-sidebar` now equals the page background). Today's number is a filled destructive circle with white text.
- **EventDialog** follows the Overlays "event" design: a large title (`TitleTextarea`), then read-style icon rows (15px muted icons, 38px rows): clock (dates and times, with an All day switch on the right), map-pin (location), video (meeting link), align-left (description), square-check-big (linked task, "Link a task…" opens `TaskPickerDialog` from `features/links/components/`), then the space row. Footer: Delete (edit mode, `destructive`), a spacer, Cancel, Save with the `Kbd` hint. The shadcn default `DialogHeader` stays (the house rule), and the dialog uses `max-h-dialog` with a scrolling body. "Create meeting note" joins the footer in Phase 3.

### Before Starting: Confirm With Codebase
1. Feature 07 is complete. Confirm these exist and note their exact names: `fetchTasks`/`useTasks`/`useUpdateTask`/`taskKeys` (`features/tasks/api.js`), `fetchTodos`/`useTodos`/`useToggleTodo`/`todoKeys` (`features/todos/api.js`), `EntityLink`, `SpaceBadge`, `SpacePickerField`, `DatePickerField` (`components/shared/`), and a task picker combobox from 07's manual linking (if it lives in `features/tasks/components/`, import it from there; don't copy it).
2. `usePreferences()` returns `weekStartsOn` and `timezone`; `paths.space(slug).calendar(params)` exists and serialises `view`, `date` and `event`.
3. Check the current date-fns v4 time-zone support: `@date-fns/tz` (`TZDate`, the `in` context option). Install `@date-fns/tz` and record the new dependency in the changelog. All calendar maths runs in `profile.timezone`, not the browser's zone.
4. Check the current shadcn `popover`, `toggle-group` and `switch` APIs (installed in 01).
5. Use the Supabase MCP `list_tables` to confirm `public.events` does not exist yet.

### 1.1 Database
Migration `create_events`: the SQL from `data-model.md` **events**, with the trigger and policy written out:

```sql
create table public.events (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  space_id     uuid not null,
  title        text not null check (char_length(btrim(title)) between 1 and 200),
  description  text check (char_length(description) <= 5000),
  location     text,
  url          text,                                    -- meeting link
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  all_day      boolean not null default false,
  task_id      uuid,
  note_id      uuid,                                    -- meeting notes
  deleted_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (ends_at >= starts_at),
  unique (id, user_id),
  foreign key (space_id, user_id) references public.spaces(id, user_id) on delete cascade,
  foreign key (task_id, user_id) references public.tasks(id, user_id) on delete set null (task_id),
  foreign key (note_id, user_id) references public.notes(id, user_id) on delete set null (note_id)
);
create index events_range_idx on public.events (user_id, starts_at, ends_at) where deleted_at is null;
create index events_title_trgm on public.events using gin (title extensions.gin_trgm_ops);

create trigger events_updated_at before update on public.events
  for each row execute function public.set_updated_at();

alter table public.events enable row level security;
create policy "events_owner_all" on public.events for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
```

**All-day convention** (no schema change): an all-day event from day A to day B stores `starts_at` = 00:00 on A and `ends_at` = 23:59:59.999 on B, both in the profile time zone. The overlap query below then works for timed and all-day events alike.

Verify: an event with `ends_at < starts_at` is rejected; an event pointing at another user's `task_id` is rejected by the composite FK; hard-deleting a task nulls `events.task_id` and keeps `user_id`. Run advisors.

### 1.2 API Layer
`src/features/calendar/api.js`:

| Export | Details |
|---|---|
| `eventKeys` | `{ all: ['events'], lists: () => ['events','list'], list: (params) => ['events','list', params], detail: (id) => ['events','detail', id] }` with `params = { spaceIds, from, to }` |
| `fetchEvents({ spaceIds, from, to })` | select `EVENT_COLUMNS` (`id, space_id, title, location, url, starts_at, ends_at, all_day, task_id, note_id, updated_at`) `.in('space_id', spaceIds).is('deleted_at', null).lt('starts_at', to).gte('ends_at', from).order('starts_at')`. `from`/`to` are UTC ISO strings (half-open range). |
| `useEvents(params)` | `enabled: spaceIds?.length > 0 && !!from && !!to`, `placeholderData: keepPreviousData` so navigating months doesn't flash the skeleton |
| `fetchEvent(id)` / `useEvent(id)` | select `*`; used by `?event=<id>` deep links (`enabled: !!id`) |
| `createEvent(values)` / `useCreateEvent()` | insert + `.select().single()`; invalidates `eventKeys.all` |
| `updateEvent(id, patch)` / `useUpdateEvent()` | invalidates `eventKeys.lists()`, sets `eventKeys.detail(id)` |
| `softDeleteEvent(id)` / `useDeleteEvent()`, `restoreEvent(id)` / `useRestoreEvent()` | pattern §4; both invalidate `eventKeys.all`. `restoreEvent` and `useRestoreEvent` are exported for the Undo toast and for Trash (14). |

**Changes to other features' API (additive, default behaviour unchanged):**

| File | New params | Query |
|---|---|---|
| `features/tasks/api.js` `fetchTasks` | `dueFrom`, `dueTo` (`yyyy-MM-dd`, inclusive) | `if (dueFrom) q = q.gte('due_date', dueFrom); if (dueTo) q = q.lte('due_date', dueTo)` |
| `features/todos/api.js` `fetchTodos` | `dueFrom`, `dueTo` (same) | same, on `todos.due_date` |

Both params become part of the list key automatically, so existing invalidation on `taskKeys.all` / `todoKeys.all` covers the calendar.

### 1.3 Hooks and Utils

- **`features/calendar/hooks/useCalendarState.js`** returns `{ view, date, eventId, setView, setDate, goToday, goPrev, goNext, openEvent, closeEvent, range }`.
  - Parses `?view=month|week|day|agenda` (invalid or missing means `month`) and `?date=yyyy-MM-dd` (invalid or missing means today in the profile time zone). `?event=<id>` deep-links to an event:
    - Once `useEvent(id)` resolves, the hook sets `date` to the event's local start date (with `replace: true`) if that date isn't in the current range.
    - The page then opens the event's `EventPopover`, or `EventDialog` in edit mode when the chip isn't rendered.
    - Closing either removes `event` from the URL.
    - This is the target for search results (12), `EntityLink`s and dashboard rows.
  - Navigation uses `setSearchParams(..., { replace: false })` so the browser back button steps through months; view changes keep the date.
  - `range` = `getViewRange(view, date, { weekStartsOn, timeZone })` as UTC ISO `{ from, to }`.
- **`src/lib/dates.js` additions** (tests in `src/tests/lib/dates.test.js`): `todayISO(timeZone)`, `zonedDayRange(isoDate, timeZone)` returning `{ from, to }` UTC ISO for that local day, and `formatTimeRange(start, end, timeZone)` ("09:00–10:30"). Journal (09) and Dashboard (10) reuse them.
- **`features/calendar/utils.js`** (tests in `src/tests/features/calendar/utils.test.js`):
  - `buildMonthGrid(date, weekStartsOn)` returns 42 `{ date, isoDate, inMonth, isToday }` cells starting on `weekStartsOn`. Tests: a month starting on the week-start day, February in leap and non-leap years, week start 0 vs 1, December → January.
  - `getViewRange(view, date, { weekStartsOn, timeZone })`: month is the whole 42-day grid, week is the week, day is the day, agenda is `date` + 30 days.
  - `formatRangeTitle(view, date, weekStartsOn)`: "September 2026", "21 – 27 Sep 2026", "28 Sep – 4 Oct 2026", "Wed 23 Sep 2026", "From 23 Sep 2026".
  - `groupItemsByDay(items, isoDays, timeZone)` returns a `Map<isoDate, item[]>`. Multi-day events appear on every day they touch, with `isStart`/`isEnd` flags. Order: all-day events, then timed events by start, then tasks, then todos.
  - `toEventTimestamps({ all_day, start_date, end_date, start_time, end_time }, timeZone)` and the reverse `fromEvent(event, timeZone)` for the edit form. Tests cover DST boundaries in `Europe/London` and a non-DST zone (`Asia/Kolkata`).
- **`features/calendar/constants.js`**: `CALENDAR_VIEWS`, `MAX_CHIPS_PER_DAY = 3`, `DEFAULT_EVENT_MINUTES = 60`, `AGENDA_DAYS = 30`.
- **`features/calendar/schemas.js`**: `eventSchema`: title 1–200, `all_day`, `start_date`, `end_date`, `start_time`/`end_time` (`HH:mm`, required unless all-day), `location` ≤ 200, `url` (optional valid URL), `description` ≤ 5000, `space_id` uuid, `task_id` uuid or null. `.refine` checks that the end is on or after the start.

### 1.4 Components

```
src/features/calendar/
├── api.js
├── constants.js
├── schemas.js
├── utils.js
├── hooks/useCalendarState.js
├── hooks/useCalendarLayers.js       # { showTasks, showTodos, toggle } via useLocalStorage('axon:calendar:layers')
├── hooks/useCalendarItems.js        # merges useEvents + useTasks({dueFrom,dueTo}) + useTodos({dueFrom,dueTo}) → typed items
├── components/
│   ├── CalendarToolbar.jsx
│   ├── MonthView.jsx
│   ├── MonthDayCell.jsx
│   ├── CalendarChip.jsx             # one chip for event | task | todo
│   ├── MoreItemsPopover.jsx
│   ├── AgendaView.jsx
│   ├── EventPopover.jsx
│   └── EventDialog.jsx
└── pages/CalendarPage.jsx           # /s/:slug/calendar
```

- **`CalendarPage`**: calls `usePageHeader({ title: 'Calendar', actions: <Button>New event</Button> })`, reads `useCalendarState`, renders `CalendarToolbar` and the active view inside `<AnimatePresence mode="wait">` keyed by `view`. It owns `EventDialog` state (`{ open, event?, initialValues? }`).
- **`useCalendarItems({ spaceIds, range, layers })`** returns `{ items, isLoading, error, refetch }`. Items are `{ kind: 'event'|'task'|'todo', id, space_id, title, start, end, allDay, raw }`. Tasks exclude `cancelled`, and done tasks are flagged `done`. Task and todo queries are `enabled` only when their layer is on.
- **`CalendarToolbar`** `({ view, title, onToday, onPrev, onNext, onViewChange, layers, onToggleLayer })`: Today button, icon buttons for previous/next (aria-labels plus tooltips), title, a `ToggleGroup` view switcher (Month / Week / Day / Agenda; Week and Day are disabled with a "Coming in Phase 2" tooltip until Phase 2), and a "Show" `DropdownMenu` with checkbox items for Tasks and Todos. Hotkeys (react-hotkeys-hook, page-scoped, disabled while a dialog is open): `t` today, `←`/`→` previous/next, `m`/`a` view.
- **`MonthView`** `({ date, items, weekStartsOn, onCreateAt, onOpenItem })`: a weekday header row (labels rotated per `weekStartsOn`) and a 6×7 grid from `buildMonthGrid`. Days outside the month are muted and today is highlighted.
- **`MonthDayCell`** `({ cell, items, onCreateAt, onOpenItem })`: the day number is a `<button>` that opens `EventDialog` for that date (09:00–10:00, not all-day). Shows up to `MAX_CHIPS_PER_DAY` chips, then a "+N more" button that opens `MoreItemsPopover` with the full list.
- **`CalendarChip`** `({ item, compact })`:
  - An event shows its time (unless all-day) and title. In Global it sets `data-space-color={space.color}` and uses the space accent (the key-to-token map comes from the design system; until then, a semantic token plus a `SpaceIcon` dot). Inside a space it uses the primary accent. Multi-day continuation chips show a left/right continuation affordance.
  - A task renders an `EntityLink`-styled chip with a task icon (done tasks struck through). Clicking navigates to the task detail.
  - A todo has an inline checkbox (`useToggleTodo`, optimistic) plus its title.
- **`EventPopover`** `({ event, open, onOpenChange, onEdit })`: title, formatted date/time range, `SpaceBadge` in Global, location, a "Join" link for `url` (opens in a new tab), the linked task as an `EntityLink`, and Edit / Delete buttons. Delete soft-deletes with `toast('Event moved to Trash', { action: Undo })`.
- **`AgendaView`** `({ items, onOpenItem, onCreate })`: days from `range` that have items, each with a sticky day header ("Today", "Tomorrow", "Fri 25 Sep") and rows showing time, title, `SpaceBadge` (Global) and location. Uses `AnimatedList`. Empty: `EmptyState` "Nothing in the next 30 days" with a "New event" action.
- **`EventDialog`** `({ open, onOpenChange, event, initialValues, onSuccess })`: create and edit.
  - `initialValues` is a partial form value merged over the defaults on create, for example `{ title, start_date, start_time }` from a clicked slot or an inbox item (13).
  - `onSuccess(row)` is called after the mutation succeeds, just before the dialog closes. Inbox uses it to mark the item processed.
  - It must be **mountable standalone**. It reads what it needs itself (`useSpace()`, `usePreferences()`) and never assumes `CalendarPage` is mounted, so that Feature 12's `GlobalDialogs` in `AppLayout` can open it anywhere via `?new=event`.
  - Form: RHF + `eventSchema`. Fields: title, an all-day `Switch`, start date and end date (`DatePickerField`), start and end time (`Input type="time" step={900}`, hidden when all-day; changing the start keeps the duration), location, url, description (`Textarea`), `SpacePickerField` (Global only), and "Linked task" (the 07 task picker, filtered to the chosen space). Submits via `toEventTimestamps`. `Ctrl/Cmd+Enter` submits. Edit mode has a Delete button in the footer.
- **States:**
  - Loading: a month-grid skeleton (42 cells with 1–2 bar placeholders), or agenda row skeletons.
  - Error: `ErrorState` above the grid with `refetch`. The grid chrome still renders.
  - Empty: Month always shows the grid; Agenda uses `EmptyState`.
- **Motion:**
  - Month navigation slides horizontally in the direction of travel. Add a `slideX(direction)` variant to `components/motion/presets.js` (placeholder values, `// TODO(design-system)`).
  - Views cross-fade on switch. Chips use `listItem` on enter and exit, and popovers use `scaleIn`.

### 1.5 Routes and Integration
- `router.jsx`: the `calendar` route's lazy placeholder is replaced by `features/calendar/pages/CalendarPage.jsx`.
- The sidebar Calendar item already exists (03). No change is needed.
- `?event=<id>`: when `useEvent(id)` resolves to an event in a space outside the current scope, redirect to that space's calendar with the same params (the canonical space rule from `routing.md`).

### 1.6 Impact on Existing Features
| Existing feature | Impact | Action |
|---|---|---|
| 04 Tasks `fetchTasks` | New `dueFrom`/`dueTo` params | Add them; extend the tasks api test if one exists |
| 05 Todos `fetchTodos` | New `dueFrom`/`dueTo` params | Add them |
| 01 `lib/dates.js` | New tz helpers | Add them with tests |
| 01 motion presets | New `slideX` variant | Add it (placeholder values) |
| 12 Command palette | `search_all` includes events; `GlobalDialogs` opens `EventDialog` via `?new=event` | Results navigate to `paths.calendar({ view: 'day', date, event: id })`; `EventDialog` stays standalone |
| 13 Inbox | "Process as event" | Opens `EventDialog` with `initialValues` and `onSuccess` |
| 14 Trash | Events are soft-deleted | Covered by `trash_items()`; restore calls `restoreEvent` |

### 1.7 Not in This Phase
- Week and Day time grids, drag and drop (Phase 2)
- Meeting notes (Phase 3)
- Spanning bars for multi-day events in Month (chips repeat per day instead)

### 1.8 Checklist: Before Marking Complete
- [x] The migration is applied and mirrored; advisors are clean; the constraint and FK checks above are verified
- [x] `buildMonthGrid`, `getViewRange`, `formatRangeTitle`, `groupItemsByDay`, `toEventTimestamps`/`fromEvent` and the new `lib/dates.js` helpers have passing tests (including leap years, week start 0/1 and DST)
- [x] `?view` and `?date` round-trip; invalid values fall back to Month and today (tested); back/forward steps through months (navigation pushes history; **confirm in the browser**)
- [x] An event spanning midnight or several days appears on every day it touches; one ending exactly at 00:00 next day does not spill over
- [x] Creating, editing and deleting (with Undo) an event works (tested); chips show space colours. There's no space picker (superseded, see the folded deltas)
- [x] `/s/<slug>/calendar?event=<id>` jumps to the event's date and opens it, even from a different month; closing removes the param
- [x] `EventDialog` renders and creates an event when mounted outside `CalendarPage` (verified with a component test that renders it inside providers only), honouring `initialValues` and calling `onSuccess(row)`
- [x] Tasks and todos with a due date appear as all-day chips; the layers menu hides them and persists (localStorage); toggling a todo chip uses the optimistic `useToggleTodo` (**confirm in the browser**)
- [x] With the profile time zone set differently from the browser, events render in the profile zone (unit and page tests use `Asia/Kolkata`)
- [x] "+N more" shows every item for the day; Agenda groups by day and shows its empty state
- [x] `npm run lint`, `npm test` and `npm run build` pass
- [x] `axon-rules` audit is clean for the changed files (one accepted should-fix: `EventDialog` length)
- [x] `00-index.md` DB registry, status and changelog (including the `@date-fns/tz` dependency) are updated

### 1.9 Implementation Notes (2026-09-26)
- **`EventPopover` dropped.** The design's event dialog (Overlays → event) is read-style, so it serves as the view and the editor. Clicking a chip sets `?event=<id>` and opens `EventDialog` in edit mode. This removes the popover anchoring problem for multi-day chips and chips hidden behind "+N more". The meeting link shows a **Join** button, and the linked task shows as an `EntityLink`.
- **No space picker** in `EventDialog` (the folded rule). Events use `useDefaultSpaceId`, and the space shows as a read-only row. The task picker is limited to that space (`TaskPickerDialog` gained optional `spaceIds` and `description` props).
- **Time zone:** new `lib/dates.js` helpers (`todayISO`, `zonedInstant`, `zonedDayRange`, `zonedParts`, `formatTime`, `formatTimeRange`, `formatWeekdayDate`) run on `@date-fns/tz`'s `TZDate`. Grid maths runs on plain `yyyy-MM-dd` strings. `toDate` now also accepts epoch milliseconds.
- **API:** the list select includes `description` (up to 5000 characters), so the dialog opens without a second fetch. `useEvent(id)` exists for deep links, and `fetchEvent` filters out trashed rows (a trashed link just closes). The delete is optimistic, and the Undo toast shows at once: the dialog unmounts on close, so per-call `mutate` callbacks would never fire. A test caught this. `useTasks` and `useTodos` take a second `{ enabled }` argument. With `dueFrom`/`dueTo`, `fetchTodos` skips its done window, so done todos stay on their due day.
- **Migration extras:** length checks on `location` (200) and `url` (2000), plus indexes on `space_id`, `task_id` and `note_id`. `data-model.md` is updated to match.
- **UI:** hotkeys `t`, `←`, `→`, `m`, `a`, and `n` for a new event (not in the plan). `SegmentedControl` options take `disabled` and `hint`, so Week and Day show as "Coming soon". `Kbd` renders `left`/`right` as arrow icons. A new `slideX(direction)` preset is enter-only. Views cross-fade with `fadeIn`. `formatAgendaDay` also says "Yesterday".
- **Browser checks still to do:** back/forward through months, the todo-chip toggle, dark mode, and the dialog's native time inputs.

**Stop here. Show the result and wait for approval.**

---

## Phase 2: Week and Day Time Grid

### Goal
Week and Day views show a scrollable 24-hour grid (opening scrolled to 08:00) with an all-day row, a live now-line, and overlapping events laid out side by side. The user click-drags an empty slot to create an event, drags an event to move it (15-minute snap, across days in Week), and drags its bottom edge to resize. In Month view, task chips can be dragged to another day to reschedule `due_date`. Every move is optimistic, and rolls back on error.

### Before Starting: Confirm Phase 1 Is Approved
1. Phase 1 is `✅ Complete`.
2. Check the current `@dnd-kit/core` APIs: `useDraggable`, `useDroppable`, `DragOverlay`, sensors and `activationConstraint`, and the modifier function signature (a local snap modifier is used, so `@dnd-kit/modifiers` is not needed).
3. Confirm whether 04's `useUpdateTask` is optimistic for arbitrary patches. If not, add an `onMutate` per pattern §3 there (it benefits the board too).

### 2.1 Database
No database changes in this phase.

### 2.2 API and Utils
- `useUpdateEvent()` gains an optimistic `onMutate`: snapshot `eventKeys.lists()`, patch the event in every cached range, roll back `onError`, and invalidate `onSettled` (pattern §3).
- `utils.js` additions (tested):
  - `layoutDayEvents(events, { dayStart, dayEnd, minMinutes = 15 })` returns `[{ id, top, height, left, width }]` as percentages. The algorithm: clip each event to the day, then sort by start (longer first on ties). Group events into clusters of transitively overlapping events. In each cluster, assign every event the first column whose last end is at or before its start. Width = 1 / the cluster's column count; left = column × width. Each event expands right into free adjacent columns. Tests: no overlap, two overlapping, a chain A–B–C where A and C don't overlap (3 events, 2 columns), a nested event, identical times, and an event crossing midnight.
  - `minutesFromOffset(y, pxPerHour, snap = 15)` and `snapModifier(stepPx)` (a dnd-kit modifier rounding `transform.y`).
  - `applyMove(event, { dayDelta, minuteDelta })` and `applyResize(event, minuteDelta)`, which keep a minimum 15-minute duration and preserve duration on moves.
- `src/hooks/useNow.js`: `useNow(intervalMs = 60_000)` returns a `Date`. The interval is aligned to the next minute and cleared on unmount. Shared, because Dashboard reuses it.

### 2.3 Components

```
src/features/calendar/components/
├── TimeGrid.jsx            # shared by Week (7 cols) and Day (1 col)
├── TimeGridAllDayRow.jsx   # all-day events + task/todo chips per column
├── TimeGridColumn.jsx      # droppable day column, slot selection, positioned events
├── TimeGridEvent.jsx       # draggable block + resize handle
├── NowLine.jsx
├── WeekView.jsx
└── DayView.jsx
src/features/calendar/hooks/useSlotSelection.js
```

- **`TimeGrid`** `({ days, items, timeZone, onCreateRange, onOpenItem, onMoveEvent, onResizeEvent })`:
  - A sticky header of day labels, the `TimeGridAllDayRow`, and a scroll area containing an hour gutter (00:00–23:00) plus one `TimeGridColumn` per day.
  - The hour height is `HOUR_HEIGHT` in `constants.js` (a placeholder until the design system). Event positions use inline `style={{ top, height, left, width }}` percentages. This is computed geometry, not arbitrary Tailwind values.
  - On mount only, it scrolls to 08:00 (or to the now-line if it is later than 18:00 on today).
  - It wraps the columns in one `DndContext`: `PointerSensor` with `activationConstraint: { distance: 4 }` so a click still opens the popover, the `snapModifier`, and `DragOverlay` for the moving block.
- **`TimeGridColumn`** `({ day, events, ...handlers })`: `useDroppable({ id: 'day:<iso>' })`. Renders the blocks from `layoutDayEvents`, and the selection ghost from `useSlotSelection`.
- **`useSlotSelection({ pxPerHour, onSelect })`**: pointer down on empty space captures the pointer, snaps the start to 15 minutes, and tracks the end while moving. Pointer up calls `onSelect({ start, end })`; a plain click gives `DEFAULT_EVENT_MINUTES`. `Esc` cancels. It returns `{ ghost, handlers }`. Listeners are removed on cleanup.
- **`TimeGridEvent`** `({ event, layout, onOpen })`: `useDraggable({ id: 'event:<id>' })` on the body, and a separate `useDraggable({ id: 'resize:<id>' })` on a bottom handle (with `aria-label="Resize event"`). Short events (under 30 minutes) show the title only. A note icon slot is reserved for Phase 3.
- **Drag end:** a move computes `dayDelta` from the `over` column and `minuteDelta` from the snapped `delta.y`, then calls `useUpdateEvent` with `applyMove`. A resize calls `applyResize`. All-day events are not draggable in the grid in this phase.
- **`NowLine`** `({ now, day, timeZone })`: renders only in today's column, positioned by the minute from `useNow()`.
- **`WeekView` / `DayView`**: build `days` from `range` and render `TimeGrid`. The toolbar enables Week and Day, with hotkeys `w`/`d`.
- **Month drag to reschedule:** `MonthView` gains a `DndContext`. Task chips become draggable (`task:<id>`) and each `MonthDayCell` is droppable. A drop calls `useUpdateTask` with `{ due_date: iso }`. If the task's `start_date` would end up after the new due date, `start_date` shifts by the same number of days, which satisfies the `start_date <= due_date` check. Timed and all-day events in Month can be dragged to another day too (keeping their times, via `applyMove` with `minuteDelta = 0`).
- **Keyboard alternative:** moving and resizing are also possible through `EventDialog`, so drag is never the only way.
- **Motion:** the drag overlay uses `springSnappy`, a dropped block animates to its new slot with `layout`, and the now-line fades in. Positions animate through `transform` only.

### 2.4 Routes and Integration
None beyond enabling `view=week|day` (already parsed in Phase 1).

### 2.5 Impact on Existing Features
| Existing feature | Impact | Action |
|---|---|---|
| 04 Tasks `useUpdateTask` | Used for due-date drags | Make it optimistic if it isn't already |
| Shared hooks | New `useNow` | Record it in the changelog and in `axon-data-patterns.md` §10 if it grows beyond one feature |

### 2.6 Not in This Phase
- Dragging todo chips (reschedule them through the todo row)
- Dragging all-day events within the time grid's all-day row
- Touch-optimised drag (Feature 20)

### 2.7 Checklist: Before Marking Complete
- [ ] `layoutDayEvents`, `applyMove`, `applyResize` and `minutesFromOffset` tests pass, including the A–B–C chain and midnight crossing
- [ ] Week and Day open scrolled to 08:00; the now-line moves every minute and appears only on today
- [ ] Overlapping events render side by side without covering each other
- [ ] Click-drag on an empty slot opens `EventDialog` prefilled with the snapped range; `Esc` cancels the ghost
- [ ] Dragging an event moves it in 15-minute steps (across days in Week); resizing enforces 15 minutes minimum; both persist after reload
- [ ] Killing the network mid-drag rolls the event back and shows an error toast
- [ ] Dragging a task chip in Month updates `due_date` (and shifts `start_date` when needed); the task list reflects it without a reload
- [ ] A click on an event still opens the popover (no accidental drags)
- [ ] `npm run lint`, `npm test` and `npm run build` pass
- [ ] `axon-rules` audit is clean for the changed files
- [ ] `00-index.md` status and changelog are updated

**Stop here. Show the result and wait for approval.**

---

## Phase 3: Meeting Notes

### Goal
From an event, the user clicks "Create meeting note". Axon creates a note in the event's space, titled "<event title> — 23 Sep 2026", prefilled with a meeting template, links it to the event (`events.note_id`) and opens it. If the event has a linked task, the note is linked to that task too. Event chips and blocks show a note icon. The note's side panel shows the linked event with a link back to the calendar.

### Before Starting: Confirm Phase 2 Is Approved
1. Phase 2 is `✅ Complete`.
2. Confirm the notes API exports from 06/07: `createNote(values)`, `useNote(id)`, `noteKeys`, the manual link function (for example `linkNoteToTask({ noteId, taskId })`) and `linkKeys`. Confirm where the note detail side panel lives (07), because this phase adds a card to it.
3. Confirm the heading levels and node names the shared `RichTextEditor` schema accepts, so the template JSON is valid.

### 3.1 Database
No database changes. `events.note_id` already exists.

### 3.2 API and Utils
- `utils.js`: `buildMeetingNote(event, timeZone)` returns `{ title, content, content_text }`.
  - `title` is `"${event.title} — ${formatDate(start)}"`.
  - `content` is Tiptap JSON: a paragraph with the time range, location and meeting link, then H2 headings "Agenda", "Notes" and "Action items", each followed by an empty paragraph or bullet list.
  - `content_text` is the matching plain text.
  - Tested (valid node types, title format).
- `api.js`:
  - `useCreateMeetingNote()`: its `mutationFn(event)` runs `createNote({ space_id: event.space_id, ...buildMeetingNote(event, tz) })`, then `updateEvent(event.id, { note_id: note.id })`, then, if `event.task_id` is set, the manual link. It returns the note. It invalidates `eventKeys.all`, `noteKeys.all` and `linkKeys.all`.
  - `fetchEventForNote(noteId)` / `useEventForNote(noteId)`: `.eq('note_id', noteId).is('deleted_at', null).order('starts_at').limit(1).maybeSingle()`. The key is `eventKeys.forNote(noteId)`; add `forNote: (id) => ['events','forNote', id]` to the factory.

### 3.3 Components
- **`EventPopover` / `EventDialog`:** if `note_id` is null, or `useNote(note_id)` returns a soft-deleted or missing note, show a "Create meeting note" button (pending state while running, then `navigate(p.note(note.id))`). Otherwise show "Open meeting note" as an `EntityLink`.
- **`CalendarChip` / `TimeGridEvent`:** show a lucide `NotebookPen` icon when `note_id` is set (with an `aria-label` of "Has meeting note").
- **`features/calendar/components/LinkedEventCard.jsx`** `({ noteId })`: uses `useEventForNote`. Renders nothing when there is no event (with no skeleton flash: while loading it renders nothing). Shows the title, date and time range, location, and "Open in calendar" linking to `paths.calendar({ view: 'day', date, event: id })`.

### 3.4 Routes and Integration
- The note detail side panel (07) renders `<LinkedEventCard noteId={note.id} />` above linked tasks. Import it from `features/calendar/components/` (a cross-feature component import is allowed; pages are not).

### 3.5 Impact on Existing Features
| Existing feature | Impact | Action |
|---|---|---|
| 06/07 Notes detail | New side-panel card | Add `LinkedEventCard` |
| 07 Note ↔ task links | Meeting notes auto-link to the event's task | Use the existing manual-link function |

### 3.6 Not in This Phase
- Multiple notes per event
- Converting a note back into an event

### 3.7 Checklist: Before Marking Complete
- [ ] "Create meeting note" creates a note in the event's space with the template, sets `events.note_id` and navigates to the note
- [ ] A note created from an event with a linked task shows that task under linked tasks, with source manual
- [ ] Chips and time-grid blocks show the note icon; the popover shows "Open meeting note"
- [ ] Trashing the note brings back "Create meeting note"; restoring it brings back "Open"
- [ ] The note side panel shows the linked event and its link opens the calendar on that day with the event open
- [ ] `buildMeetingNote` tests pass
- [ ] `npm run lint`, `npm test` and `npm run build` pass
- [ ] `axon-rules` audit is clean for the changed files
- [ ] `00-index.md` status and changelog are updated

**Stop here. Show the result and wait for approval.**

---

## Data Model Summary (after all phases)

```
spaces 1 ── n events (starts_at/ends_at timestamptz, all_day)
events.task_id ──► tasks.id (on delete set null (task_id))
events.note_id ──► notes.id (on delete set null (note_id))  meeting note
```

### `events`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK; `unique(id, user_id)` |
| `space_id` | uuid | composite FK to spaces |
| `title` | text | 1–200 |
| `description` | text | ≤ 5000, plain text |
| `location` / `url` | text | url = meeting link |
| `starts_at` / `ends_at` | timestamptz | `ends_at >= starts_at`; all-day = 00:00 → 23:59:59.999 local |
| `all_day` | boolean | default false |
| `task_id` / `note_id` | uuid | optional links, set null on delete |
| `deleted_at` | timestamptz | soft delete |

## Out of Scope (All Phases)
- Recurring events and reminders: Feature 16
- Google / Outlook sync and ICS import/export: backlog
- Viewing in a time zone other than `profile.timezone`: backlog
- Event attendees and invitations: never (single-user)

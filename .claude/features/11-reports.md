# Feature 11: Quarterly Reports (Fiscal Year)

**Product**: Axon, a personal second-brain OS
**File**: `.claude/features/11-reports.md`
**Status**: 🔵 Planned
**Depends on**: 10
**Last Updated**: September 2026

---

## Context

The main reason Axon exists is to answer "what did I deliver on THMP this quarter?" without reconstructing it from memory, Git and Jira. A report is an editable document for a fiscal period (a quarter by default, a month or a custom range), generated from the space's data:
- A **stats snapshot** from `report_stats()`.
- A **drafted Tiptap document** listing highlights (completed tasks grouped by tag, as task mentions), work in progress, blocked or carried-over work, and key notes.

The user edits the draft, marks it Final, and exports it as PDF or Markdown. Reports follow the standard `api.js` and soft-delete patterns. They are the one entity (besides inbox items) whose `space_id` may be `NULL`, meaning a Global report across all spaces.

---

## Phase Overview

```
Phase 1: Reports list and generation
  reports table + report_stats() RPC, reports api, buildReportDocument() with tests,
  ReportsPage grouped by fiscal year with quarter cards, GenerateReportDialog with a live stats preview.

Phase 2: Report view and editor
  ReportPage with stat tiles, charts from the snapshot, RichTextEditor autosave, Draft/Final status,
  "Refresh numbers" with a diff toast.

Phase 3: Export
  Print layout and "Export PDF", "Export Markdown" (.md download), "Copy to clipboard".
```

**After each phase, stop and wait for approval.**

---

## Phase 1: Reports List and Generation

### Goal
At `/s/:slug/reports` the user sees fiscal years (newest first), each with Q1–Q4 cards. A quarter with a report shows its status and key numbers. A past or current quarter without one shows "Generate". "New report" (or a card's Generate button) opens a dialog to pick the scope and period, preview the numbers, and create the report. Creation stores the stats snapshot and a drafted document. Reports can be soft-deleted with Undo. The report page itself is a minimal read-only preview until Phase 2.

### Before Starting: Confirm With Codebase
1. Feature 10 Phase 2 is complete: `public.week_start_of(date, int)` exists (MCP `execute_sql`: `select public.week_start_of('2026-09-23', 1)` returns `2026-09-21`).
2. `lib/fiscal.js` exports `getFiscalQuarter`, `getQuarterRange`, `formatQuarter`, `formatFiscalYear` and `listQuarters`.
3. Confirm the task API: `fetchTasks` supports `status`, `completedFrom`/`completedTo` (09) and `dueTo` (08), and returns tags (for example the embed `task_tags(tags(id, name, color))`). If tags aren't in the list select, add a `withTags` param rather than a second query.
4. Confirm the Tiptap helpers in use: `generateText(json, extensions)` from `@tiptap/core`, and whether `components/editor/` exports its extension list (for example `getExtensions(features)`). If it doesn't, export it; this is a minimal change, recorded in the changelog.
5. Confirm the `taskMention` node's attrs (`{ id, label }`) in the shared editor.

### 1.1 Database
Migration `create_reports_and_report_stats`:

```sql
create table public.reports (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  space_id        uuid,                                 -- NULL = Global report (all spaces)
  title           text not null check (char_length(btrim(title)) between 1 and 200),
  period_kind     text not null default 'quarter' check (period_kind in ('quarter','month','custom')),
  period_start    date not null,
  period_end      date not null,
  fiscal_year     smallint,                             -- FY start year: FY 2026-27 → 2026
  fiscal_quarter  smallint check (fiscal_quarter between 1 and 4),
  content         jsonb,
  content_text    text not null default '',
  stats           jsonb not null default '{}'::jsonb,   -- snapshot from report_stats()
  stats_refreshed_at timestamptz,
  status          text not null default 'draft' check (status in ('draft','final')),
  pinned_at       timestamptz,
  deleted_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  search          tsvector generated always as (
                    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
                    setweight(to_tsvector('english', coalesce(content_text, '')), 'B')
                  ) stored,
  check (period_end >= period_start),
  unique (id, user_id),
  foreign key (space_id, user_id) references public.spaces(id, user_id) on delete cascade
);
create index reports_period_idx on public.reports (user_id, period_start desc) where deleted_at is null;
create index reports_search_idx on public.reports using gin (search);

create trigger reports_updated_at before update on public.reports
  for each row execute function public.set_updated_at();

alter table public.reports enable row level security;
create policy "reports_owner_all" on public.reports for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create or replace function public.report_stats(p_space_ids uuid[], p_start date, p_end date)
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
  bounds as (
    select prefs.tz, prefs.ws,
           (p_start::timestamp at time zone prefs.tz)       as start_ts,
           ((p_end + 1)::timestamp at time zone prefs.tz)   as end_ts
    from prefs
  ),
  t as (
    select tk.id, tk.space_id, tk.status, tk.priority, tk.due_date, tk.created_at,
           (tk.completed_at at time zone b.tz)::date as completed_on,
           (tk.created_at   at time zone b.tz)::date as created_on
    from public.tasks tk
    cross join bounds b
    where tk.space_id = any (p_space_ids)
      and tk.deleted_at is null
  ),
  done as (
    select t.*, public.week_start_of(t.completed_on, b.ws) as wk
    from t cross join bounds b
    where t.status = 'done' and t.completed_on between p_start and p_end
  ),
  at_end as (                                    -- status as it was at the end of the period
    select t.id, t.due_date, coalesce(ls.to_value, t.status) as status_at_end
    from t
    cross join bounds b
    left join lateral (
      select a.to_value
      from public.task_activity a
      where a.task_id = t.id
        and a.kind in ('created', 'status')
        and a.created_at < b.end_ts
      order by a.created_at desc
      limit 1
    ) ls on true
    where t.created_at < b.end_ts
  ),
  weeks as (
    select gs::date as week_start
    from bounds b,
         generate_series(public.week_start_of(p_start, b.ws)::timestamp,
                         p_end::timestamp, interval '7 days') as gs
  )
  select jsonb_build_object(
    'tasks', jsonb_build_object(
      'completed',          (select count(*) from done),
      'created',            (select count(*) from t where created_on between p_start and p_end),
      'in_progress_at_end', (select count(*) from at_end where status_at_end in ('in_progress', 'in_review')),
      'blocked_at_end',     (select count(*) from at_end where status_at_end = 'blocked'),
      'overdue_at_end',     (select count(*) from at_end
                              where status_at_end not in ('done', 'cancelled') and due_date <= p_end),
      'completed_by_priority', (
        select jsonb_build_object(
          'urgent', count(*) filter (where priority = 'urgent'),
          'high',   count(*) filter (where priority = 'high'),
          'medium', count(*) filter (where priority = 'medium'),
          'low',    count(*) filter (where priority = 'low'),
          'none',   count(*) filter (where priority = 'none'))
        from done
      ),
      'completed_by_tag', (
        select coalesce(jsonb_agg(jsonb_build_object('tag_id', x.tag_id, 'name', x.name, 'count', x.n)
                                  order by x.n desc, x.name), '[]'::jsonb)
        from (
          select tg.id as tag_id, tg.name, count(*) as n
          from done d
          join public.task_tags tt on tt.task_id = d.id
          join public.tags tg on tg.id = tt.tag_id
          group by tg.id, tg.name
        ) x
      ),
      'completed_by_week', (
        select coalesce(jsonb_agg(jsonb_build_object(
                 'week_start', w.week_start,
                 'count', (select count(*) from done d where d.wk = w.week_start))
               order by w.week_start), '[]'::jsonb)
        from weeks w
      ),
      'completed_by_space', (
        select coalesce(jsonb_agg(jsonb_build_object(
                 'space_id', s.id,
                 'count', (select count(*) from done d where d.space_id = s.id))), '[]'::jsonb)
        from unnest(p_space_ids) as s(id)
      )
    ),
    'todos', jsonb_build_object(
      'completed', (select count(*) from public.todos td cross join bounds b
                     where td.space_id = any (p_space_ids) and td.deleted_at is null
                       and td.is_done and td.done_at >= b.start_ts and td.done_at < b.end_ts)
    ),
    'notes', jsonb_build_object(
      'created',         (select count(*) from public.notes n cross join bounds b
                           where n.space_id = any (p_space_ids) and n.deleted_at is null and n.kind = 'note'
                             and n.created_at >= b.start_ts and n.created_at < b.end_ts),
      'journal_entries', (select count(*) from public.notes n
                           where n.space_id = any (p_space_ids) and n.deleted_at is null and n.kind = 'journal'
                             and n.journal_date between p_start and p_end)
    ),
    'events', jsonb_build_object(
      'count', (select count(*) from public.events e cross join bounds b
                 where e.space_id = any (p_space_ids) and e.deleted_at is null
                   and e.starts_at < b.end_ts and e.ends_at >= b.start_ts)
    )
  );
$$;

revoke execute on function public.report_stats(uuid[], date, date) from public, anon;
grant execute on function public.report_stats(uuid[], date, date) to authenticated;
```

Semantics, which should be stated in the report UI's info tooltip:
- "At end" statuses are reconstructed from `task_activity` (the last `created` or `status` row before the period end). `overdue_at_end` uses the task's **current** `due_date`, because due-date history isn't replayed.
- Trashed tasks are excluded.

Verify against a seeded quarter with `execute_sql`:
- A task completed at 23:30 local on the last day is counted.
- A task moved to done after the period is counted as in progress at the end.
- A foreign space id yields zeros.

Run advisors.

### 1.2 API Layer
`src/features/reports/api.js`:

| Export | Details |
|---|---|
| `reportKeys` | `{ all: ['reports'], lists: () => ['reports','list'], list: (p) => ['reports','list', p], detail: (id) => ['reports','detail', id], stats: (p) => ['reports','stats', p] }` |
| `fetchReports({ spaceIds, includeGlobal })` / `useReports({ scope })` | `scope = { spaceIds: scopeSpaceIds, includeGlobal: isGlobal }`. The select is `REPORT_COLUMNS` (`id, space_id, title, period_kind, period_start, period_end, fiscal_year, fiscal_quarter, status, stats, pinned_at, updated_at`) with `deleted_at is null`, ordered by `period_start desc`. The filter is `.in('space_id', spaceIds)` in a space, and `.or('space_id.is.null,space_id.in.(' + ids + ')')` in Global. |
| `fetchReport(id)` / `useReport(id)` | select `*`; `enabled: !!id` |
| `fetchReportStats({ spaceIds, start, end })` / `useReportStats(p)` | `supabase.rpc('report_stats', { p_space_ids, p_start, p_end })`; `enabled` when all three are set; used by the dialog preview |
| `createReport(values)` / `useCreateReport()` | insert + `.select().single()`; invalidates `reportKeys.lists()` |
| `generateReport({ spaceId, spaceIds, period, title, noteHref })` / `useGenerateReport()` | Orchestrates the data in parallel: `fetchReportStats`; completed tasks (`fetchTasks({ spaceIds, status: ['done'], completedFrom, completedTo, withTags: true })`); in progress (`status: ['in_progress','in_review']`); blocked or carried over (`status: ['blocked']` plus open tasks with `dueTo: period.end`, de-duplicated); `fetchKeyNotes`. It then runs `buildReportDocument`, derives `content_text` with `generateText`, and calls `createReport` with `{ space_id: spaceId ?? null, title, period_kind, period_start, period_end, fiscal_year, fiscal_quarter, content, content_text, stats, stats_refreshed_at: now }`. |
| `updateReport(id, patch)` / `useUpdateReport()` | sets `reportKeys.detail(id)`, invalidates lists |
| `refreshReportStats(report, spaceIds)` / `useRefreshReportStats()` | re-runs the RPC, then `updateReport(id, { stats, stats_refreshed_at })` only. It **never** touches `content`. Returns `{ row, previous }` for the diff toast. |
| `softDeleteReport(id)` / `useDeleteReport()`, `restoreReport(id)` / `useRestoreReport()` | pattern §4; both invalidate `reportKeys.all`. The restore pair is exported for the Undo toast and for Trash (14). |

The scope's `spaceIds` for the RPC are `[space.id]` for a space report and every active space id for a Global report.

**Notes API addition (`features/notes/api.js`):** `fetchKeyNotes({ spaceIds, from, to, limit = 8 })` selects `id, space_id, title, pinned_at, updated_at, note_task_links(count)` with `kind = 'note'`, `deleted_at is null`, and `updated_at` within the period, capped at 50. It sorts on the client: pinned first, then link count descending, then `updated_at`; it then takes `limit`.

**`src/features/reports/utils.js`** (tests in `src/tests/features/reports/utils.test.js`):
- `defaultReportPeriod(todayISO, fyStartMonth)`: the previous quarter when today is within the first 14 days of a quarter, otherwise the current one. It returns `{ kind: 'quarter', fiscalYear, quarter, start, end }`. Tests cover 1 Apr, 14 Apr, 15 Apr (April start), 1 Jan with January start, and the FY rollover.
- `buildReportTitle(period, scopeName, fyStartMonth)`: "Q2 FY 2026–27 — THMP", "September 2026 — Global", "1 Jul – 15 Aug 2026 — THMP".
- `reportQuarterGrid(reports, { from, to, fyStartMonth, spaceId })` turns `listQuarters` into `[{ fiscalYear, label, quarters: [{ quarter, range, state: 'future' | 'current' | 'past', report?, otherReports[] }] }]`, newest FY first. `report` is the scope-matching quarter report: `space_id === spaceId`, or `null` in Global. `otherReports` holds space-level reports shown in Global. Month and custom reports go into a per-FY `extras` list.

**`src/features/reports/utils/buildReportDocument.js`**: a pure function (tests in `src/tests/features/reports/buildReportDocument.test.js`).

```js
buildReportDocument({
  periodLabel,                 // 'Q2 FY 2026–27'
  stats,                       // report_stats() result
  completedTasks,              // [{ id, title, tags: [{ id, name }] }]
  inProgressTasks,             // [{ id, title, status }]
  blockedTasks,                // [{ id, title, status, due_date }]
  keyNotes,                    // [{ id, title }]
  journalCount,                // stats.notes.journal_entries
  noteHref,                    // (note) => string, keeps the function free of routing
}) → TiptapDoc
```

- **Summary** (H2): a placeholder paragraph ("Write a 2–3 sentence summary of the period.") and a stats sentence ("42 tasks completed, 6 in progress, 2 blocked · 38 journal entries").
- **Highlights** (H2): one H3 per tag (ordered by count), then "Untagged" last. Each has a `bulletList` of `listItem > paragraph > taskMention { id, label }`. A task with several tags appears under its first tag only, in `completed_by_tag` order.
- **In progress** (H2): a mention bullet list.
- **Blocked / carried over** (H2): a mention bullet list with " — blocked" or " — due 12 Sep" text after the mention.
- **Key notes** (H2): bullet items with a `link` mark (`href: noteHref(note)`) on the note title.
- **Next quarter focus** (H2): a placeholder paragraph.
- An empty section gets an italic "Nothing this period." paragraph instead of an empty list.

Tests cover the section order, tag grouping and de-duplication, the Untagged bucket, empty sections, and that every node type exists in the editor schema (validated with `getSchema(extensions).nodeFromJSON`).

### 1.3 Components

```
src/features/reports/
├── api.js
├── constants.js                   # REPORT_STATUSES, PERIOD_KINDS, GENERATE_GRACE_DAYS = 14
├── schemas.js                     # generateReportSchema (scope, kind, fy/quarter | month | start/end, title)
├── utils.js
├── utils/buildReportDocument.js
├── components/
│   ├── FiscalYearSection.jsx
│   ├── QuarterCard.jsx
│   ├── ReportRow.jsx              # month/custom + Global "other" reports
│   ├── ReportStatusBadge.jsx
│   ├── PeriodPicker.jsx
│   ├── StatsPreview.jsx
│   └── GenerateReportDialog.jsx
└── pages/
    ├── ReportsPage.jsx            # /s/:slug/reports
    └── ReportPage.jsx             # /s/:slug/reports/:reportId (read-only preview in Phase 1)
```

- **`ReportsPage`**: `usePageHeader({ title: 'Reports', actions: <Button>New report</Button> })`. It computes the grid from `reportQuarterGrid`. The range runs from the earliest `created_at` of the scope's space (in Global, the earliest active space) to today. Renders one `FiscalYearSection` per FY.
- **`FiscalYearSection`** `({ label, quarters, extras })`: an H2 of `formatFiscalYear`, a 4-column grid of `QuarterCard`s (2 columns on mobile), and `ReportRow`s for the extras.
- **`QuarterCard`** `({ quarter, onGenerate })`:
  - The label "Q2" with its range ("Jul – Sep 2026").
  - With a report: `ReportStatusBadge`, "42 completed · 6 in progress" from `stats.tasks`, and `updated_at`. The whole card links to the report.
  - Without one, past or current: a "Generate" button that opens the dialog prefilled with this quarter.
  - Future: muted, with no action.
  - The current quarter gets a "Current" marker.
  - In Global, `otherReports` render as small `SpaceBadge` links under the main content.
- **`GenerateReportDialog`** `({ open, onOpenChange, initialPeriod })`: RHF + `generateReportSchema`.
  - **Scope** (a radio group): "This space (<name>)" or "Global (all spaces)". The default is the current space in a space and Global in Global. From Global the user may also pick a specific space (`SpacePickerField`); a Global report stores `space_id` null.
  - **Period** (`PeriodPicker`, tabs):
    - Quarter: a Select of FY and quarter, defaulting to `defaultReportPeriod`.
    - Month: a month Select.
    - Custom: two `DatePickerField`s.
  - **Title**: auto-filled by `buildReportTitle` and following the scope and period until the user edits it.
  - **Preview**: `StatsPreview` shows `useReportStats` numbers for the chosen scope and period (completed, created, in progress at end, blocked at end, todos completed, journal entries, events). It has a skeleton while loading, and a warning when a report already exists for the same scope and quarter ("A report for this quarter exists — open it" links to it; creating another is still allowed).
  - **Submit**: `useGenerateReport`; the button reads "Generating…". On success it closes and navigates to the new report.
- **`ReportPage` (Phase 1)**: the title, period, status badge, and `RichTextEditor editable={false}` rendering the content. A Delete menu item soft-deletes with Undo and navigates back to the list.
- **States:**
  - Loading: FY section skeletons with 4 card skeletons.
  - Error: `ErrorState` with retry.
  - Empty: there are always quarter cards once a space exists. The first-ever visit shows a hint banner above the current FY: "Generate your first quarterly report".
- **Motion:** the cards stagger in per section, and a newly created report's card cross-fades from Generate to its data (`layout` on the card body).

### 1.4 Routes and Integration
- `router.jsx`: `reports` and `reports/:reportId` render the new pages (replacing the placeholders).
- Canonical URL: a Global report (`space_id` null) opened under a space slug redirects to `/s/global/reports/:id`. A space report opened under a different space redirects to its own space. Global can open any report.

### 1.5 Impact on Existing Features
| Existing feature | Impact | Action |
|---|---|---|
| 04 `fetchTasks` | Needs tags on list rows for highlights | Add `withTags` if they aren't selected already |
| 06 Notes API | New `fetchKeyNotes` | Add it |
| 06 `components/editor` | Extensions are needed for `generateText`/`getSchema` | Export the extension list if it isn't exported |
| 12 `search_all` | Reports are searchable (`search` column) | Include reports with `space_id` null in Global results |
| 14 Pins and Trash | `reports.pinned_at`, `deleted_at` | Covered there |

### 1.6 Not in This Phase
- The editable report, charts, Final status and Refresh numbers (Phase 2)
- Export (Phase 3)

### 1.7 Checklist: Before Marking Complete
- [ ] The migration is applied and mirrored; advisors are clean; `report_stats` is not executable by `anon`
- [ ] The `report_stats` verification cases pass (local-day boundary, status at end, foreign space)
- [ ] `defaultReportPeriod`, `buildReportTitle`, `reportQuarterGrid` and `buildReportDocument` tests pass
- [ ] ReportsPage groups by fiscal year according to `fy_start_month`; changing the FY start in Settings regroups it
- [ ] The Generate dialog defaults correctly (space vs Global, previous quarter within 14 days), previews live numbers, and warns on a duplicate
- [ ] A generated report contains every section; highlights are task mention chips grouped by tag, and they link to the tasks
- [ ] A Global report stores `space_id` null and appears only in Global; space reports appear in their space and in Global
- [ ] Delete and Undo work
- [ ] `npm run lint`, `npm test` and `npm run build` pass
- [ ] `axon-rules` audit is clean for the changed files
- [ ] `00-index.md` DB registry, status and changelog are updated

**Stop here. Show the result and wait for approval.**

---

## Phase 2: Report View and Editor

### Goal
The report page shows stat tiles and charts from the snapshot, and an editable document that autosaves. The user can mark the report Final, which makes it read-only until they reopen it. "Refresh numbers" re-runs the stats for the same scope and period and updates only the snapshot, with a toast summarising what changed.

### Before Starting: Confirm Phase 1 Is Approved
1. Phase 1 is `✅ Complete`.
2. **Load the `dataviz` skill before any chart or tile work.** Reuse the stat-tile and chart conventions from Feature 10 (`StatTile` is lifted to `components/shared/StatTile.jsx` now that two features use it; record the move).
3. Check the shadcn `chart` pie/donut and horizontal bar examples for the current API.

### 2.1 Database
No database changes.

### 2.2 API and Utils
- `useUpdateReport` is used for autosave (content, `content_text`), status and title.
- `utils.js`: `diffStats(previous, next)` returns `[{ label, from, to }]` for changed headline numbers (completed, created, in progress at end, blocked at end, overdue at end, todos completed, journal entries, events). `formatStatsDiff(diff)` gives "Completed 42 → 45 · Blocked 3 → 1" or "No changes". Tested.

### 2.3 Components

```
src/features/reports/components/
├── ReportHeader.jsx          # editable title (inline input), period, scope badge, status toggle, menu
├── ReportStatTiles.jsx
├── ReportCharts.jsx
├── charts/CompletedByWeekChart.jsx
├── charts/ByPriorityChart.jsx
├── charts/ByTagChart.jsx
├── charts/BySpaceChart.jsx   # Global reports only
└── ReportEditor.jsx
```

- **`ReportPage`**: composes `ReportHeader`, then `ReportStatTiles`, then `ReportCharts`, then `ReportEditor`. `usePageHeader` breadcrumbs are "Reports › Q2 FY 2026–27".
- **`ReportHeader`** `({ report })`:
  - The title autosaves on blur.
  - Status is a Draft/Final `ToggleGroup`. Switching to Final shows `toast.success('Report marked final')`. When Final, a "Reopen" button returns it to Draft.
  - "Refresh numbers" (disabled while Final, with a tooltip) calls `useRefreshReportStats`, then `toast(formatStatsDiff(diff))`. "Numbers as of 23 Sep, 14:05" comes from `stats_refreshed_at`.
  - The menu holds Delete.
- **`ReportStatTiles`**: Completed, Created, In progress at end, Blocked at end, Todos done and Journal entries.
- **`ReportCharts`**: a 2-column grid of `WidgetCard`-style panels.
  - `CompletedByWeekChart` is a bar chart.
  - `ByPriorityChart` is a donut with a centre total and priority labels from the tasks constants.
  - `ByTagChart` is a horizontal bar of the top 10 tags plus "Other".
  - `BySpaceChart` is a horizontal bar with names from `spaceById` (a deleted space shows as "Deleted space"). It renders only for Global reports.
  - Each chart has its own empty state ("No completed tasks in this period").
  - Every chart reads only from `report.stats`, never live data, so a Final report is stable.
- **`ReportEditor`** `({ report })`: `RichTextEditor` with `features={{ taskMentions: true, slash: true }}` and `editable={report.status === 'draft'}`. It autosaves at 800ms via `useDebouncedCallback` (flushed on unmount and `beforeunload`), with a "Saving… / Saved" indicator in the header. Report mentions are **not** synced to `note_task_links`, because reports aren't notes.
- **States:** a page skeleton (header bar, 6 tiles, 2 chart blocks, editor lines). A 404 or deleted report shows `EmptyState` "Report not found" with "Back to reports". Errors show `ErrorState`.
- **Motion:** the tiles and charts stagger in on page entry. The Final state cross-fades the editor chrome (the toolbar hides with `fadeIn`).

### 2.4 Routes and Integration
None beyond replacing the Phase 1 read-only `ReportPage` body.

### 2.5 Impact on Existing Features
| Existing feature | Impact | Action |
|---|---|---|
| 10 `StatTile` | Now shared | Move it to `components/shared/StatTile.jsx` and update the 10 imports |

### 2.6 Not in This Phase
- Export and print (Phase 3)
- Comparing two reports side by side: backlog

### 2.7 Checklist: Before Marking Complete
- [ ] The `dataviz` skill was loaded before the chart work
- [ ] The tiles and all charts render from `stats`; `BySpaceChart` shows only for Global reports; each chart handles empty data
- [ ] Edits autosave and survive a reload; navigating away mid-typing flushes
- [ ] Final makes the editor read-only and disables Refresh; Reopen restores editing
- [ ] Refresh numbers changes `stats` and `stats_refreshed_at` only (verify `content` is unchanged via `execute_sql`) and toasts the diff
- [ ] `diffStats` and `formatStatsDiff` tests pass
- [ ] `npm run lint`, `npm test` and `npm run build` pass
- [ ] `axon-rules` audit is clean for the changed files
- [ ] `00-index.md` status and changelog are updated

**Stop here. Show the result and wait for approval.**

---

## Phase 3: Export

### Goal
From the report menu the user can:
- **Export PDF:** the browser print dialog with a clean, print-only layout of the title, period, tiles, charts (as SVG) and content, with no app chrome.
- **Export Markdown:** download a `.md` file of the content plus a stats table.
- **Copy to clipboard:** Markdown as plain text and HTML as rich text, for pasting into email or Confluence.

### Before Starting: Confirm Phase 2 Is Approved
1. Phase 2 is `✅ Complete`.
2. **Verify the Tiptap Markdown serializer** for the installed Tiptap major version: the official `@tiptap/markdown` (v3) or the community `tiptap-markdown`. Confirm it handles headings, lists, links, bold/italic and code, and how to register a serializer for the custom `taskMention` node. If neither fits, write a small JSON-to-Markdown walker in `utils/reportToMarkdown.js` covering exactly the node types the editor uses. Record the decision and any new dependency in the changelog.
3. Check `generateHTML(json, extensions)` from `@tiptap/core` for the clipboard HTML, and `ClipboardItem` support (with a fallback to `writeText`).

### 3.1 Database
No database changes.

### 3.2 Utils
- **`src/features/reports/utils/reportToMarkdown.js`**: `reportToMarkdown(report, { scopeName, spaceNameById, periodLabel })` returns a string (tests in `src/tests/features/reports/reportToMarkdown.test.js`):
  - Front matter lines: `# <title>`, `**Period:** Q2 FY 2026–27 (1 Jul – 30 Sep 2026)`, `**Scope:** THMP`, `**Status:** Final`.
  - A `## Numbers` GFM table of the headline stats, plus "Completed by tag" and "Completed by space" (Global) tables.
  - The content Markdown, where `taskMention` becomes `**<label>**` (plain, portable), links become `[text](absolute url)` using `window.location.origin` (passed in as `origin`), and empty paragraphs are dropped.
  - Tests cover the table rendering, a mention, a link, nested lists, and escaping of `|` in titles.
- `downloadTextFile(filename, text, mime = 'text/markdown')` in `src/lib/download.js` (a Blob plus a temporary `<a download>`, with the URL revoked afterwards). It is shared, because Feature 19 will reuse it. The filename is `slugify(title).md`.

### 3.3 Components
- **`features/reports/components/ReportPrintLayout.jsx`** `({ report })`: rendered in `ReportPage` with `hidden print:block`, while the app shell and interactive page get `print:hidden` (the layout, sidebar and page header get `print:hidden` in `AppLayout`, as a one-line change each). It contains:
  - The title, period and scope.
  - The tiles as a simple grid.
  - The charts at a fixed width (`ChartContainer` with an explicit aspect ratio, and `isAnimationActive={false}`), so Recharts renders complete SVG before printing.
  - The content through `RichTextEditor editable={false}`.
  - `break-inside-avoid` on the tiles and charts.
- **`features/reports/components/ReportExportMenu.jsx`**: a `DropdownMenu` in `ReportHeader` with three items:
  - **Export PDF:** `window.print()`, with the `document.title` temporarily set to the report title so the saved PDF gets a good filename (restored on `afterprint`).
  - **Export Markdown:** `downloadTextFile`.
  - **Copy to clipboard:** writes `text/plain` (Markdown) and `text/html` (`generateHTML` plus the stats table as HTML) via `ClipboardItem`, falling back to `writeText`. Shows `toast.success('Copied to clipboard')`.
- **Print styles:** Tailwind `print:` variants only. An `@page { margin: 16mm }` rule goes in `src/index.css` under a clearly commented print block (the only CSS addition). Colours in print use the light theme tokens; the print block forces the `.light` token set.

### 3.4 Routes and Integration
- `AppLayout`, `AppSidebar` and `PageHeader` get `print:hidden`.

### 3.5 Impact on Existing Features
| Existing feature | Impact | Action |
|---|---|---|
| 03 Layout | App chrome must not print | Add `print:hidden` |
| 01 `src/index.css` | `@page` rule and forced light tokens in print | Add a commented print block |
| Shared lib | New `lib/download.js` | Record it in the changelog |

### 3.6 Not in This Phase
- Server-side PDF generation (an Edge Function): backlog
- A .docx export: backlog

### 3.7 Checklist: Before Marking Complete
- [ ] The serializer decision is recorded; `reportToMarkdown` tests pass
- [ ] Export PDF shows only the report (no sidebar or buttons), charts are fully drawn as vectors, sections don't split awkwardly, and the default filename is the report title
- [ ] Printing in dark mode still produces a light, readable document
- [ ] The downloaded `.md` opens cleanly in a Markdown viewer, with correct tables and headings
- [ ] Copy to clipboard pastes rich text into an email client, and Markdown into a plain-text editor
- [ ] `npm run lint`, `npm test` and `npm run build` pass
- [ ] `axon-rules` audit is clean for the changed files
- [ ] `00-index.md` status and changelog are updated

**Stop here. Show the result and wait for approval.**

---

## Data Model Summary (after all phases)

```
auth.users 1 ── n reports (space_id NULL = Global report)
reports.space_id ──► spaces.id (on delete cascade)
report_stats(p_space_ids, p_start, p_end) → jsonb   reads tasks, task_activity, task_tags, tags,
                                                    todos, notes, events, profiles (RLS-scoped)
```

### `reports`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `space_id` | uuid | nullable; NULL means Global |
| `title` | text | 1–200; auto "Q2 FY 2026–27 — THMP" |
| `period_kind` | text | quarter, month or custom |
| `period_start` / `period_end` | date | inclusive |
| `fiscal_year` / `fiscal_quarter` | smallint | set for quarter reports only |
| `content` / `content_text` | jsonb / text | Tiptap document and derived text |
| `stats` | jsonb | `report_stats()` snapshot |
| `stats_refreshed_at` | timestamptz | last Refresh numbers |
| `status` | text | draft or final |
| `pinned_at` / `deleted_at` | timestamptz | Feature 14 |

## Out of Scope (All Phases)
- AI-drafted summaries: Feature 17
- Emailing reports: Feature 18
- Scheduled auto-generation at quarter end: Feature 18
- Replaying due-date history for exact "overdue at end": backlog

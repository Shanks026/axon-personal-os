# Feature 09: Daily Journal / Work Log

**Product**: Axon, a personal second-brain OS
**File**: `.claude/features/09-journal.md`
**Status**: 🔵 Planned
**Depends on**: 06, 07
**Last Updated**: September 2026

---

## Context

The daily stand-up question ("what did I do yesterday, what am I doing today, what's blocking me") is currently answered from memory. The journal gives each space one entry per day, prefilled with a Yesterday / Today / Blockers / Notes template, and it is the main raw input for quarterly reports (11). A journal entry **is a note** (`notes.kind = 'journal'` plus `journal_date`), so it reuses the shared `RichTextEditor`, autosave, `[[task]]` mentions and `sync_note_mentions` without new infrastructure. Entries are created lazily on the first edit, never just by viewing a date.

---

## Phase Overview

```
Phase 1: Daily entry
  notes.kind + journal_date migration, notes list filtered to kind='note', journal api, JournalPage with
  DateStrip, lazy-created templated entry with autosave and mentions, Global stacked read view,
  "Done that day" side panel.

Phase 2: Navigation and insight
  Mini month popover with entry dots, entry count and streak indicator, "Insert completed tasks" into Today.
```

**After each phase, stop and wait for approval.**

---

## Phase 1: Daily Entry

### Goal
At `/s/:slug/journal` (today in the profile time zone) or `/s/:slug/journal/:date`, the user sees a date strip with dots on days that have entries, moves between days, and writes in an editor prefilled with the template. The entry is saved (and created on the first keystroke) with autosave and a "Saving… / Saved" indicator. `[[task]]` mentions link the entry to tasks. A side panel lists the tasks completed and todos done that day. In Global, each active space's entry for the date is shown read-only, stacked, with "Write in <space>" for spaces without one. The Notes list and note search no longer show journal entries.

### Before Starting: Confirm With Codebase
1. Features 06 and 07 are complete. Confirm the exact exports: `fetchNotes`, `noteKeys`, `updateNote(id, patch)`, `syncNoteMentions(noteId, taskIds)` (or 07's combined save hook), `linkKeys`, and the helper that collects `taskMention` ids from a Tiptap doc (07). If the collector is private to notes, move it to `components/editor/` (it is shared by 2+ features now) and record the move.
2. Confirm the `RichTextEditor` props (`value`, `onChange(json, text)`, `editable`, `features: { taskMentions: true }`) and whether it re-initialises when `value` changes. The page keys the editor by `${spaceId}:${date}` to force a clean remount.
3. `lib/dates.js` has `todayISO(timeZone)` and `zonedDayRange(isoDate, timeZone)` (Feature 08). `useDebouncedCallback` (`use-debounce`) is installed.
4. Confirm the task API's completion filter. If `fetchTasks` has no `completedFrom`/`completedTo` yet, it is added here (see 1.2). The same applies to `doneFrom`/`doneTo` on `fetchTodos`.
5. Use the MCP `execute_sql` to confirm `public.notes` has no `kind` column yet, and count the existing notes (they all become `kind = 'note'`).

### 1.1 Database
Migration `add_journal_to_notes`: the SQL from `data-model.md` **notes**, Feature 09 block:

```sql
alter table public.notes
  add column kind text not null default 'note' check (kind in ('note','journal')),
  add column journal_date date,
  add constraint notes_journal_date_chk check ((kind = 'journal') = (journal_date is not null));
create unique index notes_journal_unique on public.notes (user_id, space_id, journal_date)
  where kind = 'journal' and deleted_at is null;
```

- The unique index is partial on `deleted_at is null`, so after an entry is trashed a fresh one can be written for the same day.
- No new policy is needed: the `notes` owner policy covers journal rows.

Verify:
- Existing rows are `kind = 'note'`.
- A journal row without `journal_date` is rejected, and so is a note with one.
- A second live journal entry for the same space and day is rejected.

Run advisors.

### 1.2 API Layer
**Notes API changes (`features/notes/api.js`):**
- `fetchNotes` adds `.eq('kind', 'note')` unconditionally. Journal entries are reached only through the journal API.
- `LIST_COLUMNS` and `useNote(id)` include `kind` and `journal_date`, so shared consumers (`EntityLink`, linked notes on task detail) can route journal entries to `paths.journal(date)` instead of `paths.note(id)`.

**Task and todo API additions (additive):**

| File | New params | Query |
|---|---|---|
| `features/tasks/api.js` `fetchTasks` | `completedFrom`, `completedTo` (UTC ISO, half-open) | `.gte('completed_at', completedFrom).lt('completed_at', completedTo)` |
| `features/todos/api.js` `fetchTodos` | `doneFrom`, `doneTo` (UTC ISO, half-open) | `.gte('done_at', doneFrom).lt('done_at', doneTo)` |

**`src/features/journal/api.js`:**

| Export | Details |
|---|---|
| `journalKeys` | `{ all: ['journal'], entry: (p) => ['journal','entry', p], day: (p) => ['journal','day', p], dates: (p) => ['journal','dates', p] }` |
| `fetchJournalEntry({ spaceId, date })` / `useJournalEntry(params)` | `from('notes').select('*').eq('kind','journal').eq('space_id', spaceId).eq('journal_date', date).is('deleted_at', null).maybeSingle()`. Returns `null` when nothing is written. `enabled: !!spaceId && !!date`. |
| `fetchJournalDay({ spaceIds, date })` / `useJournalDay(params)` | same filters with `.in('space_id', spaceIds)`, which returns an array (for Global) |
| `fetchJournalDates({ spaceIds, from, to })` / `useJournalDates(params)` | `select('space_id, journal_date')` with `kind = 'journal'`, `deleted_at is null` and `journal_date` between `from` and `to` (inclusive `yyyy-MM-dd`). Returns rows; the helper `toDateSet(rows)` gives a `Set<isoDate>`. `placeholderData: keepPreviousData`. |
| `getOrCreateJournalEntry({ spaceId, date, content, content_text })` | Selects first. If there is none, it inserts `{ space_id, kind: 'journal', journal_date: date, title: journalTitle(date), content, content_text }` and returns the row. On a unique violation (`23505`, a race with another tab) it re-selects and returns the winner. |
| `useSaveJournalEntry()` | `mutationFn({ entryId, spaceId, date, content, content_text, taskIds })`: if there is no `entryId`, `getOrCreateJournalEntry`; otherwise `updateNote(entryId, { content, content_text })`. Then `syncNoteMentions(id, taskIds)`. `onSuccess` calls `setQueryData(journalKeys.entry({ spaceId, date }), row)`, and invalidates `journalKeys.dates` and `journalKeys.day` (only when the row was created) plus `linkKeys.all`. Errors toast. |
| `useClearJournalEntry()` | soft-deletes the entry (`softDeleteNote`) with an Undo toast; invalidates `journalKeys.all` |
| `restoreJournalEntry(id)` / `useRestoreJournalEntry()` | Calls `restoreNote(id)`. A unique violation (`23505` on `notes_journal_unique`, meaning a new live entry was written for that day since the delete) is rethrown as `new Error('An entry for this day already exists — open it and copy what you need from Trash')`, so the hook's error toast is friendly. Invalidates `journalKeys.all` and `linkKeys.all`. It is used by the Undo toast and by Trash (14) for `kind = 'journal'` rows. |

**`src/features/journal/constants.js`:**
- `JOURNAL_TEMPLATE`: a Tiptap doc of `heading` (level 2) nodes "Yesterday", "Today", "Blockers" and "Notes", each followed by an empty `bulletList` (one empty `listItem`). The final "Notes" heading is followed by an empty paragraph.
- `JOURNAL_SECTIONS = ['Yesterday','Today','Blockers','Notes']`.

**`src/features/journal/utils.js`** (tests in `src/tests/features/journal/utils.test.js`):
- `journalTitle(isoDate)` gives "Journal · Wed 23 Sep 2026".
- `buildStripDays(centerISO, { weekStartsOn, before = 21, after = 14 })` returns days aligned so the first day is a week start, each with an `isWeekStart` flag.
- `parseJournalDateParam(param, todayISO)` returns a valid ISO date, or `null` when the param is invalid.

**`src/features/journal/hooks/useJournalAutosave.js`**: `useJournalAutosave({ entry, spaceId, date })` returns `{ onChange, status }`, where `status` is `'idle' | 'saving' | 'saved' | 'error'`.
- 800ms debounce via `useDebouncedCallback`, flushed on unmount and on `beforeunload`.
- It holds the in-flight creation promise in a ref, so edits during the first insert are applied to the created row rather than inserting twice.
- `taskIds` come from 07's mention collector.

### 1.3 Components

```
src/features/journal/
├── api.js
├── constants.js
├── utils.js
├── hooks/useJournalDate.js          # { date, isToday, goTo(iso), goPrev, goNext } from :date param + todayISO(tz)
├── hooks/useJournalAutosave.js
├── components/
│   ├── DateStrip.jsx
│   ├── JournalDayNav.jsx            # prev / date label / next / "Today" button
│   ├── JournalEditor.jsx
│   ├── JournalGlobalDay.jsx
│   ├── DoneThatDayPanel.jsx
│   └── SaveStatus.jsx               # "Saving… / Saved / Couldn't save — retry"
└── pages/JournalPage.jsx            # /s/:slug/journal and /s/:slug/journal/:date
```

- **`JournalPage`**: `usePageHeader({ title: 'Journal', breadcrumbs: [formatDate(date)] })`. The layout is a two-column grid on wide screens (editor, then the `DoneThatDayPanel`), stacked on narrow ones. In a space it renders `JournalEditor`; in Global it renders `JournalGlobalDay`.
- **`useJournalDate()`**: the date comes from `:date`, validated by `parseJournalDateParam`. An invalid date navigates with `replace` to `paths.journal(todayISO(tz))`. With no param it is today, and the URL stays `/journal`. `goTo` navigates to `paths.journal(iso)`, except that today goes to `paths.journal()`.
- **`DateStrip`** `({ selected, datesWithEntries, weekStartsOn, onSelect })`:
  - A horizontal `ScrollArea` of day buttons from `buildStripDays`, each showing the weekday initial and the day number, with a dot when the date is in `datesWithEntries`. Week-start days get a subtle separator and a month label when the month changes.
  - The selection indicator is a `motion.div` with `layoutId="journal-date-indicator"`, so it glides between days.
  - When the selection changes, the selected day is scrolled into view (`inline: 'center'`), smoothly unless the user prefers reduced motion.
  - Days are `<button>`s with `aria-pressed` and `aria-label="Wed 23 September 2026, has entry"`.
- **`JournalDayNav`** `({ date, onPrev, onNext, onToday, isToday })`: icon buttons with tooltips. Hotkeys `alt+←` / `alt+→` (page-scoped, and disabled while the editor has focus so they don't clash with word navigation).
- **`JournalEditor`** `({ spaceId, date })`:
  - `useJournalEntry`, then `RichTextEditor` with `value={entry?.content ?? JOURNAL_TEMPLATE}`, `features={{ taskMentions: true }}` and `onChange` from `useJournalAutosave`.
  - Keyed by `${spaceId}:${date}` so switching days flushes and remounts.
  - Shows `SaveStatus` in the page header actions.
  - An entry menu offers "Clear entry" (soft delete with Undo).
- **`JournalGlobalDay`** `({ date })`: `useJournalDay({ spaceIds: scopeSpaceIds, date })`. For each active space, in `position` order:
  - With an entry: a card with a `SpaceBadge` header and `RichTextEditor editable={false}`.
  - Without one: a compact card with "Nothing written in <space>" and a "Write in <space>" button linking to `paths.space(slug).journal(date)`.
  - Empty (no active spaces) is impossible here, because `SpaceBoundary` handles it.
- **`DoneThatDayPanel`** `({ spaceIds, date })`:
  - `useTasks({ spaceIds, completedFrom, completedTo })` and `useTodos({ spaceIds, doneFrom, doneTo })`, with the range from `zonedDayRange(date, tz)`.
  - A read-only list: tasks as `EntityLink` chips with the completion time, and todos as struck-through rows. `SpaceBadge` in Global.
  - Empty: a quiet inline line, "Nothing completed on this day", not a full `EmptyState`.
- **States:**
  - Loading: an editor-shaped skeleton (four heading bars) and strip dots appearing once the dates load. The strip itself renders immediately.
  - Error: `ErrorState` in the editor area with `refetch`.
  - Empty: there is no empty state, because the template is the invitation.
- **Motion:** the editor area cross-fades between days (`fadeIn` keyed by date). Global cards use `staggerContainer`. The panel list uses `AnimatedList`.

### 1.4 Routes and Integration
- `router.jsx`: `journal` and `journal/:date` both render `features/journal/pages/JournalPage.jsx` (replacing the placeholder).
- `EntityLink` and any note link (07 linked-notes list, 12 search results) use `note.kind === 'journal' ? p.journal(note.journal_date) : p.note(note.id)`.
- `notes/:noteId` for a journal row redirects (`replace`) to `journal/:date` in that note's space.

### 1.5 Impact on Existing Features
| Existing feature | Impact | Action |
|---|---|---|
| 06 Notes list / search | Would show journal entries | `fetchNotes` filters `kind = 'note'`; select `kind, journal_date` |
| 06 Note detail route | A journal id is opened via `/notes/:id` | Redirect to `journal/:date` |
| 07 `EntityLink` / linked notes | Journal entries appear as linked notes | Route by `kind`; show a journal icon |
| 04 / 05 `fetchTasks` / `fetchTodos` | New `completedFrom/To` and `doneFrom/To` | Add the params |
| 12 `search_all` | Journal rows are notes | Return `kind` and `journal_date` so results route correctly and are labelled "Journal" |
| 14 Trash | Cleared entries are trashed notes | Trash restores `kind = 'journal'` rows through `restoreJournalEntry` (friendly error on a date conflict) |

### 1.6 Not in This Phase
- The mini month popover, streak indicator and "Insert completed tasks" (Phase 2)
- Tags on journal entries

### 1.7 Checklist: Before Marking Complete
- [ ] The migration is applied and mirrored; advisors are clean; the three verification checks pass
- [ ] The Notes list and note search never show journal entries
- [ ] Opening a day with no entry creates nothing in the DB; the first keystroke creates exactly one row (also when typing fast); a later edit updates it
- [ ] `/journal` shows today in the profile time zone; `/journal/2026-09-22` shows that day; an invalid date redirects to today
- [ ] The date strip shows dots for days with entries, respects week start, and the selection animates
- [ ] A `[[task]]` mention in an entry appears on that task's linked notes and routes back to the journal day
- [ ] "Done that day" lists the tasks completed and todos done on that local day
- [ ] Global shows each space's entry read-only, with "Write in <space>" for spaces without one
- [ ] Switching days mid-typing flushes the pending save
- [ ] Clear entry, then Undo, restores it; clearing, writing a new entry for the same day and then restoring the old one shows the friendly conflict error and changes nothing
- [ ] `utils.js` tests pass
- [ ] `npm run lint`, `npm test` and `npm run build` pass
- [ ] `axon-rules` audit is clean for the changed files
- [ ] `00-index.md` DB registry, status and changelog are updated

**Stop here. Show the result and wait for approval.**

---

## Phase 2: Navigation and Insight

### Goal
A calendar button opens a mini month with dots on days that have entries, for jumping to any date. The page header shows how many entries the user has written this fiscal quarter and their current streak. "Insert completed tasks" appends a bullet list of the day's completed tasks (as task mentions) to the Today section.

### Before Starting: Confirm Phase 1 Is Approved
1. Phase 1 is `✅ Complete`.
2. Check the current shadcn `calendar` (react-day-picker) props: `modifiers`, `modifiersClassNames`, `weekStartsOn`, `month` / `onMonthChange`.
3. Confirm that `RichTextEditor` exposes the editor instance (a ref or an `onReady(editor)` prop). If it doesn't, add an `editorRef` prop: a minimal change to the shared editor, recorded in the changelog.
4. `lib/fiscal.js` `getFiscalQuarter` exists (02).

### 2.1 Database
No database changes.

### 2.2 Utils
Additions to `journal/utils.js`, tested:
- `computeStreak(dateSet, todayISO)`: the number of consecutive days with entries ending today, or ending yesterday when today has no entry yet (so the streak isn't "broken" in the morning). A gap gives 0.
- `appendToSection(doc, sectionTitle, nodes)` returns a new doc with `nodes` inserted at the end of the section, before the next level-2 heading. If the section's trailing block is an empty bullet list, it is replaced rather than appended after. If the heading is missing, a new heading and the nodes go at the end of the doc.
- `completedTasksToBulletList(tasks, existingMentionIds)` builds a `bulletList` of `listItem > paragraph > taskMention { id, label: title }` nodes, skipping tasks already mentioned in the doc. It returns `null` when nothing is left.

### 2.3 Components
- **`features/journal/components/JournalMonthPopover.jsx`** `({ selected, onSelect })`:
  - A popover trigger (a `CalendarDays` icon button next to the day nav) opens the shadcn `Calendar` with `weekStartsOn`.
  - `modifiers={{ hasEntry: dates }}` comes from `useJournalDates` for the visible month (the fetch follows `onMonthChange`), and renders as a dot.
  - Selecting a day calls `goTo` and closes the popover.
- **`features/journal/components/JournalStats.jsx`**: two quiet chips in the page header.
  - "12 entries this quarter": `useJournalDates` over the current fiscal quarter range.
  - "5-day streak": `computeStreak` over a trailing 365-day `useJournalDates` query. It is shown only when the streak is 2 or more, and has a subtle `scaleIn` when it increments.
  - In Global, both count the union of dates across spaces.
- **"Insert completed tasks" button** (`JournalEditor` toolbar, in a space only):
  - Reuses the `DoneThatDayPanel` query.
  - On click: build the list, `appendToSection(editor.getJSON(), 'Today', [list])`, then `editor.commands.setContent(newDoc, { emitUpdate: true })` (check the current Tiptap `setContent` signature) so autosave and mention sync fire.
  - It is disabled with the tooltip "No completed tasks today" when there are none, and shows `toast('Nothing new to insert')` when every task is already mentioned.

### 2.4 Routes and Integration
None.

### 2.5 Impact on Existing Features
| Existing feature | Impact | Action |
|---|---|---|
| 06 `RichTextEditor` | Needs editor access | Add `editorRef` if missing |

### 2.6 Not in This Phase
- "On this day" (same date in previous months or years): backlog
- Weekly summary view of entries

### 2.7 Checklist: Before Marking Complete
- [ ] The mini month shows dots for days with entries, follows month navigation, respects week start, and jumping works
- [ ] The quarter count matches the entries in the current fiscal quarter; the streak rule (today or yesterday) is tested
- [ ] "Insert completed tasks" adds mention chips under Today, never duplicates, triggers autosave, and the mentions sync to `note_task_links`
- [ ] `computeStreak`, `appendToSection` and `completedTasksToBulletList` tests pass
- [ ] `npm run lint`, `npm test` and `npm run build` pass
- [ ] `axon-rules` audit is clean for the changed files
- [ ] `00-index.md` status and changelog are updated

**Stop here. Show the result and wait for approval.**

---

## Data Model Summary (after all phases)

```
spaces 1 ── n notes
              ├── kind = 'note'     → Notes feature
              └── kind = 'journal'  → one live row per (space, journal_date)
notes ── note_task_links ── tasks   (journal mentions sync like any note)
```

### `notes` (journal columns)
| Column | Type | Notes |
|---|---|---|
| `kind` | text | `note` (default) or `journal` |
| `journal_date` | date | required if and only if `kind = 'journal'` |
| index `notes_journal_unique` | unique | `(user_id, space_id, journal_date)` where journal and not deleted |

## Out of Scope (All Phases)
- Multiple entries per day: by design, one per space per day
- Mood or energy tracking: backlog
- Auto-appending completed tasks without a click: Feature 18 (automation rules)
- Journal prompts written by AI: Feature 17

# Feature 09: Daily Journal / Work Log

**Product**: Axon, a personal second-brain OS
**File**: `.claude/features/09-journal.md`
**Status**: 🟡 In progress (Phase 1 ✅, Phase 2 next)
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

Phase 2: Navigation, insert and carry-forward
  Mini month popover with entry dots, "Insert into Today" in the rail, and a new day's Yesterday
  prefilled from the previous entry's Today.
```

**After each phase, stop and wait for approval.**

---

## Phase 1: Daily Entry ✅ Complete

> **Design deltas ✅ folded (2026-09-26)** from `design-deltas.md` §09 and `Journal.dc.html`, and checked against later decisions:
> - The date strip is a **fixed 14-day grid with ‹ ›** (56px cells), not a scrolling strip. The "Sep 2026" mini-month button is Phase 2.
> - The page header is the plain `Journal` title; the body opens with the **date as a 30px title plus "Q2 · W13"** (`getFiscalWeek`, D4), then "Standup template · Saved".
> - Section headings are **uppercase, small and muted, with Blockers in red**. Body max-width 680 (`max-w-170`, the design-system reading width; the design shows 660).
> - The rail is **"Done today · Auto-listed for reference"** (or "Done on Tue 22 Sep" for other days) and includes **status changes from `task_activity`**, not just completions. It uses the shared `DetailRail` (304px `w-76`, the later decision) instead of the design's 300px, with a `panel-right` toggle and a Sheet below `lg`, like the note editor.
> - **Dropped:** the streak and entry-count indicator (backlog). "Insert into Today" moves into the rail (Phase 2).
> - **Global (user decision 2026-09-26):** stacked, read-only cards per space, with "Write in <space>". No space picker anywhere.
> - Colours: rail icons use literal Tailwind classes via `lib/tint.js` status colours, never the space accent.

### Goal
At `/s/:slug/journal` (today in the profile time zone) or `/s/:slug/journal/:date`, the user sees a 14-day strip with dots on days that have entries, moves between days, and writes in an editor prefilled with the standup template. The entry is created on the first edit and then autosaved, with a "Saving… / Saved" indicator. `[[task]]` mentions link the entry to tasks. A rail lists the tasks completed, the task status changes and the todos done that day. In Global, each active space's entry for the date is shown read-only, stacked, with "Write in <space>" for spaces without one. The Notes list no longer shows journal entries.

### Before Starting: Confirm With Codebase (done 2026-09-26)
1. ✅ `features/notes/api.js`: `fetchNotes`, `noteKeys`, `updateNote(id, patch)`, `softDeleteNote`, `restoreNote`. Mentions: `features/links/api.js` `syncNoteMentions({ noteId, taskIds })`, `linkKeys`; collector `features/links/utils.js` `collectTaskMentionIds(doc)` and `sameIds` (already shared, no move needed). `useTaskMentionsConfig(note)` only reads `note.space_id`.
2. ✅ `RichTextEditor` props: `value` (read once on mount, so key by `${spaceId}:${date}`), `onChange(json, text)`, `editable`, `features: { slash, taskMentions, images, onSave }`, `onEditorReady`, `label`, `className`.
3. ✅ `lib/dates.js` `todayISO`, `zonedDayRange`, `zonedParts`, `formatTime`; `lib/fiscal.js` `getFiscalQuarter`, `getFiscalWeek`; `usePreferences()` (settings api) gives `{ timezone, weekStartsOn, fyStartMonth }`. `hooks/useAutosave` serialises saves in order, so the journal builds on it: no separate in-flight-promise logic.
4. ✅ `fetchTasks` has no completion filter and `fetchTodos` no done window. Instead of `completedFrom/To` on `fetchTasks`, the rail reads `task_activity` status rows (they include completions: `to_value = 'done'`), which the design asks for anyway.
5. ✅ `public.notes` has no `kind` column. `task_activity` columns: `id, user_id, task_id, kind, from_value, to_value, body, created_at, updated_at`.

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

Verify (rolled-back transaction): existing rows are `kind = 'note'`; a journal row without `journal_date` is rejected, and so is a note with one; a second live journal entry for the same space and day is rejected. Run advisors.

### 1.2 API Layer
**Notes API changes (`features/notes/api.js`):**
- `fetchNotes` adds `.eq('kind', 'note')` unconditionally.
- `LIST_COLUMNS` includes `kind, journal_date`; `fetchNote` already selects `*`.

**Links API (`features/links/api.js`):** `fetchNotesForTask` selects `kind, journal_date` on the note, so the task's Linked notes route journal entries to the journal day.

**Task and todo API additions (additive):**

| File | Addition |
|---|---|
| `features/tasks/api.js` | `taskKeys.statusChanges(params)`; `fetchStatusChanges({ spaceIds, from, to })` / `useStatusChanges(params)`: `task_activity` rows with `kind = 'status'` and `created_at` in `[from, to)`, joined `task:tasks!inner(id, space_id, title, status, deleted_at)` filtered `.in('task.space_id', spaceIds)` and `.is('task.deleted_at', null)`, newest first. |
| `features/todos/api.js` `fetchTodos` / `useTodos` | `doneFrom`, `doneTo` (UTC ISO, half-open): `.in('space_id', spaceIds).eq('is_done', true).gte('done_at', doneFrom).lt('done_at', doneTo)` |

**`src/features/journal/api.js`:**

| Export | Details |
|---|---|
| `journalKeys` | `{ all: ['journal'], entry: (p) => ['journal','entry', p], day: (p) => ['journal','day', p], dates: (p) => ['journal','dates', p] }` |
| `fetchJournalEntry({ spaceId, date })` / `useJournalEntry(params)` | `from('notes').select('*').eq('kind','journal').eq('space_id', spaceId).eq('journal_date', date).is('deleted_at', null).maybeSingle()`. `null` when nothing is written. |
| `fetchJournalDay({ spaceIds, date })` / `useJournalDay(params)` | same filters with `.in('space_id', spaceIds)`, an array (Global) |
| `fetchJournalDates({ spaceIds, from, to })` / `useJournalDates(params)` | `select('space_id, journal_date')`, live journal rows with `journal_date` between `from` and `to` (inclusive). `placeholderData: keepPreviousData`. `toDateSet(rows)` (utils) gives a `Set<isoDate>`. |
| `getOrCreateJournalEntry({ spaceId, date, content, content_text })` | Selects first; if none, inserts `{ space_id, kind: 'journal', journal_date, title: journalTitle(date), content, content_text }`. On `23505` (another tab won the race) it re-selects and updates that row with the content. |
| `useSaveJournalEntry()` | `mutationFn({ entryId, spaceId, date, content, content_text })`: `entryId` ? `updateNote` : `getOrCreateJournalEntry`. `onSuccess` seeds `journalKeys.entry({ spaceId, date })`; on create it also invalidates `journalKeys.dates` and `journalKeys.day`. Errors surface in the save indicator. |
| `useClearJournalEntry()` | soft-deletes the entry with an Undo toast (calls `restoreJournalEntry`); invalidates `journalKeys.all` and `['links']` |
| `restoreJournalEntry(id)` / `useRestoreJournalEntry()` | `restoreNote(id)`; a `23505` is rethrown as `'An entry for this day already exists — open it and copy what you need from Trash'`. Invalidates `journalKeys.all` and `['links']`. Used by Undo and later Trash (14). |

**`src/features/journal/constants.js`:** `JOURNAL_SECTIONS = ['Yesterday','Today','Blockers','Notes']`; `JOURNAL_TEMPLATE`: a level-2 heading per section, each followed by an empty `bulletList` (one empty `listItem`), except "Notes", followed by an empty paragraph. `JOURNAL_AUTOSAVE_DELAY = 800`. `JOURNAL_STRIP_DAYS = 14`.

**`src/features/journal/utils.js`** (tests in `src/tests/features/journal/utils.test.js`):
- `journalTitle(isoDate)` gives "Journal · Wed 23 Sep 2026".
- `buildStripDays(anchorISO, { weekStartsOn, count = 14 })`: `count` consecutive ISO dates starting at the week start on or before the week that precedes `anchorISO` (so the anchor sits in the second week).
- `shiftStrip(anchorISO, direction)` moves the anchor by 14 days.
- `parseJournalDateParam(param)` returns the ISO date when valid (real calendar date, `yyyy-MM-dd`), else `null`.
- `toDateSet(rows)`.

**`src/features/journal/hooks/useJournalAutosave.js`**: `useJournalAutosave({ entry, spaceId, date })` → `{ onChange, flush, status }`, built on `useAutosave` (800ms, serialised, flushed on unmount and `beforeunload`). The entry id lives in a ref: the first save creates the row and later saves (queued behind it) update it, so fast typing never inserts twice. After a content save, `collectTaskMentionIds` and, when changed, `syncNoteMentions` (as `NoteEditor` does).

### 1.3 Shared editor change
`buildExtensions` gains `features.headingTones` (`{ [headingText]: tone }`): a small decoration plugin (`components/editor/extensions/HeadingTones.js`) adding `data-tone` to headings whose text matches. The journal passes `{ Blockers: 'destructive' }`; `editor.css` styles `.axon-journal` headings (uppercase, 12px, semibold, tracking, muted; `[data-tone=destructive]` red).

### 1.4 Components

```
src/features/journal/
├── api.js
├── constants.js
├── utils.js
├── hooks/useJournalDate.js          # { date, today, isToday, goTo(iso), goPrev, goNext, goToday }
├── hooks/useJournalAutosave.js
├── components/
│   ├── DateStrip.jsx                # ‹ 14-day grid ›
│   ├── JournalDateHeading.jsx       # "Tuesday, 23 September" + "Q2 · W13" + template / save line
│   ├── JournalEditor.jsx            # one space's entry
│   ├── JournalGlobalDay.jsx         # Global: stacked read-only cards
│   ├── DoneThatDay.jsx              # rail contents
│   └── JournalSkeleton.jsx
└── pages/JournalPage.jsx
```

- **`JournalPage`**: `usePageHeader({ title: 'Journal', actions })`; actions are the `SaveIndicator` (space only), a "Today" button when not on today, the rail toggle and the entry `…` menu (Clear entry). Layout: `DateStrip` under the header (full width, bottom border), then a row of the body (`JournalEditor` or `JournalGlobalDay`, padding `px-4 pt-10 md:px-14`, `max-w-170` centred (the rule's 680px reading width)) and `DetailRail` with `DoneThatDay`. Below `lg`, the toggle opens a Sheet. Rail state in `useLocalStorage('axon:journal:rail', true)`.
- **`useJournalDate()`**: `:date` via `parseJournalDateParam`; invalid → `Navigate replace` to `p.journal()`. No param = today (`todayISO(timezone)`), URL stays `/journal`. `goTo(today)` goes to `p.journal()`. Hotkeys `alt+←` / `alt+→` (not while typing in the editor).
- **`DateStrip`** `({ selected, today, datesWithEntries, weekStartsOn, onSelect })`: ‹ and › icon buttons shift a local anchor by 14 days (reset to the selection when it leaves the visible range). A `grid-cols-14` of 56px day buttons: weekday (3 letters), day number (tabular), and a 4px dot when the date has an entry. The selected day has a `motion.div` background (`layoutId="journal-date-indicator"`, card fill and border). Today's weekday is in the foreground colour and semibold; future days are faint. `aria-pressed`, `aria-label="Wednesday 23 September 2026, has entry"`.
- **`JournalDateHeading`** `({ date, status })`: `format(date, 'EEEE, d MMMM')` at `text-3xl font-semibold tracking-tight`, the mono `Q2 · W13` (`getFiscalQuarter` / `getFiscalWeek` with the preferences), and a muted line: `LayoutTemplate` "Standup template".
- **`JournalEditor`** `({ spaceId, date, onStatus })`: `useJournalEntry`; skeleton while loading, `ErrorState` on error; then an inner component keyed by `${spaceId}:${date}` renders `RichTextEditor` with `value={entry?.content ?? JOURNAL_TEMPLATE}`, `features={{ slash: true, taskMentions, images, onSave: flush, headingTones }}` and `className="axon-journal"`. The editor area fades in per date (`fadeIn`).
- **`JournalGlobalDay`** `({ date })`: `useJournalDay`. For each active space in `position` order, a card (`staggerItem`): a `SpaceBadge` header plus a read-only `RichTextEditor` when there's an entry, or "Nothing written in <space>" with a "Write in <space>" outline button (`paths.space(slug).journal(date)`).
- **`DoneThatDay`** `({ spaceIds, date, isToday })`: `useStatusChanges` and `useTodos({ doneFrom, doneTo })` over `zonedDayRange(date, timezone)`; merged and sorted by time. Rows (min-height 34): a status icon in the target status's tint (`TASK_STATUS_MAP`), the task title as an `EntityLink` (completions) or "Title → In review" (other changes), and the mono local time; todos use a `CircleCheck` emerald icon and the struck todo title. `SpaceBadge` in Global. Empty: a quiet "Nothing completed on this day". Uses `AnimatedList`.

### 1.5 Routes and Integration
- `router.jsx` already maps `journal` and `journal/:date` to `JournalPage`; the placeholder is replaced.
- Journal-aware links: `EntityLink` gets optional `journalDate`; when set, the note link goes to `paths.space(slug).journal(journalDate)` with a `NotebookPen` icon. `LinkedNotesPanel` routes by `note.kind`.
- `NoteEditorPage`: a journal row opened via `/notes/:id` redirects (`replace`) to its space's `journal/:date`.

### 1.6 Impact on Existing Features
| Existing feature | Impact | Action |
|---|---|---|
| 06 Notes list / search | Would show journal entries | `fetchNotes` filters `kind = 'note'` |
| 06 Note detail route | A journal id opened via `/notes/:id` | Redirect to `journal/:date` |
| 07 `EntityLink` / Linked notes | Journal entries appear as linked notes | Route by `kind`; journal icon |
| 05 `fetchTodos` | New `doneFrom/To` | Add the params |
| 04 tasks api | New status-change read | `fetchStatusChanges` |
| 06 editor | Journal heading styles | `features.headingTones`, `.axon-journal` CSS |
| 12 `search_all` | Journal rows are notes | Return `kind` and `journal_date` (Feature 12) |
| 14 Trash | Cleared entries are trashed notes | Restore through `restoreJournalEntry` |

### 1.7 Not in This Phase
- The mini month popover and "Insert into Today" (Phase 2)
- Tags on journal entries; choosable templates (D3, backlog); streak / entry count (dropped, backlog)

### 1.8 Checklist: Before Marking Complete
- [x] The migration is applied and mirrored; advisors are clean; the three verification checks pass
- [x] The Notes list never shows journal entries
- [ ] Opening a day with no entry creates nothing in the DB; the first edit creates exactly one row (also when typing fast); a later edit updates it
- [x] `/journal` shows today in the profile time zone; `/journal/2026-09-22` shows that day; an invalid date redirects to today
- [ ] The 14-day strip shows dots for days with entries, respects week start, pages with ‹ ›, and the selection animates
- [ ] Headings are uppercase with Blockers in red; the date title shows "Q2 · W13"
- [ ] A `[[task]]` mention in an entry appears on that task's linked notes and routes back to the journal day
- [ ] The rail lists tasks completed, status changes and todos done on that local day
- [ ] Global shows each space's entry read-only, with "Write in <space>" for spaces without one
- [ ] Switching days mid-typing flushes the pending save
- [ ] Clear entry, then Undo, restores it; the date-conflict restore shows the friendly error
- [x] `utils.js` tests pass
- [x] `npm run lint`, `npm test` and `npm run build` pass
- [x] `axon-rules` audit is clean for the changed files
- [x] `00-index.md` DB registry, status and changelog are updated

### Implementation Notes (2026-09-26)
- **Migration `20260926071151_add_journal_to_notes`** applied through the Supabase MCP and mirrored. Verified in a rolled-back block: existing rows are `note`; a journal row without a date and a note with one are rejected; a second live entry for the same space and day is rejected (4/4). Advisors: only the pre-existing warnings (`rls_auto_enable`, leaked-password protection).
- **"Done today" reads `task_activity`** (`fetchStatusChanges` / `useStatusChanges` in `tasks/api.js`, key `taskKeys.statusChanges`, `staleTime: 0` because status changes happen on other pages) instead of adding `completedFrom/To` to `fetchTasks`. Each task shows **once**, at its latest change that day (`buildDoneItems`): a completion is the task chip with its emerald check; other moves read "Title → In review". Todos use the new `doneFrom/doneTo` window on `fetchTodos`.
- **Autosave** builds on the shared `useAutosave` (serialised saves), so the in-flight-promise logic from the plan wasn't needed: the first save creates the row, later saves queue behind it and update it. `getOrCreateJournalEntry` also handles a race with another tab (23505 → re-read and update).
- **Clear / Undo** remount the editor through a `resetKey` (the editor reads its content once): `useClearJournalEntry({ onReset })` sets the cached entry to `null` (or the restored row on Undo) before bumping it. The page flushes the pending save before clearing.
- **Strip dots** are fetched by `DateStrip` itself for its visible 14 days, since ‹ › page it independently of the selected day. On narrow screens it shows one week (the selected day's).
- **Shared editor:** new `HeadingTones` extension (`features.headingTones`), decorations only; `.axon-journal` styles in `editor.css`.
- **Save state** sits in the page header (like the note editor) rather than on the "Standup template" line.
- **Deviation:** no `journalDate` prop on `EntityLink`: nothing renders a note `EntityLink` yet. Journal routing is in `LinkedNotesPanel` (notebook icon) and the `notes/:id` redirect. `NotePickerDialog` uses `fetchNotes`, so journal entries can't be linked manually (mentions only).
- **Reading width** is the design system's 680px (`max-w-170`), not the design's 660.
- **Still to confirm in the browser:** lazy creation (one row on fast typing), dots and paging, the selection animation, heading styles in both themes, mention → linked notes → journal day, the rail contents, Global cards, switching days mid-typing, Clear + Undo and the restore conflict.

**Stop here. Show the result and wait for approval.**

---

## Phase 2: Navigation, Insert and Carry-forward

### Goal
A "Sep 2026" button in the page header opens a mini month with dots on days that have entries, for jumping to any date. "Insert into Today" in the rail appends a bullet list of the day's completed tasks (as task mentions) to the Today section. A day with no entry opens with **Yesterday prefilled from the previous entry's Today** (carry-forward, the user's request 2026-09-26), so the plan written yesterday becomes the starting point for what actually happened.

> **Carry-forward rules (decided 2026-09-26):** Yesterday (the outcome) and Today (the plan) stay independent text: the copy happens **once**, when a day without an entry is opened, and is never kept in sync, so editing one day never rewrites another. The source is the **most recent earlier entry in the same space within 7 days** (Monday carries Friday's plan; a stale plan from weeks ago isn't carried). Like the plain template, nothing is saved until the first edit.

### Before Starting: Confirm Phase 1 Is Approved
1. Phase 1 is `✅ Complete`.
2. Check the current shadcn `calendar` (react-day-picker) props: `modifiers`, `modifiersClassNames`, `weekStartsOn`, `month` / `onMonthChange`.
3. `RichTextEditor` exposes the instance through `onEditorReady(editor)` (confirmed in Phase 1).

### 2.1 Database
No database changes.

### 2.1b API
- `journalKeys.previous(params)`; `fetchPreviousJournalEntry({ spaceId, date, since })` / `usePreviousJournalEntry(params)`: `select('id, journal_date, content')`, live journal rows in the space with `journal_date < date` and `>= since` (`date` − 7 days), `order('journal_date', { ascending: false }).limit(1).maybeSingle()`. `enabled` only when the day has no entry (the page knows after `useJournalEntry` settles).

### 2.2 Utils
Additions to `journal/utils.js`, tested:
- `appendToSection(doc, sectionTitle, nodes)` returns a new doc with `nodes` inserted at the end of the section, before the next level-2 heading. If the section's trailing block is an empty bullet list, it is replaced. If the heading is missing, a new heading and the nodes go at the end.
- `completedTasksToBulletList(tasks, existingMentionIds)` builds a `bulletList` of `listItem > paragraph > taskMention { id, label }`, skipping tasks already mentioned; `null` when nothing is left.
- `getSectionContent(doc, sectionTitle)` returns the blocks between that level-2 heading and the next one, with empty list items and empty paragraphs dropped (an empty list is dropped entirely); `[]` when the heading is missing or the section is blank.
- `buildCarriedTemplate(previousDoc)` returns `JOURNAL_TEMPLATE` with the Yesterday section's empty bullet replaced by `getSectionContent(previousDoc, 'Today')` (mention chips kept, so they sync on the first save). With nothing to carry it returns the plain template.

### 2.3 Components
- **`JournalMonthPopover`** `({ selected, onSelect })`: a header button (`Calendar` icon + "Sep 2026") opens the shadcn `Calendar` with `weekStartsOn`; `modifiers={{ hasEntry }}` from `useJournalDates` for the visible month (follows `onMonthChange`), rendered as a dot. Selecting a day calls `goTo` and closes.
- **"Insert into Today"** (bottom of the rail, space only, design: 34px outline button with `CornerDownLeft`): builds the list from the day's completions, `appendToSection(editor.getJSON(), 'Today', [list])`, then `editor.commands.setContent(newDoc, { emitUpdate: true })` so autosave and mention sync fire. Disabled when there are none; `toast('Nothing new to insert')` when all are already mentioned.

- **Carry-forward** (`JournalEditor`): when `entry` is `null`, wait for `usePreviousJournalEntry` (skeleton meanwhile), then mount the editor with `buildCarriedTemplate(previous?.content)`. The "Standup template" line adds "· Yesterday from Fri 26 Sep" (`formatWeekdayDate`) when something was carried.

### 2.4 Checklist: Before Marking Complete
- [ ] The mini month shows dots for days with entries, follows month navigation, respects week start, and jumping works
- [ ] "Insert into Today" adds mention chips under Today, never duplicates, triggers autosave, and the mentions sync to `note_task_links`
- [ ] A new day's Yesterday is prefilled from the most recent entry's Today (within 7 days, same space); Monday carries Friday; nothing carries from 8+ days back; nothing is saved until the first edit; editing either day never changes the other
- [ ] `appendToSection`, `completedTasksToBulletList`, `getSectionContent` and `buildCarriedTemplate` tests pass
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

# Feature 13: Inbox and Quick Capture

**Product**: Axon, a personal second-brain OS
**File**: `.claude/features/13-inbox-quick-capture.md`
**Status**: ✅ Complete (2026-09-30)
**Depends on**: 12
**Last Updated**: September 2026

---

## Context

Thoughts arrive mid-task: "ask Priya about the checkout API", "book dentist". Today the user has to decide what the thing is and where it goes before Axon will accept it. Quick capture removes that decision: `Ctrl/Cmd+J` opens a textarea anywhere, and `Enter` saves the text to an **inbox**, or directly as a task, todo or note. The Inbox page is where captured items are later triaged: converted, scheduled, moved to another space or discarded. It follows the standard `api.js` pattern with one exception: inbox items may have `space_id = NULL` ("Unsorted"). It reuses the existing create functions and dialogs, `useGlobalDialog` (`?new=capture`), the shortcut registry and `useListNavigation` from Feature 12.

---

## Phase Overview

```
Phase 1: Capture and inbox
  inbox_items table, features/inbox api, QuickCaptureDialog (inbox / task / todo / note), InboxPage with per-row
  convert, schedule, move and discard, sidebar badge, inbox-zero state.

Phase 2: Keyboard triage
  useListNavigation with t/o/n/e/m/d, bulk select with bulk discard and move, Processed tab (last 30 days) with
  links to created entities and Restore.
```

**After each phase, stop and wait for approval.**

---

## Phase 1: Capture and Inbox ✅ Complete (2026-09-30)

> **Folded in before building (2026-09-30):**
> - **No space picker in the capture dialog** (the user's decision, 2026-09-30, keeping the 2026-09-25 no-picker rule over the design's space select).
>   - An **Inbox** capture goes to the current space, or to **Unsorted** (`space_id` null) in Global.
>   - A **Task / Todo / Note** capture goes to `useDefaultSpaceId()`: the current space, else the last or first active one.
>   - The dialog shows the destination as read-only text, and sorting happens in the Inbox (Move to space).
>   - There's no `SpaceSelect` component; Move to space uses a menu.
> - **Capture dialog** (design delta): 560px, types **Inbox · Task · Todo · Note** (no Event), **⇥ cycles the type chips**, ⌘↵ or ↵ submits, and there's **no "Keep capturing" switch**.
> - **Rows** (design delta):
>   - **Kind icon:** derived, not stored: a URL is a bookmark, a leading "?" a question, otherwise an idea.
>   - **Source:** a new `source` column (`quick_capture` | `email` | `api`; only `quick_capture` until Feature 18).
>   - **Action chips:** the focused or hovered row shows **Task T · Todo D · Note N · Event E · Move M · Discard ⌫**. The keys themselves are Phase 2, but the chips are clickable now.
> - **Inbox zero:** says **"You triaged N things today"** (items processed since local midnight), and the page is **760px** wide.
> - **Already there from Feature 12:** `useGlobalDialog` gains `capture`; `capture.open` (`mod+j`) replaces its toast stub; the palette's Quick capture action and the sidebar's Quick capture button are enabled. `TaskDialog` and `EventDialog` already take `initialValues` and `onSuccess(row)`.

### Goal
From anywhere in a space, `Ctrl/Cmd+J`, the palette's "Quick capture" action or the sidebar capture button opens a small dialog. The user types, picks a destination type (Inbox by default, or Task, Todo, Note) and a space ("Unsorted" is allowed for Inbox in Global), and presses `Enter`. With "Keep capturing" on, the dialog clears and stays open for the next thought. The sidebar shows the number of open inbox items. `/s/:slug/inbox` lists them newest first; each row can become a task, todo, note or event, move to another space, or be discarded with Undo. An empty inbox shows a small inbox-zero celebration.

### Before Starting: Confirm With Codebase
1. Feature 12 is complete: `useGlobalDialog`, `GlobalDialogs`, `SHORTCUTS` (with the `capture.open` stub), `useShortcut`, `EntityIcon` and `lib/entityPaths.js` exist.
2. Confirm the create functions and their return values: `createTask` (04), `createTodo` (05), `createNote` (06) and `createEvent` (08) each return the inserted row. Confirm `TaskDialog` and `EventDialog` accept `initialValues` and an `onSuccess(row)` / `onCreated(row)` callback for create. Add them if missing (see 1.5).
3. Confirm how `SpacePickerField` is built (RHF field) and whether a plain controlled `SpaceSelect` exists. The capture dialog needs one that can also offer "Unsorted".
4. MCP `list_tables`: `public.inbox_items` does not exist yet.
5. The `/s/:spaceSlug/inbox` placeholder route and `NavMain` Inbox item from Feature 03 exist.

### 1.1 Database
Migration `create_inbox_items` (from `data-model.md`, with the state check and processed index added there in the same step):

```sql
create table public.inbox_items (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  space_id      uuid,                                   -- NULL = unsorted (captured from Global)
  body          text not null check (char_length(btrim(body)) between 1 and 5000),
  processed_at  timestamptz,
  processed_as  text check (processed_as in ('task','todo','note','event','discarded')),
  processed_ref uuid,                                   -- id of the created entity
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check ((processed_at is null) = (processed_as is null)),
  check (processed_ref is null or processed_as in ('task','todo','note','event')),
  foreign key (space_id, user_id) references public.spaces(id, user_id) on delete cascade
);

create index inbox_open_idx      on public.inbox_items (user_id, created_at desc) where processed_at is null;
create index inbox_processed_idx on public.inbox_items (user_id, processed_at desc) where processed_at is not null;

create trigger inbox_items_updated_at before update on public.inbox_items
  for each row execute function public.set_updated_at();

alter table public.inbox_items enable row level security;

create policy "inbox_items_owner_all" on public.inbox_items
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
```

- `processed_ref` is deliberately **not** an FK: it points at one of four tables. If the created entity is later hard-deleted, the Processed tab (Phase 2) shows "Deleted".
- Inbox items aren't soft-deleted. Discarding is processing (`processed_as = 'discarded'`), so there is no `deleted_at` and inbox items never appear in Trash (Feature 14).

Verify: an insert with a `space_id` owned by another user fails on the composite FK; `processed_as` without `processed_at` fails the check; `space_id` null inserts succeed. Run `get_advisors` (security).

### 1.2 API Layer

**`src/features/inbox/api.js`**

| Export | Details |
|---|---|
| `inboxKeys` | `{ all: ['inbox'], lists: () => ['inbox','list'], list: (params) => ['inbox','list',params], counts: () => ['inbox','count'], count: (params) => ['inbox','count',params] }`; params `{ spaceIds, includeUnsorted }` (Phase 2 adds `tab`) |
| `ITEM_COLUMNS` | `'id, space_id, body, processed_at, processed_as, processed_ref, created_at'` |
| `fetchInboxItems({ spaceIds, includeUnsorted })` | `.is('processed_at', null).order('created_at', { ascending: false })`; scope filter: `includeUnsorted ? q.or(\`space_id.in.(${spaceIds.join(',')}),space_id.is.null\`) : q.in('space_id', spaceIds)` (a shared `applyScope(q, params)` helper in the file) |
| `fetchInboxCount(params)` | `select('id', { count: 'exact', head: true })` with the same filters; returns `count` |
| `captureItem({ body, space_id })` | insert, `.select(ITEM_COLUMNS).single()`; `space_id` may be `null` |
| `processItem(id, { as, ref = null })` | update `{ processed_at: now, processed_as: as, processed_ref: ref }` |
| `moveItem(id, spaceId)` | update `{ space_id: spaceId }` (`null` = Unsorted) |
| `discardItem(id)` | `processItem(id, { as: 'discarded' })` |
| `restoreItem(id)` | update `{ processed_at: null, processed_as: null, processed_ref: null }` |
| `useInboxItems(params)` | `enabled: params.spaceIds?.length > 0` |
| `useInboxCount(params)` | same key shape under `inboxKeys.count`; `staleTime: 60_000` |
| `useCaptureItem()` | invalidates `inboxKeys.all` |
| `useProcessItem()`, `useDiscardItem()`, `useMoveItem()` | **optimistic**: remove the row from every `inboxKeys.lists()` cache and decrement every `inboxKeys.counts()` cache (snapshot and rollback, `axon-data-patterns.md` §3); `onSettled` invalidates `inboxKeys.all`. A move within Global keeps the row and patches `space_id` instead of removing it. |
| `useRestoreItem()` | invalidates `inboxKeys.all` |

Scope params, computed by `useInboxScope()` in `features/inbox/hooks/useInboxScope.js`: inside a space `{ spaceIds: [space.id], includeUnsorted: false }`; in Global `{ spaceIds: activeSpaces ids, includeUnsorted: true }`. Unsorted items are therefore visible only in Global.

**`src/features/inbox/hooks/useConvertInboxItem.js`**: `convert(item, as, values?)` orchestrates the two-step conversion:
1. Create the entity with that feature's plain function: `createTodo({ title, space_id })`, or `createNote({ title, content, content_text, space_id })`. Tasks and events are created by their dialogs, which hand back the row.
2. `processItem(item.id, { as, ref: row.id })`.
3. Invalidate the created feature's root key (`todoKeys.all`, `noteKeys.all`, ...) and `inboxKeys.all`, then toast `Todo created` with an "Open" action (`entityPath`).

The two writes are not atomic. If step 2 fails, the entity exists and the item stays in the inbox; the error toast says so ("Todo created, but the inbox item couldn't be updated").

**`src/features/inbox/utils.js`** (tested):
- `splitCapture(text)` → `{ title, body }`: title = first non-empty line, trimmed, truncated to 300; body = the remaining lines, trimmed (may be `''`).
- `textToDoc(text)` → a Tiptap doc: one `paragraph` per line, blank lines become empty paragraphs, `null` for empty text.
- `captureToNote(text)` → `{ title, content: textToDoc(body), content_text: body }`.

### 1.3 Components

```
src/features/inbox/
├── api.js
├── constants.js                        # CAPTURE_TYPES (inbox|task|todo|note), PROCESSED_LABELS
├── schemas.js                          # captureSchema: body 1–5000, type enum, space_id uuid|null (non-null unless type = inbox)
├── utils.js
├── hooks/
│   ├── useInboxScope.js
│   └── useConvertInboxItem.js
├── components/
│   ├── QuickCaptureDialog.jsx
│   ├── CaptureTypeChips.jsx            # ToggleGroup: Inbox | Task | Todo | Note
│   ├── InboxList.jsx                   # AnimatedList of InboxItemRow + states
│   ├── InboxItemRow.jsx
│   ├── InboxItemActions.jsx            # buttons + overflow DropdownMenu
│   ├── MoveToSpaceMenu.jsx             # DropdownMenu sub/Popover listing active spaces (+ Unsorted in Global)
│   └── InboxZero.jsx                   # celebratory empty state
└── pages/InboxPage.jsx                 # /s/:spaceSlug/inbox
src/components/shared/
└── SpaceSelect.jsx                     # controlled Select of active spaces; optional allowNone + noneLabel ("Unsorted")
```

- **`QuickCaptureDialog`** `({ open, onOpenChange })`:
  - A RHF form with `captureSchema`. The textarea is autofocused and grows up to about 8 rows. `Enter` submits, `Shift+Enter` inserts a newline, `Ctrl/Cmd+Enter` also submits.
  - `CaptureTypeChips` default **Inbox**; the last chosen type is not remembered (Inbox is always the safe default).
  - `SpaceSelect` defaults to the current space, or "Unsorted" in Global. "Unsorted" is offered only when the type is Inbox; choosing Task, Todo or Note with Unsorted selected switches the space to the first active space and focuses the select.
  - On submit, by type:
    - **Inbox** → `captureItem({ body, space_id })`, toast "Captured" with an "Open inbox" action.
    - **Task** → `createTask({ title: splitCapture(body).title, space_id })`; any remaining lines go into `description` via `textToDoc` and `description_text`. Toast "Task created" with "Open".
    - **Todo** → `createTodo({ title: first line, space_id })`. Toast with "Open".
    - **Note** → `createNote({ ...captureToNote(body), space_id })`. Toast with "Open".
  - Direct creates don't touch `inbox_items`. Each invalidates its own feature's root key through that feature's mutation hook.
  - A **"Keep capturing"** switch in the footer (`useLocalStorage('axon:capture:keepOpen', false)`). When on, success resets the body (keeping type and space) and refocuses the textarea; when off, the dialog closes.
  - The submit button shows the pending state and is disabled for blank text. Footer hints use `ShortcutKeys` (`↵` Save, `⇧↵` New line).
  - Motion: dialog default; the type chips cross-fade the submit label ("Save to inbox" / "Create task").
- **`InboxItemRow`** `({ item, showSpace, selected?, onSelect? })`: the body (first three lines, "Show more" expands), `formatRelative(created_at)`, a `SpaceBadge` in Global (an "Unsorted" badge when `space_id` is null), and `InboxItemActions`.
- **`InboxItemActions`** `({ item })`:
  - **To task**: opens `TaskDialog` with `initialValues={{ title, description: textToDoc(body), space_id: item.space_id }}` (in Global the dialog's `SpacePickerField` is prefilled, required when the item is Unsorted). `onSuccess(row)` → `processItem(item.id, { as: 'task', ref: row.id })`.
  - **To todo**: direct `convert(item, 'todo')`. For an Unsorted item it first opens `MoveToSpaceMenu` as a picker ("Create in…").
  - **To note**: direct `convert(item, 'note')` using `captureToNote`. It stays on the inbox; the toast has "Open".
  - **Schedule**: opens `EventDialog` with `initialValues={{ title, description: body rest, space_id }}` and a start of the next full hour. `onSuccess(row)` → `processItem(..., { as: 'event', ref: row.id })`.
  - **Move to space**: `MoveToSpaceMenu` → `moveItem`. Inside a space, moving elsewhere removes the row (animated); toast "Moved to Personal".
  - **Discard**: `discardItem`, toast "Discarded" with Undo → `restoreItem`. No confirm (it's reversible).
  - Icon-only buttons have `aria-label` and a Tooltip. On narrow widths only To task and the overflow menu are visible.
- **`InboxList`**: loading shows 4 skeleton rows; error shows `ErrorState` with retry; empty shows `InboxZero`; data renders `AnimatedList` (`AnimatePresence initial={false}`, `layout`, `listItem` preset), so processed rows animate out.
- **`InboxZero`**: an `EmptyState` variant with a check-in-circle icon that scales in with `springSnappy` and a subtle `fadeIn` title "Inbox zero". The description is "Everything is sorted. Capture anything with Ctrl J." (the key via `ShortcutKeys id="capture.open"`), and the action is "Quick capture".
- **`InboxPage`**: `usePageHeader({ title: 'Inbox', actions: <Button>Capture</Button> })`, then `InboxList` with `useInboxScope()`. Wrapped in `PageTransition`.

### 1.4 Routes and Integration
- `router.jsx`: `/s/:spaceSlug/inbox` → `features/inbox/pages/InboxPage` (replaces the placeholder).
- `useGlobalDialog` gains the kind `capture`. `GlobalDialogs` renders `<QuickCaptureDialog open={kind === 'capture'} onOpenChange={close} />`.
- `useGlobalShortcuts`: `capture.open` (`mod+j`, allowed in inputs) → `open('capture')`, replacing the Feature 12 stub.
- Palette Actions: "Quick capture" is enabled and opens `capture`.
- `NavMain`: the Inbox item shows a count badge from `useInboxCount(useInboxScope())` (hidden at 0; "99+" above 99). A capture icon button (`Plus`, Tooltip "Quick capture" with keys) sits at the right of the sidebar group label, or in the header when collapsed.

### 1.5 Impact on Existing Features
| Existing feature | Impact | Action |
|---|---|---|
| 04 TaskDialog | Prefill from an inbox item and receive the created row | Add `initialValues` and `onSuccess(row)` for create if missing |
| 08 EventDialog | Same | Same |
| 05 / 06 api | Called directly from capture and convert | Confirm `createTodo` / `createNote` accept `space_id` and return the row |
| 03 NavMain / AppSidebar | Badge and capture button | Add |
| 12 GlobalDialogs, shortcuts, palette | `capture` kind, `mod+j`, action un-stubbed | Wire |
| 12 SpacePickerField | Needs a non-form sibling with "Unsorted" | New `SpaceSelect` in `components/shared/` |

### 1.6 Not in This Phase
- Keyboard triage, bulk actions and the Processed tab (Phase 2)
- Parsing dates, priorities or `#tags` out of captured text: Feature 17 (AI) or backlog
- Inbound email to inbox: Feature 18
- Browser extension, share target and mobile capture: Feature 20
- Attachments on captured items: Feature 15

### 1.7 Checklist: Before Marking Complete
- [x] Migration applied and mirrored; advisors clean; the FK and check verifications pass
- [x] `mod+j` opens capture from any in-space page, including while typing in the editor; the palette action and sidebar button open it too
- [x] `Enter` saves, `Shift+Enter` adds a newline; blank text can't be submitted
- [x] Inbox capture in Global goes to Unsorted; inside a space, to that space (no picker; the destination is shown)
- [x] Task, Todo and Note types create the entity directly (first line = title; the rest = the description or note body) and create no inbox row
- [ ] ~~"Keep capturing"~~ removed by the design delta
- [x] The sidebar badge counts open items for the current scope and updates optimistically on process, discard and move *(confirm in the browser)*
- [x] In a space the page lists only that space's items; Global lists all active spaces' items plus Unsorted, with badges
- [x] To task and Event open prefilled dialogs; the item is processed only after the dialog succeeds, with `processed_ref` set
- [x] To todo and To note create directly; an Unsorted item goes to the default space (no pickers, the user's decision)
- [x] Discard animates the row out and Undo restores it; Move to another space animates it out of a space's inbox
- [x] Inbox zero shows after the last item is processed, with "You triaged N things today"
- [x] Tests pass for `splitCapture`, `captureToNote` / `captureToTask`, `itemKind` and `captureSchema`
- [x] `npm run lint`, `npm test` and `npm run build` pass
- [x] `axon-rules` audit is clean for the changed files
- [x] `00-index.md` status, DB registry (`inbox_items` ✅) and changelog are updated; `axon-data-patterns.md` §10 too

### Implementation Notes (2026-09-30)
- **Migration `20260930120508_create_inbox_items`:** as planned, plus `source` (the design delta), `unique (id, user_id)` and `inbox_space_idx`.
  - Rolled-back checks (6/6): another user's space is refused by `inbox_items_space_id_user_id_fkey`; `processed_as` without `processed_at` fails; a `processed_ref` on a discard fails; an unknown `source` fails; a null space inserts; a second user sees 0 rows.
  - Advisors: only the 3 existing warnings.
- **API** (`features/inbox/api.js`):
  - Scope comes from `applyScope`: the space ids, or `or(space_id.in…, space_id.is.null)` in Global.
  - `useProcessItem`, `useDiscardItem` and `useMoveItem` share one optimistic helper that drops the row from every cached list and decrements every count. For a move, a list that still covers the target (Global) patches `space_id` instead.
  - `useTriagedCount` counts items processed since local midnight, for inbox zero.
- **Capture** (`QuickCaptureDialog`, 560px):
  - Types go through a `SegmentedControl`; Tab and Shift+Tab in the textarea cycle them, and Enter (or the button) submits.
  - The destination shows as "→ Inbox · THMP", "→ Inbox · Unsorted", or the space for a task, todo or note (`useDefaultSpaceId`).
  - A direct task gets `captureToTask` (first line the title, the rest a paragraph description).
  - Errors come from the mutation hooks' toasts, and the dialog keeps the text.
- **`itemKind`:** a URL is a link, and a leading "?" is a question. **Deviation:** a first line ending in "?" also counts as a question.
- **Inbox page** (760px): rows as cards showing the kind icon, text (three lines, then Show more), "2h ago · Quick capture" and the space or an Unsorted badge.
  - **Action chips** show on hover or focus-within (always on phones): Task, Todo, Note, Event, Move, and Discard (`destructive` icon button).
  - **Key hints on the chips wait for Phase 2,** which binds T/D/N/E/M/⌫, so the page never shows keys that do nothing.
  - **Conversion:** Task and Event open `TaskDialog` / `EventDialog` prefilled (in the item's space, else the default), and `onSuccess(row)` processes the item. Todo and Note go through `useConvertInboxItem` (plain create, then `processItem`; non-atomic, with the toast saying so).
- **Wiring:** `useGlobalDialog` gains `capture`, and `GlobalDialogs` renders the dialog. `capture.open` (⌘J) opens it; the palette's Quick capture action and the sidebar's button (with `ShortcutKeys`) are enabled. The sidebar's Inbox item shows the open count (`SidebarMenuBadge`, "99+" above 99).
- **Not built:** `SpaceSelect` (no pickers) and `CaptureTypeChips` (`SegmentedControl` does it).
- **Tests:** `inbox/utils.test.js` (5) and `QuickCaptureDialog.test.jsx` (4: an inbox capture with Shift+Enter, Unsorted in Global, Tab to Task with title and description, Shift+Tab to Note with blank disabled). Full suite: 523/523.
- **Still to confirm in the browser:** ⌘J from the editor; each conversion (task and event through their dialogs, then the item disappears); Move and Discard with Undo; the sidebar badge; inbox zero with the triaged count.

**Stop here. Show the result and wait for approval.**

---

## Phase 2: Keyboard Triage ✅ Complete (2026-09-30)

### Goal
The user can clear an inbox without the mouse: `j`/`k` to move, then `t` task, `o` todo, `n` note, `e` event, `m` move, `d` discard. `x` or `Shift+click` selects several rows for a bulk discard or move. A **Processed** tab shows everything handled in the last 30 days, with what it became, a link to the created entity, and Restore.

### Before Starting: Confirm Phase 1 Is Approved
1. Phase 1 is `✅ Complete`.
2. `useListNavigation` (12) accepts arbitrary action ids and enables the `list` scope; the Create-group conflict rule works.
3. `EntityLink` (07) handles tasks and notes. Decide whether it takes `todo` and `event` too, or whether the Processed row uses a plain `Link` with `EntityIcon` and `entityPath` for those.

### 2.1 Database
No database changes. `inbox_processed_idx` was created in Phase 1.

### 2.2 API Layer
Additions to `src/features/inbox/api.js`:

| Export | Details |
|---|---|
| `fetchProcessedItems({ spaceIds, includeUnsorted, since })` | `.not('processed_at', 'is', null).gte('processed_at', since).order('processed_at', { ascending: false }).limit(200)`; `since` = `subDays(now, 30)` ISO, computed by the hook |
| `useProcessedItems(params)` | key `inboxKeys.list({ ...params, tab: 'processed' })` |
| `discardItems(ids)` / `useDiscardItems()` | one update with `.in('id', ids)`; optimistic removal of all ids; Undo → `restoreItems(ids)` |
| `moveItems(ids, spaceId)` / `useMoveItems()` | one update with `.in('id', ids)`; optimistic |
| `restoreItems(ids)` / `useRestoreItems()` | clears the three processed columns |

**`src/features/inbox/hooks/useInboxTab.js`**: `?tab=open|processed` (default `open`) via `useSearchParams`, `replace: true`.

**`src/features/inbox/hooks/useInboxSelection.js`**: `{ selectedIds: Set, toggle(id), toggleRange(id), clear(), isSelected(id) }`. `toggleRange` selects from the last toggled row to `id` in display order (for `Shift+click`). Selection clears on tab change, scope change and after a bulk action.

Registry additions in `src/lib/shortcuts.js` (group `Inbox`, scope `list`):

| id | keys | label |
|---|---|---|
| `inbox.toTask` | `t` | Convert to task |
| `inbox.toTodo` | `o` | Convert to todo |
| `inbox.toNote` | `n` | Convert to note |
| `inbox.schedule` | `e` | Schedule as event |
| `inbox.move` | `m` | Move to space |
| `inbox.discard` | `d` | Discard |
| `inbox.select` | `x` | Select |

The shared list entries (`list.next`, `list.prev`, `list.open`, `list.clear`) are reused. On the inbox, `x` maps to `inbox.select` instead of `list.toggle`; the registry test allows the same key in the same scope only when the ids belong to different list contexts (`context: 'inbox'` vs the default).

### 2.3 Components

```
src/features/inbox/components/
├── InboxTabs.jsx                 # Tabs: Open (count) | Processed
├── InboxBulkBar.jsx              # sticky bar: "N selected · Move to… · Discard · Clear"
├── ProcessedList.jsx
└── ProcessedItemRow.jsx
```

- **`InboxList`** now calls `useListNavigation({ items, actions })`. The actions map ids to the same handlers as `InboxItemActions`, which are exposed through a shared `useInboxItemActions(item)` hook so buttons and keys can't drift. `m` opens `MoveToSpaceMenu` anchored to the selected row; `d` discards and selection moves to the next row.
- **Bulk:** `InboxItemRow` shows a checkbox on hover, on focus and whenever any row is selected. Click toggles, `Shift+click` toggles a range, `x` toggles the keyboard-selected row. With a selection, `d` and `m` act on the whole set, and **`InboxBulkBar`** slides up (`slideUp` preset) with Move to… and Discard. Bulk discard toasts "Discarded 5 items" with Undo.
- **`ProcessedItemRow`** `({ item })`: body (one line), a label from `PROCESSED_LABELS` ("Became a task", "Discarded"), `formatRelative(processed_at)`, a link to the created entity (`EntityLink`, or `EntityIcon` plus `Link` via `entityPath`; the title is fetched lazily only if `EntityLink` needs it), and a **Restore** button → `restoreItem`, toast "Back in inbox". Restoring a converted item does **not** delete the created entity; the toast says "The task stays where it is".
- **`ProcessedList`**: skeleton, `ErrorState`, empty ("Nothing processed in the last 30 days"), and data states. Rows grouped under Today / Yesterday / Earlier.
- `ShortcutsHelpDialog` shows the new `Inbox` group automatically from the registry.

### 2.4 Routes and Integration
- `InboxPage` renders `InboxTabs`, then `InboxList` or `ProcessedList` according to `useInboxTab()`. The page header count reflects the open tab.
- No new routes.

### 2.5 Impact on Existing Features
| Existing feature | Impact | Action |
|---|---|---|
| 12 `lib/shortcuts.js` | New `Inbox` group and `context` field | Add entries; extend the registry test |
| 12 `useListNavigation` | Used with inbox action ids | None if the Phase 1 design holds |
| 07 EntityLink | Used for processed links | Extend to todo/event only if cheap; otherwise the plain link fallback |

### 2.6 Not in This Phase
- Snooze ("remind me tomorrow") and reminders: Feature 16
- Auto-rules that route captured items to spaces: Feature 18
- Processed history beyond 30 days in the UI (rows stay in the table): backlog

### 2.7 Checklist: Before Marking Complete
- [x] With a row selected, `t` opens a prefilled `TaskDialog`, `d` and `n` convert directly, `e` opens `EventDialog`, `m` opens the move menu, `⌫` discards; selection then moves to the next row (the design delta's keys, replacing `o`/`d`)
- [x] While an inbox row is selected, the global `n` and `e` don't fire (the inbox scope overrides them); after `Esc` they do. (`t` has no global binding, and `c` still creates a task, harmlessly.)
- [x] `x`, click and `Shift+click` build a multi-selection; the bulk bar discards or moves all of them in one request, with Undo for discard
- [x] Processed tab lists the last 30 days, newest first, with the right label and a link to each created entity (a deleted target shows its own "doesn't exist or is in Trash" page)
- [x] Restore returns an item to Open and leaves the created entity untouched ("The task stays where it is")
- [x] `?tab=processed` survives a reload; selection clears on tab or scope change
- [x] Tests pass for `useInboxSelection` (toggle, range, clear, dropped ids) and the triage keys (`InboxList`)
- [x] `npm run lint`, `npm test` and `npm run build` pass
- [x] `axon-rules` audit is clean for the changed files
- [x] `00-index.md` status and changelog are updated

### Implementation Notes (2026-09-30)
- **Keys** (the design delta, not this plan's `o`/`d`): T task, D todo, N note, E event, M move, ⌫ discard, X pick. They're registry entries in a new **`inbox` scope** (group Inbox), on only while a row is selected, and the existing override rule makes them win over the global `n` and `e`.
  - **Deviation:** there's no `context` field on the registry. A separate scope was simpler, and `j`/`k`/Esc come from `useListNavigation` as on other lists.
- **`useInboxActions`:** one place for every action (`run(kind, item, extra)`, `bulk.discard` / `bulk.move`, the task/event `dialog` and `processed(as)`), used by the chips, the keys and the bulk bar.
  - `InboxConvertDialogs` holds the task and event dialogs.
  - `useOptimisticRemoval` in `api.js` now takes `ids` as well as `id`, so bulk discard and move are optimistic too.
- **`InboxList`:** J/K selection (`useListNavigation`), picks (`useInboxSelection`), the triage keys and `InboxBulkBar` (sticky, `slideUp`).
  - With picks, ⌫ and M act on the whole set; M opens the bar's move menu, or the row's with no picks. Both menus are now controllable (`open`/`onOpenChange`).
  - `MoveToSpaceMenu` takes `current` (`undefined` = none) instead of `item`.
  - The list is keyed on the scope, so a space switch starts fresh.
- **Rows:** the kind icon swaps to a checkbox on hover or focus, or when anything is picked. Click toggles and Shift+click picks a range. The chips show their keys now that they're bound.
- **Processed** (`ProcessedList`): the last 30 days from local midnight, grouped Today / Yesterday / Earlier.
  - Each row shows "Became a task · 2h ago", an **Open task** link (`EntityIcon` plus `entityPath`, for all four kinds) and **Restore**.
  - **Deviation:** there's no "Deleted" lookup. A deleted target's page already says it's gone or in Trash.
  - The tab is `?tab=processed` (`useInboxTab`).
- **Tests:** `useInboxSelection.test.js` (4) and `InboxList.test.jsx` (3: the triage keys only with a selection; X picks, then ⌫ bulk-discards; Shift+click range). Full suite: 530/530.
- **Still to confirm in the browser:** the keys on real items (T and E open the dialogs, which close back to the list); M's menu; the bulk bar's Move and Discard with Undo; Restore from Processed; `?tab=processed` after a reload.

**Stop here. Show the result and wait for approval.**

---

## Data Model Summary (after all phases)

```
auth.users 1 ── n inbox_items
spaces     1 ── n inbox_items (space_id nullable = Unsorted; cascade on space delete)
inbox_items.processed_ref ··► tasks | todos | notes | events (logical reference, no FK)
```

### `inbox_items`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `user_id` | uuid | default `auth.uid()` |
| `space_id` | uuid | nullable; composite FK to `spaces(id, user_id)` |
| `body` | text | 1–5000 characters after trim |
| `processed_at` | timestamptz | null = open |
| `processed_as` | text | task, todo, note, event, discarded; null exactly when `processed_at` is null |
| `processed_ref` | uuid | created entity id; null for discarded |
| `created_at` / `updated_at` | timestamptz | `updated_at` trigger |

Indexes: `inbox_open_idx (user_id, created_at desc) where processed_at is null`, `inbox_processed_idx (user_id, processed_at desc) where processed_at is not null`.

## Out of Scope (All Phases)
- Inbound email capture: Feature 18
- Browser extension, PWA share target, mobile widgets: Feature 20
- AI parsing of captured text into tasks, dates and tags: Feature 17
- Voice capture and attachments: Features 20 and 15
- Soft delete and Trash for inbox items: by design (discard is the reversible state)

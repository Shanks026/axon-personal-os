# Feature 12: Command Palette, Search and Shortcuts

**Product**: Axon, a personal second-brain OS
**File**: `.claude/features/12-command-palette.md`
**Status**: 🔵 Planned
**Depends on**: 11
**Last Updated**: September 2026

---

## Context

By Feature 11 Axon holds tasks, todos, notes, journal entries, events and reports across several spaces, but the only way to find anything is to open the right section and filter it. This feature adds one `Ctrl/Cmd+K` palette that searches everything in scope (through a single `search_all` RPC), runs actions (create, switch space, navigate), and a keyboard layer driven by one shortcut registry. It reuses `scopeSpaceIds`, `useSpacePaths`, `SpaceBadge`, the shadcn `command` component (`cmdk`) and `react-hotkeys-hook`, and adds no new React context: global create dialogs open through a `?new=` search param.

---

## Phase Overview

```
Phase 1: Search RPC and palette
  search_all() RPC, features/search api + hooks, CommandPalette (recent, actions, navigate, switch space, results),
  GlobalDialogs driven by ?new=task|todo|note|event, recent-entity memory.

Phase 2: Keyboard shortcuts
  lib/shortcuts.js registry, useShortcut, global bindings and g-sequences, useListNavigation for task and todo lists,
  ShortcutsHelpDialog, ShortcutKeys (Kbd) and a Mac/Windows modifier helper.
```

**After each phase, stop and wait for approval.**

---

## Phase 1: Search RPC and Palette

### Goal
From any page inside a space the user presses `Ctrl/Cmd+K` (or clicks "Search" in the sidebar) and gets a palette that:
- Shows **Recent** (last 8 opened entities), **Actions** (New task, New todo, New note, New event, Quick capture, Toggle theme, Go to settings), **Navigate** (every section) and **Switch space** (Global plus active spaces) when the query is empty.
- After 2+ characters, shows **search results** grouped by type (Tasks, Notes, Journal, Todos, Events, Reports), with type icons, matched text highlighted, a snippet, and a `SpaceBadge` when searching Global.
- Has a scope chip, "This space" or "Global", defaulting to the current scope.
- Opens the selected item with `Enter`, and shows footer hints (`↑↓` move, `↵` open, `Esc` close).

"New task" and friends open the matching create dialog anywhere in the app through `?new=<kind>`.

### Before Starting: Confirm With Codebase
1. Features 04–11 are complete. Confirm the exact names and props of the create dialogs: `TaskDialog` (04), the todo create surface (05, dialog or inline input), note creation (06: `useCreateNote` then navigate, or a dialog), `EventDialog` (08). Record the real names in Implementation Notes.
2. `src/hooks/useDebouncedValue.js`, `src/hooks/useLocalStorage.js`, `useSpacePaths`, `SpaceBadge`, `ThemeProvider`/`useTheme` and `src/components/ui/command.jsx` exist. Check the current shadcn `CommandDialog` API (it may need `shouldFilter`, `title`, `description` props for a11y).
3. Supabase MCP `list_tables`: `tasks.search`, `notes.search`, `reports.search` (generated tsvector) and the `*_title_trgm` GIN indexes exist; `list_extensions` shows `pg_trgm` in schema `extensions`.
4. Check whether Feature 07 already created an entity-to-URL helper (inside `EntityLink`). If so, lift it into `src/lib/entityPaths.js` below instead of writing a second one.
5. Confirm whether Feature 05 supports a `?highlight=<id>` param on the todos page and Feature 08 an `?event=<id>` param on the calendar. If not, they are added here (see 1.5).

### 1.1 Database
Migration `create_search_all`:

```sql
-- reports had no title trigram index; prefix typing on report titles needs one
create index if not exists reports_title_trgm on public.reports using gin (title extensions.gin_trgm_ops);

create or replace function public.search_all(
  p_query          text,
  p_space_ids      uuid[],
  p_limit          int     default 20,
  p_include_global boolean default false      -- also match reports with space_id is null
)
returns table (
  entity_type text,          -- task | note | journal | todo | event | report
  id          uuid,
  space_id    uuid,          -- null only for Global reports
  title       text,
  snippet     text,          -- ts_headline with U+E000 / U+E001 around matches
  status      text,          -- per type, see below
  rank        real,
  updated_at  timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  with q as (
    select
      btrim(p_query) as raw,
      websearch_to_tsquery('english', btrim(p_query)) as tsq,
      '%' || replace(replace(replace(btrim(p_query), '\', '\\'), '%', '\%'), '_', '\_') || '%' as pat,
      replace(replace(replace(btrim(p_query), '\', '\\'), '%', '\%'), '_', '\_') || '%' as prefix
    where char_length(btrim(coalesce(p_query, ''))) >= 2
  ),
  hits as (
    select 'task'::text as entity_type, t.id, t.space_id, t.title, t.description_text as body,
           t.status, t.updated_at,
           greatest(ts_rank(t.search, q.tsq), extensions.similarity(t.title, q.raw))
             + (case when t.title ilike q.prefix then 0.5 else 0 end)::real as rank
      from public.tasks t, q
     where t.deleted_at is null
       and t.space_id = any (p_space_ids)
       and (t.search @@ q.tsq or t.title ilike q.pat or t.title operator(extensions.%) q.raw)
    union all
    select case when n.kind = 'journal' then 'journal' else 'note' end, n.id, n.space_id, n.title, n.content_text,
           case when n.kind = 'journal' then n.journal_date::text end, n.updated_at,
           greatest(ts_rank(n.search, q.tsq), extensions.similarity(n.title, q.raw))
             + (case when n.title ilike q.prefix then 0.5 else 0 end)::real
      from public.notes n, q
     where n.deleted_at is null
       and n.space_id = any (p_space_ids)
       and (n.search @@ q.tsq or n.title ilike q.pat or n.title operator(extensions.%) q.raw)
    union all
    select 'report', r.id, r.space_id, r.title, r.content_text, r.status, r.updated_at,
           greatest(ts_rank(r.search, q.tsq), extensions.similarity(r.title, q.raw))
             + (case when r.title ilike q.prefix then 0.5 else 0 end)::real
      from public.reports r, q
     where r.deleted_at is null
       and (r.space_id = any (p_space_ids) or (p_include_global and r.space_id is null))
       and (r.search @@ q.tsq or r.title ilike q.pat or r.title operator(extensions.%) q.raw)
    union all
    select 'todo', d.id, d.space_id, d.title, null::text,
           case when d.is_done then 'done' else 'open' end, d.updated_at,
           extensions.similarity(d.title, q.raw)
             + (case when d.title ilike q.prefix then 0.5 else 0 end)::real
      from public.todos d, q
     where d.deleted_at is null
       and d.task_id is null                      -- checklist items are found through their task
       and d.space_id = any (p_space_ids)
       and (d.title ilike q.pat or d.title operator(extensions.%) q.raw)
    union all
    select 'event', e.id, e.space_id, e.title, e.description,
           to_char(e.starts_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), e.updated_at,
           extensions.similarity(e.title, q.raw)
             + (case when e.title ilike q.prefix then 0.5 else 0 end)::real
      from public.events e, q
     where e.deleted_at is null
       and e.space_id = any (p_space_ids)
       and (e.title ilike q.pat or e.title operator(extensions.%) q.raw)
  ),
  top as (
    select * from hits
     order by rank desc, updated_at desc
     limit least(greatest(coalesce(p_limit, 20), 1), 50)
  )
  select h.entity_type, h.id, h.space_id, h.title,
         case
           when coalesce(h.body, '') = '' then null
           when h.entity_type in ('task', 'note', 'journal', 'report') then
             ts_headline('english', left(h.body, 20000), q.tsq,
               'MaxFragments=1, MaxWords=18, MinWords=6, ShortWord=2, StartSel=' || chr(57344) || ', StopSel=' || chr(57345))
           else left(h.body, 140)
         end,
         h.status, h.rank::real, h.updated_at
    from top h, q
   order by h.rank desc, h.updated_at desc;
$$;

revoke execute on function public.search_all(text, uuid[], int, boolean) from anon;
```

- `status` carries per-type metadata: task status, report status, `open`/`done` for todos, the ISO `journal_date` for journal rows and the ISO UTC `starts_at` for events. The client needs the last two to build URLs.
- `ts_headline` runs only on the limited `top` set, never on every hit. Snippets use private-use markers (U+E000/U+E001), never HTML, so the client renders `<mark>` itself without `dangerouslySetInnerHTML`.
- ts_headline reads the first 20,000 characters of a body. Matches beyond that still rank, but the snippet falls back to the opening text.

Verify with `execute_sql` (as an authenticated user via `set local role authenticated; set local request.jwt.claims = ...`):
- `'ma'` finds a task titled "Marketplace header" (prefix, ranks first), `'marketplace checkout'` finds notes by body, `'mrktplace'` finds it by trigram.
- Soft-deleted rows and other spaces' rows never appear; a Global report appears only with `p_include_global = true`.
- A 1-character query returns zero rows. `explain analyze` on a realistic query uses the GIN indexes.
- Run `get_advisors` (security).

### 1.2 API Layer

**`src/features/search/api.js`**

| Export | Details |
|---|---|
| `searchKeys` | `{ all: ['search'], results: (params) => ['search', 'results', params] }`, params `{ q, spaceIds, includeGlobal }` |
| `searchAll({ q, spaceIds, includeGlobal, limit = 20 })` | `supabase.rpc('search_all', { p_query: q, p_space_ids: spaceIds, p_limit: limit, p_include_global: includeGlobal })`, unwrap, return rows |
| `useSearch({ q, spaceIds, includeGlobal })` | `const debounced = useDebouncedValue(q.trim(), 150)`; `useQuery({ queryKey: searchKeys.results({ q: debounced, spaceIds, includeGlobal }), queryFn, enabled: debounced.length >= 2 && spaceIds?.length > 0, placeholderData: keepPreviousData, staleTime: 10_000 })`. Returns the query plus `isDebouncing: debounced !== q.trim()`. |

No mutations. Search results are never invalidated by other features; the 10s stale time is enough.

**`src/lib/entityPaths.js`** (pure, no React): `entityPath({ entity_type, id, space_id, status }, slugFor)` where `slugFor(spaceId)` returns a slug (`'global'` for a null space). It returns:
- task → `paths.space(slug).task(id)`, note → `.note(id)`, report → `.report(id)`
- journal → `.journal(status)` (the journal date)
- todo → `.todos() + '?highlight=' + id`
- event → `.calendar({ view: 'day', date: toISODate(status) }) + '&event=' + id`

**`src/lib/recent.js`** (pure; every `localStorage` access in try/catch): key `axon:recent`; `readRecent()`, `pushRecent(entity)` (dedupes on `entity_type + id`, newest first, caps at 8, stores `{ entity_type, id, space_id, title, status, openedAt }`), `removeRecent(entity_type, id)`.

**`src/hooks/useRecordRecent.js`**: `useRecordRecent(entity)` calls `pushRecent` in an effect when `entity?.id` changes. Called by detail pages (see 1.5).

**`src/hooks/useGlobalDialog.js`**: `{ kind, open(kind, extra?), close() }` over `useSearchParams`. `open` sets `new=<kind>` (plus optional extra params) with `replace: true`; `close` deletes them. Kinds: `task | todo | note | event` (Feature 13 adds `capture`).

**`src/features/search/utils.js`** (tested): `parseSnippet(s)` → `[{ text, match }]` segments split on U+E000/U+E001; `highlightTitle(title, q)` → the same segment shape for a case-insensitive substring match; `matchesQuery(label, q)` for filtering static palette items; `groupResults(rows)` → ordered `[{ type, label, items }]` (task, note, journal, todo, event, report).

### 1.3 Components

```
src/features/search/
├── api.js
├── constants.js                    # RESULT_GROUPS order + labels, PALETTE_SECTIONS (navigate list)
├── utils.js
├── hooks/
│   └── usePaletteActions.js        # builds Actions / Navigate / Switch space items from useSpacePaths, useSwitchSpace, useTheme, useGlobalDialog
└── components/
    ├── CommandPalette.jsx          # CommandDialog shell, input, scope chip, groups, footer
    ├── PaletteResults.jsx          # grouped server results
    ├── PaletteResultItem.jsx       # icon + highlighted title + snippet + SpaceBadge/status
    ├── PaletteRecent.jsx
    ├── PaletteScopeChip.jsx        # "This space" / "Global" toggle
    └── HighlightedText.jsx         # renders segments with <mark>
src/components/shared/
└── EntityIcon.jsx                  # ({ type, className }) task|note|journal|todo|event|report → lucide icon
src/components/layout/
└── GlobalDialogs.jsx               # reads ?new= and renders the matching create dialog
```

- **`CommandPalette`** `({ open, onOpenChange, initialPage = 'root' })`:
  - Uses `CommandDialog` with `shouldFilter={false}`. Static items are filtered with `matchesQuery`; server results come from `useSearch`.
  - Local state: `q`, `page` (`root | spaces`), `scope` (`space | global`). `scope` resets to the current scope each time the dialog opens. In Global the chip is fixed on "Global".
  - Scope maps to params: `space` → `{ spaceIds: scopeSpaceIds, includeGlobal: false }`; `global` → `{ spaceIds: activeSpaces.map(id), includeGlobal: true }`.
  - Empty query: Recent, Actions, Navigate, Switch space. With `q.length >= 2`: Results first, then matching Actions and Navigate items. With `q.length === 1`: only matching static items.
  - `initialPage="spaces"` opens straight on the Switch space list (used by `mod+shift+s` in Phase 2). `Backspace` on an empty input returns to `root`.
  - Selecting a result or recent item: `navigate(entityPath(row, slugFor))`, `pushRecent(row)`, close. Selecting an action runs it and closes. Recent items whose space is no longer active are hidden.
  - **States:** loading shows three skeleton rows in the Results group (only when there is no `placeholderData`); a thin progress hint while `isFetching || isDebouncing`; error shows an inline `CommandItem` "Search failed, retry" that calls `refetch`; empty shows "No results for "q"" with an action "Create task "q"" that opens `?new=task&title=q`.
  - **Footer:** `↑↓ Navigate · ↵ Open · Esc Close`, plus the scope hint. Keys render with the `ShortcutKeys` component once Phase 2 lands; Phase 1 uses plain `<kbd>` text styled with semantic tokens.
  - **Motion:** the shadcn dialog's own enter and exit; result groups use `listItem` with `AnimatePresence initial={false}`. Nothing else animates.
- **`PaletteResultItem`** `({ row, query, showSpace })`: `EntityIcon`, `HighlightedText` title (journal falls back to `formatDate(status)` when the title is empty), a one-line snippet in `text-muted-foreground`, a task status label or "Done" for todos, and `SpaceBadge` when `showSpace`. `CommandItem value` is `entity_type:id`.
- **Actions** (`usePaletteActions`): New task / todo / note / event → `useGlobalDialog().open(kind)`; Quick capture → disabled with "Coming in Feature 13" until 13 lands; Toggle theme → cycles light/dark; Go to settings → `paths.settings()`. **Navigate** lists Dashboard, Inbox, Tasks, Todos, Notes, Journal, Calendar, Reports, Trash via `useSpacePaths`. **Switch space** uses `useSwitchSpace().switchTo(slug)` (keeps the section).
- **`GlobalDialogs`** (mounted once in `AppLayout`): reads `new` from the URL and renders
  - `task` → `TaskDialog open onOpenChange={close}` with `initialValues={{ title: params.get('title') ?? '' }}`
  - `event` → `EventDialog` (defaults: next full hour, 30 minutes)
  - `todo` → the Feature 05 todo dialog; if 05 only has an inline input, add a small `TodoDialog` in `features/todos/components/` (title, due date, `SpacePickerField` in Global)
  - `note` → in a space: `useCreateNote` then navigate to the new note; in Global: a small dialog with `SpacePickerField`, then the same. Close clears the param on success.
  - An unknown kind is ignored and the param removed.

### 1.4 Routes and Integration
- `AppLayout.jsx` owns `const [palette, setPalette] = useState({ open: false, page: 'root' })` and renders `<CommandPalette>` and `<GlobalDialogs />` once. Phase 1 binds `mod+k` with a plain `useHotkeys` call here (moved to the registry in Phase 2).
- `AppSidebar.jsx` gets a "Search" button (icon plus `Ctrl K` hint) at the top of `NavMain`, calling an `onOpenSearch` prop passed from `AppLayout`.
- Detail pages call `useRecordRecent(entity)`: task detail (07), note editor (06), journal day (09, when an entry exists), report page (11).
- No new routes.

### 1.5 Impact on Existing Features
| Existing feature | Impact | Action |
|---|---|---|
| 03 AppLayout / AppSidebar | Hosts palette and `GlobalDialogs`; Search button | Add state, mount, prop |
| 04 TaskDialog | Prefilled title from the palette | Add an `initialValues` prop for create if missing |
| 05 Todos | Search result opens a todo | Support `?highlight=<id>` (scroll into view, brief highlight via a preset); add `TodoDialog` if absent |
| 06, 07, 09, 11 detail pages | Recent list | Call `useRecordRecent` |
| 07 EntityLink | URL building duplicated | Use `lib/entityPaths.js` |
| 08 Calendar | Search result opens an event | Support `?event=<id>` opening `EventDialog` in edit mode |
| 11 reports | New trigram index | Included in the migration |

### 1.6 Not in This Phase
- The shortcut registry, list keyboard navigation and the help dialog (Phase 2)
- Quick capture (Feature 13; the action is a disabled stub)
- Opening results in a new tab, search filters (`type:` / `in:` operators), saved searches: backlog
- Semantic or AI search (Feature 17)

### 1.7 Checklist: Before Marking Complete
- [ ] Migration applied and mirrored to `supabase/migrations/`; advisors clean; the verification queries above pass
- [ ] `mod+k` opens the palette on every in-space page, including while focus is in an input or the editor
- [ ] Empty query shows Recent, Actions, Navigate and Switch space; typing one character filters static items only
- [ ] Two or more characters show grouped results within ~150ms of the last keystroke, with no flicker between queries (previous data kept)
- [ ] Title matches are highlighted; snippets render `<mark>` from markers with no raw HTML injection
- [ ] In Global every result shows a `SpaceBadge`; the scope chip switches a space search to Global and back
- [ ] Enter opens each entity type at the right URL (journal by date, todo highlighted, event dialog opened)
- [ ] "New task" from the palette opens `TaskDialog` via `?new=task`; closing it removes the param; browser back doesn't reopen it
- [ ] Recent keeps the last 8 opened entities across reloads and survives blocked `localStorage`
- [ ] Tests pass for `parseSnippet`, `highlightTitle`, `matchesQuery`, `groupResults`, `entityPaths`, `recent`
- [ ] `npm run lint`, `npm test` and `npm run build` pass
- [ ] `axon-rules` audit is clean for the changed files
- [ ] `00-index.md` status, DB registry (`search_all`) and changelog (new shared: `EntityIcon`, `GlobalDialogs`, `useGlobalDialog`, `lib/entityPaths.js`, `lib/recent.js`) are updated; `axon-data-patterns.md` §10 lists the new shared components

**Stop here. Show the result and wait for approval.**

---

## Phase 2: Keyboard Shortcuts

### Goal
The app is fully drivable from the keyboard. Every shortcut is defined once in `lib/shortcuts.js`, so the help dialog, tooltips and palette hints can never drift from the real bindings. Global keys create items, jump between sections (`g` then a letter), toggle the sidebar and open the space switcher. The task and todo lists support `j`/`k` selection, `x` to complete, `e` to edit and `Backspace` to delete. `?` shows every shortcut, grouped. Single-letter shortcuts never fire while the user is typing.

### Before Starting: Confirm Phase 1 Is Approved
1. Phase 1 is `✅ Complete`.
2. Check the installed `react-hotkeys-hook` version and its APIs: `useHotkeys(keys, cb, { enableOnFormTags, enableOnContentEditable, preventDefault, scopes, enabled })`, `HotkeysProvider` / `useHotkeysContext` (`enableScope`, `disableScope`, `activeScopes`), the `mod` alias, and whether key **sequences** (`g>d` or similar) are supported. If sequences aren't, implement them in `useKeySequence` (below).
3. Check whether shadcn ships a `kbd` component (`npx shadcn@latest add kbd`). Use it if so; otherwise `ShortcutKeys` renders plain `<kbd>` with semantic tokens.
4. Check the shadcn sidebar's built-in `mod+b` toggle so it isn't registered twice.
5. In Chrome and Edge on Windows, confirm `Ctrl+J` (downloads) and `Ctrl+Shift+S` can be `preventDefault`-ed on a focused page. Record any key that can't, and pick an alternative with the user.
6. Confirm the list components in 04 (`TaskList`/`TaskRow`) and 05 (`TodoList`/`TodoItem`) and how each exposes edit and delete.

### 2.1 Database
No database changes in this phase.

### 2.2 Library and Hooks

**`src/lib/platform.js`** (pure, guards `typeof navigator`): `isMac()` (via `navigator.userAgentData?.platform ?? navigator.platform`), `formatKeys(keys, mac = isMac())` → array of labels (`'mod+shift+s'` → `['⌘','⇧','S']` on Mac, `['Ctrl','Shift','S']` elsewhere; `'g d'` → `['G','then','D']`; `'backspace'` → `['⌫']` / `['Backspace']`).

**`src/lib/shortcuts.js`**: the single source of truth.

```js
// { id, keys, label, group, scope, sequence?, allowInInputs? }
// scope: 'global' | 'list' ; group: 'General' | 'Create' | 'Navigate' | 'Lists'
export const SHORTCUTS = [
  { id: 'palette.open',     keys: 'mod+k',       label: 'Search and commands', group: 'General', scope: 'global', allowInInputs: true },
  { id: 'capture.open',     keys: 'mod+j',       label: 'Quick capture',       group: 'General', scope: 'global', allowInInputs: true }, // wired in 13
  { id: 'space.switch',     keys: 'mod+shift+s', label: 'Switch space',        group: 'General', scope: 'global', allowInInputs: true },
  { id: 'sidebar.toggle',   keys: '[',           label: 'Toggle sidebar',      group: 'General', scope: 'global' },
  { id: 'help.open',        keys: 'shift+slash', label: 'Keyboard shortcuts',  group: 'General', scope: 'global' },
  { id: 'create.task',      keys: 'c', label: 'New task',  group: 'Create', scope: 'global' },
  { id: 'create.note',      keys: 'n', label: 'New note',  group: 'Create', scope: 'global' },
  { id: 'create.todo',      keys: 't', label: 'New todo',  group: 'Create', scope: 'global' },
  { id: 'create.event',     keys: 'e', label: 'New event', group: 'Create', scope: 'global' },
  { id: 'go.dashboard', keys: 'g d', sequence: true, label: 'Go to Dashboard', group: 'Navigate', scope: 'global' },
  // go.inbox 'g i', go.tasks 'g t', go.todos 'g o', go.notes 'g n', go.journal 'g j', go.calendar 'g c', go.reports 'g r'
  { id: 'list.next',   keys: 'j, down',           label: 'Next item',       group: 'Lists', scope: 'list' },
  { id: 'list.prev',   keys: 'k, up',             label: 'Previous item',   group: 'Lists', scope: 'list' },
  { id: 'list.open',   keys: 'enter',             label: 'Open',            group: 'Lists', scope: 'list' },
  { id: 'list.toggle', keys: 'x',                 label: 'Toggle done',     group: 'Lists', scope: 'list' },
  { id: 'list.edit',   keys: 'e',                 label: 'Edit',            group: 'Lists', scope: 'list' },
  { id: 'list.delete', keys: 'backspace, delete', label: 'Move to Trash',   group: 'Lists', scope: 'list' },
  { id: 'list.clear',  keys: 'escape',            label: 'Clear selection', group: 'Lists', scope: 'list' },
]
export const shortcutById = (id) => ...        // throws on an unknown id (dev safety)
export const shortcutsByGroup = () => ...      // ordered groups for the help dialog
```

Test (`src/tests/lib/shortcuts.test.js`): ids are unique; no two entries in the same scope share a key; every `sequence` entry has exactly two keys.

**`src/hooks/useShortcut.js`**: `useShortcut(id, handler, { enabled = true } = {})`. It looks up the entry and calls `useHotkeys` (or `useKeySequence` for `sequence` entries) with `scopes: [entry.scope]`, `preventDefault: true`, and `enableOnFormTags` / `enableOnContentEditable` set to `!!entry.allowInInputs`. It also bails when the event target is inside `[contenteditable="true"]` or `[data-hotkeys-ignore]` and the entry doesn't allow inputs, which covers the Tiptap editor.

**`src/hooks/useKeySequence.js`** (only if the library lacks sequences): listens on `keydown`; after the first key, waits up to 1000ms for the second; ignores repeats, modifiers and typing targets; cleans up its listener and timer.

**`src/hooks/useListNavigation.js`**: shared list keyboard model.

```js
useListNavigation({
  items,                 // current visible rows, in display order
  getId = (r) => r.id,
  actions,               // { 'list.open': (row) => ..., 'list.toggle': ..., 'list.edit': ..., 'list.delete': ... } (any subset; Feature 13 passes its own ids)
  enabled = true,
})
// → { selectedId, setSelectedId, getRowProps(id) }
```

- `selectedId` is local state. When the selected row disappears (deleted or filtered), selection moves to the next row, else the previous, else `null`.
- `j`/`k` from no selection selects the first/last row. Moving calls `scrollIntoView({ block: 'nearest' })` on the row element.
- While `selectedId` is non-null it calls `enableScope('list')`; on clear or unmount it calls `disableScope('list')`.
- `getRowProps(id)` returns `{ 'data-selected': bool, 'aria-selected': bool, ref, onClick }` so a mouse click also sets the selection.
- **Conflict rule:** the single-letter `Create` shortcuts (`c n t e`) are disabled while the `list` scope is active (`useShortcut` checks `activeScopes.includes('list')` for `group === 'Create'`). `Esc` clears the selection and brings them back. The help dialog states this.

**`src/hooks/useGlobalShortcuts.js`**: called once in `AppLayout` with `{ openPalette(page), openHelp, toggleSidebar }`. It binds the `General`, `Create` and `Navigate` entries: `create.*` → `useGlobalDialog().open(kind)`, `go.*` → `navigate(useSpacePaths()[section]())`, `space.switch` → `openPalette('spaces')`, `capture.open` → a no-op with `toast('Quick capture arrives in Feature 13')` until 13.

### 2.3 Components

```
src/components/shared/
├── ShortcutKeys.jsx                # ({ keys | id, className }) → Kbd group from formatKeys
└── ShortcutTooltip.jsx             # ({ id, label?, children }) → Tooltip "label  [keys]"
src/components/layout/
└── ShortcutsHelpDialog.jsx         # ({ open, onOpenChange })
```

- **`ShortcutKeys`**: accepts either a registry `id` or raw `keys`. Renders each label in a `Kbd` (or `<kbd>`), with "then" between sequence keys in `text-muted-foreground`. `aria-label` is the spoken form ("Control K").
- **`ShortcutTooltip`**: wraps an icon button; used on the sidebar Search button, create buttons in page headers and the sidebar toggle.
- **`ShortcutsHelpDialog`**: a shadcn `Dialog` listing `shortcutsByGroup()` in a two-column grid (label left, keys right), with a filter input at the top (autofocused; `matchesQuery`). A footnote explains the typing rule and the list-selection conflict rule. It opens from `?` and from a "Keyboard shortcuts" item in `UserMenu` and the palette's Actions. No motion beyond the dialog default.
- **Palette** footer and Actions now render `ShortcutKeys` for each item that has a registry id.

### 2.4 Routes and Integration
- `App.jsx`: wrap `RouterProvider` in `<HotkeysProvider initiallyActiveScopes={['global']}>`. It is the library's provider, not an app context.
- `AppLayout.jsx`: replace the Phase 1 `useHotkeys('mod+k')` with `useGlobalShortcuts`; own `helpOpen` state; mount `ShortcutsHelpDialog`.
- `SpaceSwitcher.jsx`: show `ShortcutKeys id="space.switch"` as its hint (final value for the Feature 03 placeholder).
- Tasks list (04, list view only) uses `useListNavigation` with: open → task detail; toggle → status `done` ↔ `todo` through the optimistic status mutation; edit → `TaskDialog` with the task; delete → soft delete plus Undo toast.
- Todos list (05) uses it with: open/edit → inline title edit; toggle → optimistic `is_done`; delete → soft delete plus Undo toast.
- Selected rows get a visible selection style through `data-selected` (semantic `bg-accent` until the design system defines it). Selection is keyboard-only state and isn't stored in the URL.

### 2.5 Impact on Existing Features
| Existing feature | Impact | Action |
|---|---|---|
| 01 App.jsx | `HotkeysProvider` | Add around the router |
| 03 AppLayout, SpaceSwitcher, UserMenu | Global shortcuts, help dialog, hints | Wire `useGlobalShortcuts`, mount dialog, add menu item |
| 04 TaskList / TaskRow | Keyboard selection | Spread `getRowProps`, pass actions |
| 05 TodoList / TodoItem | Keyboard selection | Same |
| 06, 07, 09, 11 editors | Letters must type normally | Verify the contenteditable guard; add `data-hotkeys-ignore` on any custom input that needs it |
| 12 Phase 1 palette | Key hints | Swap `<kbd>` text for `ShortcutKeys` |

### 2.6 Not in This Phase
- User-customisable key bindings: backlog
- Keyboard navigation on the kanban board, calendar grid and notes grid: backlog (the hook is reusable)
- Inbox triage keys (Feature 13 Phase 2)
- Quick capture behaviour behind `mod+j` (Feature 13)

### 2.7 Checklist: Before Marking Complete
- [ ] Every binding in the app comes from `SHORTCUTS`; a grep finds no `useHotkeys` call outside `useShortcut` and `useKeySequence`
- [ ] `c`, `n`, `t`, `e` open the right create flow; typing those letters in any input, textarea or the Tiptap editor never triggers them
- [ ] `mod+k` and `mod+shift+s` work from inside an input and the editor; `mod+shift+s` opens the palette on the Switch space page
- [ ] `g` then `d/i/t/o/n/j/c/r` navigates to each section in the current scope; a stray `g` followed by nothing does nothing after 1s
- [ ] `[` toggles the sidebar, and the built-in `mod+b` still works without double toggling
- [ ] On the tasks list: `j`/`k` move a visible selection that scrolls into view, `x` completes with an optimistic update, `e` opens `TaskDialog`, `Backspace` moves to Trash with Undo, `Esc` clears
- [ ] With a row selected, `e` edits rather than creating an event; after `Esc`, `e` creates an event again
- [ ] The same list keys work on the todos list
- [ ] `?` opens the help dialog, grouped and filterable, showing `⌘` on macOS and `Ctrl` on Windows
- [ ] Tests pass for `platform.formatKeys`, the `shortcuts` registry invariants and `useListNavigation` (renderHook with user-event: move, wrap-less bounds, selection after removal)
- [ ] `npm run lint`, `npm test` and `npm run build` pass
- [ ] `axon-rules` audit is clean for the changed files
- [ ] `00-index.md` status and changelog (new shared: `ShortcutKeys`, `ShortcutTooltip`, `ShortcutsHelpDialog`, `useShortcut`, `useListNavigation`, `lib/shortcuts.js`, `lib/platform.js`) are updated; `axon-data-patterns.md` §10 too

**Stop here. Show the result and wait for approval.**

---

## Data Model Summary (after all phases)

```
search_all(p_query, p_space_ids, p_limit, p_include_global)   security invoker, read-only
  ├── tasks        search tsvector + title trigram
  ├── notes        search tsvector + title trigram   (kind note → 'note', journal → 'journal')
  ├── reports      search tsvector + title trigram   (space_id null when p_include_global)
  ├── todos        title ilike / trigram             (standalone only)
  └── events       title ilike / trigram
```

### `search_all` result row
| Column | Type | Notes |
|---|---|---|
| `entity_type` | text | task, note, journal, todo, event, report |
| `id` | uuid | entity id |
| `space_id` | uuid | null only for Global reports |
| `title` | text | may be empty for journal entries |
| `snippet` | text | `ts_headline` with U+E000/U+E001 markers; description prefix for events |
| `status` | text | task/report status, todo `open`/`done`, journal date, event `starts_at` (ISO UTC) |
| `rank` | real | `greatest(ts_rank, similarity)` + 0.5 for a title prefix match |
| `updated_at` | timestamptz | tie-breaker |

New index: `reports_title_trgm` (GIN, `gin_trgm_ops`).

## Out of Scope (All Phases)
- Semantic, embedding-based search and "Ask your brain": Feature 17
- Search inside attachments: Feature 15
- Query operators (`is:done`, `in:thmp`, `type:note`), saved searches and search history: backlog
- Custom key bindings: backlog
- Searching checklist todos directly (they are reached through their task): by design

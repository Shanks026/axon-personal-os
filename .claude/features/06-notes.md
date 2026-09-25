# Feature 06: Notes (Rich-Text Editor)

**Product**: Axon, a personal second-brain OS
**File**: `.claude/features/06-notes.md`
**Status**: 🟡 In progress (Phase 1 ✅ 2026-09-25; design deltas ✅ folded; Phase 3 added)
**Depends on**: 04 (tags)
**Last Updated**: September 2026

---

## Context

Notes hold the long-form thinking: meeting notes, investigation write-ups, snippets, how-tos. This feature builds the shared Tiptap `RichTextEditor` (slash commands, bubble toolbar, tables, task lists), which later powers task descriptions (07), the journal (09) and reports (11). It also builds the notes list and a distraction-free editor page that autosaves. It follows Tercero's notes pattern (Tiptap JSON plus a derived plain-text column) and reuses the tags from Feature 04. Task mentions (`[[`) come in Feature 07 and images in Feature 15.

---

## Phase Overview

```
Phase 1: Editor and notes
  notes + note_tags tables, shared RichTextEditor (bubble menu, slash menu), useAutosave, notes list (grid/list, search), editor page with autosave, tags, soft delete.

Phase 2: Organise and editor extras
  Tag filter on the list, table controls, syntax-highlighted code blocks, Copy as Markdown, Ctrl+S and a shortcuts cheat sheet.

Phase 3: Rich task descriptions (added 2026-09-25, pulled forward from 07)
  The TaskDialog description textarea becomes a compact RichTextEditor (bubble menu, markdown shortcuts, slash menu; no toolbar). No migration: tasks.description (jsonb) and description_text already exist.
```

**After each phase, stop and wait for approval.**

---

## Phase 1: Editor and Notes ✅ Complete (2026-09-25)

### Design fold (delta 06 and screens 07a/07b, folded on 2026-09-25). This overrides the spec below where they differ.
- **List page** (`Notes.dc.html`):
  - "New note" goes in the header.
  - The toolbar has a 220px search on the left and the view switch on the right (**Grid · Table**; see decision A). The inline tag-chip filters (All, sprint, rca…) come in Phase 2.
  - **There's no sort control.** Notes are always ordered `updated_at desc`, so `sort` is dropped from the URL, `fetchNotes` and the toolbar.
  - Two sections: **Pinned** (only shown when something is pinned), then **All notes**.
  - The grid has 3 columns, with cards at least 148px tall (`min-h-37`).
  - The card's linked-task count comes with 07.
- **Pinning ships now** (delta 14: pin toggles arrive with the note editor; Feature 14 only adds the sidebar Pinned list). `pinned_at` already exists. Add a Pin/Unpin item to the card menu and a pin button in the editor header, both through `useTogglePinNote()` (optimistic).
- **Card, following this session's Tasks decisions:**
  - Title in `font-semibold`, clamped to 2 lines (full title on hover).
  - The excerpt, clamped to 2 lines.
  - Tags **pinned above the footer**: `TagPillGroup max={3}` with the "+n" hover card.
  - A dashed footer in the **normal font** with "Updated 2d ago". In Global, the space's emoji goes before it; there's no space name.
- **Editor page** (`Note Editor.dc.html`):
  - The sidebar **auto-collapses to the rail** on `notes/:noteId` and restores on leave.
  - The header holds the save state, a pin button and a `panel-right` rail toggle.
  - The reading column is 680px wide. The title uses the display style (`text-4xl font-semibold tracking-tight`), and the body is `text-base leading-7`.
  - The tags row has the pills, a "+ Tag" TagPicker trigger and "Edited 2h ago".
  - A **280px right rail** shows Created, Updated and **Words** (linked tasks come in 07). Below `lg` it becomes a Sheet.
- **Bubble toolbar:** bold, italic, strike, code, link, H2 and **highlight** (adds `@tiptap/extension-highlight`), plus the plan's "Turn into" menu. Underline stays available through Mod+U. "Make task" comes in 07, per D2.
- **Slash menu order:** H1, H2, bulleted list, checklist, quote, code block, table and divider come first, each with its markdown hint (`#`, `##`, `-`, `[]`, `>`, ```` ``` ````, `---`). Text, H3 and numbered list are listed last.
- **Standing UI rules from this session apply:**
  - shadcn default dialog headers.
  - Literal Tailwind colour classes for badges.
  - `text-sm` chips.
  - Thin themed scrollbars.
  - Menus that open on hover must be `modal={false}`.
- **Decision A — decided 2026-09-25: Table.** The notes list's second view is a **Table** (TanStack v9, the same pattern as the Tasks table: Title + excerpt, Tags, Updated, Space in Global, ⋮), rather than the design's dense list, since the Tasks list was replaced for looking chaotic.
- **Decision B — decided 2026-09-25: default space.** "New note" in **Global** creates the note in the default space silently, as the task dialog does (`useDefaultSpaceId`: the current space, then the last active, then the first). That drops `NewNoteSpacePicker`. The alternative is to keep the plan's space picker.

### Goal
At `/s/:slug/notes` the user sees their notes as a grid or list, each with a title, a two-line preview, a relative "updated" time, tags and (in Global) a space badge, and can search them. "New note" creates an empty note immediately and opens it. The editor page has a large title, a tags row, and a rich editor with a `/` command menu and a selection toolbar. Everything autosaves (800ms) with a Saving/Saved indicator, and a note left completely empty is discarded. Notes are soft-deleted with Undo.

### Before Starting: Confirm With Codebase
1. Feature 04 Phase 3 is complete: `tags` exists; `TagPicker`, `TagPill`, `useTags`, `tagKeys` exist. `SpaceBadge`, `SpaceIcon`, `EmptyState`, `ErrorState` and `usePageHeader` exist.
2. **Check the current Tiptap v3 packages and APIs** before installing:
   - Core: `@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit` (v3 bundles Link, Underline, ListKeymap and TrailingNode; confirm and configure them through StarterKit options).
   - `Placeholder` (v3 moved it to `@tiptap/extensions`), `TaskList`/`TaskItem` (v3: `@tiptap/extension-list`), `Table`/`TableRow`/`TableHeader`/`TableCell` (v3: `@tiptap/extension-table`).
   - `BubbleMenu`: v3 imports it from `@tiptap/react/menus` and positions with `@floating-ui/dom` (no tippy). Confirm the props (`editor`, `shouldShow`, `options`).
   - `@tiptap/suggestion`: the `char`, `items`, `command`, `render` lifecycle (`onStart`, `onUpdate`, `onKeyDown`, `onExit`) and `ReactRenderer` from `@tiptap/react`.
   - `useEditor` options `immediatelyRender` and `shouldRerenderOnTransaction` (set both deliberately for performance).
3. `use-debounce` is installed (Feature 01) for `useDebouncedCallback`.
4. Use the Supabase MCP to confirm `public.notes` does not exist.

### 1.1 Database
Migration `create_notes_and_note_tags`: the SQL from `data-model.md` **notes** (without the Feature 09 journal columns) and **note_tags**.

```sql
create table public.notes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  space_id      uuid not null,
  title         text not null default '' check (char_length(title) <= 300),
  content       jsonb,
  content_text  text not null default '',
  excerpt       text generated always as (left(content_text, 280)) stored,
  pinned_at     timestamptz,
  deleted_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  search        tsvector generated always as (
                  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
                  setweight(to_tsvector('english', coalesce(content_text, '')), 'B')
                ) stored,
  unique (id, user_id),
  foreign key (space_id, user_id) references public.spaces(id, user_id) on delete cascade
);
create index notes_scope_idx  on public.notes (user_id, space_id, updated_at desc) where deleted_at is null;
create index notes_search_idx on public.notes using gin (search);
create index notes_title_trgm on public.notes using gin (title extensions.gin_trgm_ops);
create trigger notes_updated_at before update on public.notes
  for each row execute function public.set_updated_at();
alter table public.notes enable row level security;
create policy "notes_owner_all" on public.notes for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create table public.note_tags (
  note_id     uuid not null,
  tag_id      uuid not null,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (note_id, tag_id),
  foreign key (note_id, user_id) references public.notes(id, user_id) on delete cascade,
  foreign key (tag_id,  user_id) references public.tags(id,  user_id) on delete cascade
);
create index note_tags_tag_idx on public.note_tags (tag_id);
alter table public.note_tags enable row level security;
create policy "note_tags_owner_all" on public.note_tags for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
```

`excerpt` exists so list views never download the full `content_text` (up to 100k characters per note). Verify: `excerpt` follows `content_text` on update; deleting a tag removes its `note_tags`. Run advisors.

### 1.2 API Layer
`src/features/notes/api.js`:

```js
export const noteKeys = {
  all: ['notes'],
  lists: () => [...noteKeys.all, 'list'],
  list: (params) => [...noteKeys.lists(), params],   // { spaceIds, q, tag, sort }
  details: () => [...noteKeys.all, 'detail'],
  detail: (id) => [...noteKeys.details(), id],
}
const LIST_COLUMNS = 'id, space_id, title, excerpt, pinned_at, created_at, updated_at, tag_ids:note_tags(tag_id)'
```

| Function / hook | Details |
|---|---|
| `fetchNotes({ spaceIds, q, sort })` / `useNotes(params)` | `.in('space_id', spaceIds).is('deleted_at', null)`. `sort`: `updated` (default, `updated_at desc`), `created`, `title`. `q` (sanitised: strip `,()"'*`, trim) → `.or('title.ilike.*q*,search.wfts(english).q')`. Maps `tag_ids`. `placeholderData: keepPreviousData` |
| `fetchNote(id)` / `useNote(id)` | `select('*, tag_ids:note_tags(tag_id)')`, `.eq('id', id).maybeSingle()`; `enabled: !!id`. Not scope-filtered (entity routes work in any scope) |
| `createNote({ space_id, title = '' })` / `useCreateNote()` | returns the row; `setQueryData(detail(row.id), row)` so the editor opens without a fetch; invalidates `lists()` |
| `updateNote(id, patch)` / `useUpdateNote()` | autosave patches (`title`, `content`, `content_text`); `onSuccess` merges the row into `detail(id)` and invalidates `lists()`. Not optimistic: the editor holds its own state |
| `softDeleteNote(id)` / `restoreNote(id)`, `useDeleteNote()` / `useRestoreNote()` | invalidate `noteKeys.all` |
| `discardNote(id)` / `useDiscardNote()` | **hard delete**, used only for untitled, empty notes on leave; removes `detail(id)`, invalidates `lists()`; errors are logged, not toasted |
| `setNoteTags(noteId, tagIds)` / `useSetNoteTags()` | same diff-then-upsert as `setTaskTags`; invalidates `noteKeys.lists()`, `detail(noteId)` and `tagKeys.all` |

`src/hooks/useAutosave.js` (shared; used again by 07, 09 and 11):
- `useAutosave({ save, delay = 800 })` → `{ schedule(patch), flush(), status }`, where `status` is `'idle' | 'saving' | 'saved' | 'error'`.
- Pending patches merge (last write per key wins). Built on `useDebouncedCallback`. `flush()` runs on unmount and on `beforeunload`, with the listener cleaned up. A failed save keeps the patch and sets `error`; the next edit retries.
- Tested with fake timers (debounce, merge, flush, error retry).

`src/features/notes/utils.js`: `isNoteEmpty({ title, content_text })`, `sanitizeSearch(q)`. Both tested.

### 1.3 Components

```
src/components/editor/
├── RichTextEditor.jsx
├── EditorBubbleMenu.jsx         # selection toolbar
├── SlashCommandMenu.jsx         # list UI rendered by the slash suggestion
├── suggestionRenderer.js        # createSuggestionRenderer(Component): ReactRenderer + @floating-ui/dom positioning; reused by 07 mentions
├── editor.css                   # prose styles on semantic tokens; TODO(design-system)
└── extensions/
    ├── buildExtensions.js       # ({ placeholder, features }) → extension array
    ├── SlashCommand.js          # Extension.create + Suggestion, char '/'
    └── slashItems.js            # SLASH_ITEMS + filterSlashItems(query)
src/hooks/useAutosave.js
src/features/notes/
├── api.js
├── utils.js
├── hooks/useNoteFilters.js      # URL: view (grid|list), q, sort, tag[] (tag used in Phase 2)
├── hooks/useCreateAndOpenNote.js
├── components/
│   ├── NewNoteSpacePicker.jsx   # Global only: pick a space before creating
│   ├── NotesToolbar.jsx         # search (debounced 250ms, replace), sort Select, view ToggleGroup
│   ├── NotesGrid.jsx            # ({ notes, view, showSpace }) grid or list layout via AnimatedList
│   ├── NoteCard.jsx             # ({ note, view, showSpace, tagsById })
│   ├── NewNoteButton.jsx        # creates + navigates; in Global a space picker popover first
│   ├── NoteTitleInput.jsx       # large auto-growing textarea; Enter moves focus into the editor
│   ├── SaveIndicator.jsx        # ({ status }) "Saving…", "Saved", "Couldn't save · Retry"
│   ├── NoteActionsMenu.jsx      # Delete (Phase 2: Copy as Markdown, Shortcuts)
│   └── NotesSkeleton.jsx
└── pages/
    ├── NotesPage.jsx            # /s/:slug/notes
    └── NoteEditorPage.jsx       # /s/:slug/notes/:noteId
```

**`RichTextEditor`** `({ value, onChange, placeholder = "Type '/' for commands", editable = true, features = { slash: true }, autofocus, onEditorReady, className })` (patterns §6)
- `value` is read **once** on mount. The editor is uncontrolled afterwards; callers remount with `key={entity.id}` to load another document.
- `onChange(json, text)` fires on `update` with `editor.getJSON()` and `editor.getText({ blockSeparator: '\n' }).slice(0, 100_000)`.
- `features.slash` enables `SlashCommand`. `features.taskMentions` is reserved for Feature 07 (a config object, so the editor never imports feature code).
- `onEditorReady(editor)` exposes the instance for page-level actions (Ctrl+S, Copy as Markdown).
- Extensions (`buildExtensions`): StarterKit (headings 1–3, `link: { openOnClick: false, autolink: true }`), Placeholder, TaskList + TaskItem (`nested: true`), Table (`resizable: false`) + rows and cells.

**`EditorBubbleMenu`**: shows on a non-empty text selection outside code blocks. Buttons: Bold, Italic, Underline, Strike, Code, Link (a popover with a URL input; empty removes the link) and a "Turn into" DropdownMenu (Text, H1–H3, bullet, numbered, checklist, quote). Every button is icon-only with `aria-label`, a Tooltip and `aria-pressed` from `editor.isActive`.

**Slash command**: `SLASH_ITEMS` = `{ id, title, keywords, icon, command({ editor, range }) }` for Text, Heading 1, Heading 2, Heading 3, Bullet list, Numbered list, Checklist, Quote, Code block, Divider, Table (3×3 with a header row). `filterSlashItems(query)` matches title and keywords case-insensitively (tested). `SlashCommandMenu` is a keyboard-driven list (↑ ↓ Enter, Esc closes) with `role="listbox"`, an empty state "No matches", and a `scaleIn` entrance from presets.

**`NotesPage`**
- `usePageHeader({ title: 'Notes', actions: <NewNoteButton /> })`; `NotesToolbar`; `useNotes({ spaceIds: scopeSpaceIds, q, sort })`.
- Loading: `NotesSkeleton` (cards or rows to match the view). Error: `ErrorState`. Empty: `EmptyState icon={NotebookPen} title="No notes yet" description="Capture meeting notes, ideas and how-tos." action="New note"`. Search empty: "No notes match '…'".

**`NoteCard`**: a `<Link>` to `p.note(id)`. Shows the title (or "Untitled" muted), a two-line `excerpt` clamp, `formatRelative(updated_at)`, up to 3 `TagPill`s plus "+n", and `SpaceBadge` in Global. The grid variant lifts on hover (transform); the list variant is a dense row. The card menu has Delete (soft, Undo toast).

**`NewNoteButton`**: in a space, creates `{ space_id: space.id }` and navigates to `p.note(row.id)`. In Global, a Popover lists active spaces (with `SpaceIcon`); choosing one creates the note there and navigates to `paths.space(slug).note(id)`.
- The create-and-open logic lives in `features/notes/hooks/useCreateAndOpenNote.js` → `{ createAndOpen({ spaceId, title, initialContent }), isPending }`, and the space choice in `NewNoteSpacePicker.jsx` (`{ open, onOpenChange, onPick }`, a small Command dialog when used without an anchor).
- **Mountable standalone:** Notes has no create dialog, so Feature 12's `GlobalDialogs` handles `?new=note` by calling `createAndOpen` directly in a space, or by showing `NewNoteSpacePicker` in Global. Neither depends on `NotesPage` state.

**`NoteEditorPage`**
- `useNote(noteId)`. Canonical redirect: when not in Global and `note.space_id !== space.id`, `<Navigate replace>` to the note's space URL. A missing or soft-deleted note shows `EmptyState` "This note doesn't exist or is in Trash" with a link back to Notes. A note in an archived space shows "This note is in an archived space" with a link to `/spaces`.
- `usePageHeader({ title: note.title || 'Untitled', breadcrumbs: [Notes], actions: <SaveIndicator/> + <NoteActionsMenu/> })`.
- Layout: centred reading column. `NoteTitleInput`, a tags row (`TagPill`s + `TagPicker` with `spaceIds=[note.space_id]`, `createSpaceId=note.space_id` → `useSetNoteTags`), then `RichTextEditor key={note.id} value={note.content}`.
- Autosave: title and editor changes call `schedule({ title })` or `schedule({ content, content_text })` on `useAutosave({ save: (patch) => updateNote.mutateAsync({ id, patch }) })`. Latest local values are kept in refs.
- **Discard on leave:** on unmount, after `flush()`, if `isNoteEmpty(latest)` then `discardNote(id)`. Guard against the React StrictMode dev double-mount: the effect sets `mountedRef.current = true` on setup; cleanup sets it false and defers the check with `setTimeout(…, 0)`, skipping it when the component has remounted. A tab closed on an empty note leaves a harmless "Untitled" note.
- Delete (menu): soft delete, navigate to Notes, then the Undo toast.
- Motion: `PageTransition`; the save indicator cross-fades between states.

### 1.4 Routes and Integration
- `router.jsx`: `notes` → `NotesPage`, `notes/:noteId` → `NoteEditorPage` (both replace their placeholders).
- `src/features/tags/api.js`: the tag select adds `note_tags(count)`; `ManageTagsDialog` shows combined usage ("12 tasks · 3 notes").

### 1.5 Impact on Existing Features
| Existing feature | Impact | Action |
|---|---|---|
| 04 tags api / `ManageTagsDialog` | Tags are used by notes | Add `note_tags(count)`; `useUpdateTag` and `useDeleteTag` also invalidate `noteKeys.all` |
| 04 `TagPicker` | Reused as is | None |
| 03 `useSwitchSpace` | `notes/:noteId` falls back to `notes` | Already handled by the 03 detail-route rule |

### 1.6 Not in This Phase
- Tag filter, table controls, highlighted code, Markdown copy, Ctrl+S (Phase 2)
- `[[task]]` mentions and linked tasks (07); images and attachments (15)
- Pinning notes (14); note templates, version history: backlog

### 1.7 Checklist: Before Marking Complete
- [x] `create_notes_and_note_tags` is applied and mirrored; `excerpt` and the tag cascade are verified; advisors are clean
- [x] Grid and table views toggle through `?view=`; search lives in the URL (no sort, per the design fold)
- [x] "New note" opens the editor instantly; in Global it creates in the default space (decision B)
- [x] The slash menu inserts every listed block type; the bubble menu formats and links
- [x] Autosave shows Saving then Saved; a reload shows the latest content; nothing is lost when navigating away mid-debounce
- [x] Leaving an empty untitled note deletes it (also verified under StrictMode in dev); a note with only a title or only content is kept
- [x] Tags can be added and created from the editor; pills show on cards
- [x] Delete shows Undo (`restoreNote` / `useRestoreNote` exported); the canonical-space redirect works; missing, deleted and archived states render
- [x] `useCreateAndOpenNote` works outside `NotesPage` (ready for `?new=note` in Feature 12); `NewNoteSpacePicker` dropped per decision B
- [x] Tests: `useAutosave`, `isNoteEmpty`, `sanitizeSearch`, `filterSlashItems` (plus `countWords`, `splitPinned`, `tagUsage` and a page-level flow test)
- [x] `npm run lint`, `npm test` and `npm run build` pass
- [x] `axon-rules` audit is clean for the changed files
- [x] `00-index.md` DB registry, status and changelog (new shared `RichTextEditor`, `useAutosave`) and `axon-data-patterns.md` §10 are updated

### 1.8 Implementation Notes
- **Tiptap 3.31.3** (all `@tiptap/*` packages the same version).
  - StarterKit v3 bundles Link, Underline, ListKeymap and TrailingNode; Link is configured through `StarterKit.configure({ link })`.
  - Placeholder comes from `@tiptap/extensions`, TaskList/TaskItem from `@tiptap/extension-list`, and the table nodes from `@tiptap/extension-table`.
  - `BubbleMenu` comes from `@tiptap/react/menus`. It appends to the editor's parent (made `relative`) and positions with Floating UI.
- **Suggestion positioning:** `@tiptap/suggestion` 3.31 ships `props.mount(element)`, which appends to `document.body` and keeps the popup anchored with Floating UI `autoUpdate` (scrolls, resizes, layout shifts). `suggestionRenderer` uses it instead of hand-rolled `computePosition` code. The plugin handles Esc itself.
  - **Phase 3 note:** inside a modal Dialog, pass the suggestion `container` option (an element inside `DialogContent`).
- **Link editing** is an inline URL field that swaps into the bubble (Enter applies, empty removes, Esc cancels) rather than a Radix Popover. A portalled popover would take focus outside the bubble and hide it.
  - "Turn into" is a non-modal DropdownMenu. Buttons prevent `mousedown`, so the editor keeps its focus and selection.
- **Editor performance:** `immediatelyRender: true` (client-only SPA) and `shouldRerenderOnTransaction: false`. The bubble menu reads active marks through `useEditorState`.
- **Header ownership:** `NoteEditor` (keyed by note id) calls `usePageHeader` itself, because the save status, pin and rail state live there. `NoteEditorPage` renders a small `NoteStatus` wrapper that sets the header for the loading, error and missing states. The two never mount together.
  - `usePageHeader` gained `parent: { label, to }` for the "space › Notes › title" breadcrumb.
- **Discard on leave:** the cleanup flushes pending saves, then after a `setTimeout(0)` (skipped if StrictMode remounted) hard-deletes the note if `isNoteEmpty` is true. The delete waits for the flush.
  - `isNoteEmpty` also keeps notes whose only blocks carry no text (a divider or an empty table).
  - A note soft-deleted from the menu is never discarded, so Undo still works.
- **Autosave errors** show in the header ("Couldn't save · Retry" via the new `SaveIndicator onRetry`), not as toasts. `useUpdateNote` has no `onError` toast.
- **Search** uses `.or('title.ilike."*q*",search.wfts(english)."q"')` with quoted values. `sanitizeSearch` strips `, ( ) " ' * \`.
- **Rail:** the Details toggle flips the 280px rail at `lg` and up (remembered as `axon:notes:rail`) and opens a Sheet below `lg`. The rail also shows the note's **Space**, which matters because a Global "New note" goes to the default space silently.
- **Sidebar auto-collapse** lives in `AppShell`: on `notes/:noteId` the sidebar uses a separate in-memory open state (starting collapsed), so the persisted `axon:sidebar-open` preference is untouched and returns on leave.
- **Tags:** `setNoteTags` and `useSetNoteTags` (optimistic on the note detail) live in `features/tags/api.js` next to `setTaskTags`, so that module can invalidate `noteKeys` without an import cycle (`notes/api.js` doesn't import tags).
- **Bundle:** Tiptap and ProseMirror go to a cached `editor` chunk (`vite.config.js`), about 490 kB raw and 154 kB gzip.
- **Deferred:**
  - Browser verification of the bubble, slash and "Turn into" menus, and StrictMode discard in the real dev server. It's covered by the jsdom flow test, but the user should confirm it.
  - `Mod+K` for links, Ctrl+S, tables controls and the tag filter (Phase 2).

**Stop here. Show the result and wait for approval.**

---

## Phase 2: Organise and Editor Extras

### Goal
The user filters notes by tag, edits tables with proper controls (rows, columns, header), writes code blocks with syntax highlighting and a language picker, copies a note as Markdown, forces a save with Ctrl+S, and can look up the editor's shortcuts from a cheat sheet.

### Before Starting: Confirm Phase 1 Is Approved
1. Phase 1 is `✅ Complete`.
2. Check the current `@tiptap/extension-code-block-lowlight` and `lowlight` (v3: `createLowlight(common)`) APIs. StarterKit's `codeBlock` must be disabled when it is added.
3. Check for an official Tiptap Markdown serializer (the `@tiptap/markdown` extension and `editor.getMarkdown()` in recent v3 releases). If it is not available or not stable, fall back to `turndown` on `editor.getHTML()` with a task-list rule. Record the choice in Implementation Notes.
4. Check the table commands available in the installed Table extension (`addRowAfter`, `deleteRow`, `addColumnAfter`, `deleteColumn`, `toggleHeaderRow`, `deleteTable`).
5. Confirm the `note_tags!inner` alias filter works the same way as the Feature 04 `tag_match` alias.

### 2.1 Database
No database changes in this phase.

### 2.2 API Layer
- `fetchNotes` accepts `tag` (ids, any-of) using `tag_match:note_tags!inner(tag_id)` and `.in('tag_match.tag_id', tag)`, so the displayed tags are not trimmed.
- No new hooks.

### 2.3 Components

```
src/components/editor/
├── TableBubbleMenu.jsx          # shows when the selection is inside a table
├── CodeBlockView.jsx            # ReactNodeViewRenderer: language Select + <pre><NodeViewContent/>
├── EditorShortcuts.jsx          # ({ open, onOpenChange }) Popover/Dialog listing shortcuts
├── editorShortcuts.js           # EDITOR_SHORTCUTS data (label, keys) shared by the cheat sheet and tests
└── extensions/
    ├── CodeBlockHighlighted.js  # CodeBlockLowlight.extend({ addNodeView }) with createLowlight(common)
    └── SaveShortcut.js          # Mod-s → calls features.onSave?.() and returns true (prevents the browser save)
src/lib/markdown.js              # only if the turndown fallback is used: htmlToMarkdown(html)
src/features/notes/components/
└── (changes) NotesToolbar.jsx, NoteActionsMenu.jsx
```

- **Tag filter:** `NotesToolbar` gains `TagPicker mode="filter"` bound to `useNoteFilters().tag`.
- **`TableBubbleMenu`**: add row above and below, delete row, add column left and right, delete column, toggle header row, delete table. Icon buttons with `aria-label` and Tooltips.
- **Code blocks:** the language Select lists lowlight's `common` languages plus "Plain text" and writes the `language` attribute. Highlight colours come from `editor.css` token classes (TODO design-system).
- **Copy as Markdown:** `NoteActionsMenu` item writes the Markdown to `navigator.clipboard.writeText` and shows `toast.success('Copied as Markdown')`. The title is prepended as `# Title`.
- **Ctrl/Cmd+S:** `RichTextEditor` receives `features.onSave`; `NoteEditorPage` passes `flush` from `useAutosave`. The same shortcut on the title input is handled with `useHotkeys('mod+s', …, { enableOnFormTags: true, preventDefault: true })`.
- **Shortcuts cheat sheet:** a `Keyboard` icon button (`aria-label="Keyboard shortcuts"`) in the editor header opens `EditorShortcuts`: formatting (Mod+B, I, U, Shift+S, E), headings (Mod+Alt+1–3), lists (Mod+Shift+7, 8, 9), `/` commands, Mod+K link, Mod+S save.

### 2.4 Routes and Integration
- `RichTextEditor` `features` gains `codeHighlight: true` (default on) and `onSave`. The journal (09) and reports (11) inherit both.

### 2.5 Impact on Existing Features
| Existing feature | Impact | Action |
|---|---|---|
| 06 Phase 1 editor | StarterKit `codeBlock` replaced | Disable it in `buildExtensions`; existing code blocks keep working (same node name `codeBlock`) |
| 07 task description (future) | Uses the same editor | Gets the extras for free |

### 2.6 Not in This Phase
- `[[task]]` mentions (07); images (15); Markdown import: backlog (19)
- Note version history, collaborative editing: never or backlog

### 2.7 Checklist: Before Marking Complete
- [ ] The tag filter works, lives in the URL and combines with search and sort
- [ ] The table menu performs every listed action; Tab moves between cells
- [ ] Code blocks highlight, the language persists across reload, and old code blocks still render
- [ ] Copy as Markdown produces headings, lists, checklists, tables, code fences and links correctly (unit test on a fixture document)
- [ ] Ctrl/Cmd+S saves immediately from the editor and the title, and never opens the browser dialog
- [ ] The cheat sheet opens by keyboard and lists the shortcuts from `editorShortcuts.js`
- [ ] `npm run lint`, `npm test` and `npm run build` pass
- [ ] `axon-rules` audit is clean for the changed files
- [ ] `00-index.md` status and changelog are updated

**Stop here. Show the result and wait for approval.**

---

## Phase 3: Rich Task Descriptions

### Goal
In the task dialog, the description is a compact rich editor instead of a plain textarea. It supports markdown shortcuts (`#`, `-`, `[]`, `>`, `**bold**` and so on), the selection bubble menu, and the `/` menu, with no fixed toolbar. It keeps its borderless "Add description…" look and grows inside the dialog's scrolling body. Descriptions keep their formatting after saving, and cards and the table keep showing the plain-text preview.

### Before Starting: Confirm Phase 2 Is Approved
1. Phases 1 and 2 are `✅ Complete`. `RichTextEditor`, `EditorBubbleMenu` and the slash menu exist.
2. `tasks.description` (jsonb) and `tasks.description_text` exist, and `TaskDialog` currently builds `description` with `textToDoc(description_text)` on submit (`features/tasks/utils.js`).
3. `LIST_COLUMNS` omits `description` (it's heavy), so the edit dialog doesn't have the rich doc yet.
4. Check how `@tiptap/react/menus` `BubbleMenu` and the slash suggestion popup mount **inside a modal Radix Dialog**. Radix locks pointer events outside `DialogContent` (the Sonner lesson from Feature 05), so both must render inside the dialog content, or be given `pointer-events: auto`, and must stay above the scroll container.

### 3.1 Database
None. The columns exist, and existing tasks already store a Tiptap doc (from `textToDoc`) or `null`.

### 3.2 API Layer
- `fetchTask(id)` / `useTask(id)` in `features/tasks/api.js`: `select('id, description')`, `.eq('id', id).maybeSingle()`, `enabled: !!id`, key `taskKeys.detail(id)`. The edit dialog uses it to load the rich doc. It's the only place that reads `description`.
- `useUpdateTask` already `setQueryData(detail(row.id), row)`. Change it to **merge** (`old ? { ...old, ...row } : row`), because `row` (the list columns) has no `description`. Feature 07 plans the same change.

### 3.3 Components
- **`RichTextEditor`** gains `variant: 'full' | 'compact'` (default `full`).
  - Compact uses `text-sm` body type, no min-height, and a placeholder of "Add description…".
  - Headings are limited to H2–H3, and tables are off in the slash menu.
  - The bubble menu stays.
- **`TaskDialog`:**
  - Replaces the description `<textarea>` with `RichTextEditor variant="compact" key={task?.id ?? 'new'} value={initialDescription}`.
  - `initialDescription` is `taskDetail?.description ?? textToDoc(task?.description_text)`, or `null` on create.
  - In edit mode, the editor mounts once `useTask(task.id)` resolves. Until then it shows a 2-line skeleton.
  - `onChange(json, text)` sets form fields `description` and `description_text` (`form.setValue`, `shouldDirty`).
  - The dialog **still saves on Save / Mod+Enter**; there's no autosave in the dialog, which keeps its current semantics. Mod+Enter must still submit from inside the editor, via a keymap that doesn't swallow it.
- `taskSchema` gains `description: z.any().nullable()`. `description_text` stays at max 20,000 characters, and the editor's text is sliced to that.
- `textToDoc` stays only as the fallback for old plain-text rows. Delete it if nothing else uses it.
- **Create more:** resetting the form also resets the editor (a new `key`).

### 3.4 Routes and Integration
None. Feature 07's task detail page later reuses the same editor (`variant="full"`, autosave).

### 3.5 Impact on Existing Features
| Existing feature | Impact | Action |
|---|---|---|
| 04 `TaskDialog` | The description becomes rich text | As above; update the tests that type into "Description" (they now target the editor's `contenteditable`) |
| 04 `useUpdateTask` | The detail cache merges | `{ ...old, ...row }` |
| 04 cards and table | Still use `description_text` | None |
| 07 plan | "Rich description" is already built | 07's `TaskDescription` reuses it; note in 07's doc |

### 3.6 Not in This Phase
- Autosave in the dialog, and `[[task]]` mentions in descriptions (07 / backlog).

### 3.7 Checklist: Before Marking Complete
- [ ] Markdown shortcuts, the bubble menu and `/` work inside the dialog. The popups are clickable (no pointer-events lock) and positioned correctly while the body scrolls.
- [ ] Editing an existing task loads its formatted description. Old plain-text descriptions open as paragraphs.
- [ ] Save and Mod+Enter persist `description` (JSON) and `description_text`. Card and table previews update.
- [ ] Create more clears the editor.
- [ ] Light and dark mode both render correctly.
- [ ] `npm run lint`, `npm test` and `npm run build` pass. The `axon-rules` audit is clean. `00-index.md` is updated and 07's doc is annotated.

**Stop here. Show the result and wait for approval.**

---

## Data Model Summary (after all phases)

```
spaces 1 ── n notes
notes  n ── n tags   (via note_tags)
(Feature 07 adds note_task_links; Feature 09 adds notes.kind + journal_date)
```

### `notes`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK; `unique(id, user_id)` |
| `space_id` | uuid | composite FK to spaces, cascade |
| `title` | text | ≤ 300, may be empty ("Untitled") |
| `content` | jsonb | Tiptap doc |
| `content_text` | text | derived on save, ≤ 100k |
| `excerpt` | text | generated, first 280 characters of `content_text`; list previews |
| `pinned_at` | timestamptz | UI in 14 |
| `deleted_at` | timestamptz | soft delete |
| `search` | tsvector | generated; title A, content B |

### `note_tags`
| Column | Type | Notes |
|---|---|---|
| `note_id`, `tag_id` | uuid | PK pair; composite FKs, cascade |

## Out of Scope (All Phases)
- Task mentions and note ↔ task links: Feature 07
- Journal entries (notes of kind `journal`): Feature 09
- Images, files, embeds: Feature 15
- Pins: Feature 14
- Markdown import and export of all notes: Feature 19

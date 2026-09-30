# Feature 15: Attachments and Media

**Product**: Axon, a personal second-brain OS
**File**: `.claude/features/15-attachments-and-media.md`
**Status**: 🟡 In progress (Phase 1 ✅ 2026-09-25, pulled forward at the user's request; Phase 2 ✅ 2026-09-30, for Jira attachments; Phase 3 later)
**Depends on**: 06 (the shared editor, including compact task descriptions)
**Last Updated**: September 2026

---

## Context

Notes and task descriptions are now rich text (Feature 06), but they can't hold a screenshot, and screenshots are most of what frontend work needs to record: a broken layout, a design reference, an error in the console. This feature adds images to the shared editor first (Phase 1, pulled ahead of Features 07–14), then file attachments on tasks and uploaded space images. Files live in a **private** Supabase Storage bucket and are shown only through short-lived signed URLs, following the same owner-only rule as every table (`user_id = auth.uid()`). The editor stays feature-agnostic: it receives upload and URL functions through its `features` config, like `onSave`.

---

## Phase Overview

```
Phase 1: Images in the editor (pulled forward)
  A private `attachments` bucket with owner-only storage policies. Paste, drop or "/image" an image into a note or a task description; it uploads, shows a preview while uploading, and renders through cached signed URLs.

Phase 2: File attachments on tasks
  An `attachments` table, an "Attach files" chip in the task dialog and a list on the task (download, delete).

Phase 3: Space images
  Upload an image as a space's identity, a third option beside Emoji in the space dialog.
```

**After each phase, stop and wait for approval.**

---

## Phase 1: Images in the Editor ✅ Complete (2026-09-25)

### Goal
In a note or a task description, the user can paste a screenshot (Ctrl/Cmd+V), drop an image file, or pick one from the `/` menu ("Image"). The image appears at once as a faded local preview with a spinner while it uploads, then as the stored image. Images fill the reading column (never wider), keep their aspect ratio with no layout jump on reload, can be selected (accent ring) and deleted like any block, and have alt text for screen readers. Only PNG, JPEG, WebP and GIF files up to 10 MB are accepted; anything else shows a clear toast. Images are private: nobody without the signed-in account can load them, even with a copied link after it expires.

### Before Starting: Confirm With Codebase
1. Feature 06 is complete: `RichTextEditor` (`variant`, `features`, `onEditorReady`), `buildExtensions`, `SlashCommand` (`exclude`), `slashItems`, `suggestionRenderer` and `markdown.js` exist.
2. Check `@tiptap/extension-image` **3.31** (the version must match the other `@tiptap/*` packages): its attributes, `allowBase64`, and how to extend it with `addAttributes` and `addNodeView` (`ReactNodeViewRenderer`). Also check `@tiptap/markdown` `renderMarkdown` for the node.
3. Check supabase-js v2 Storage: `storage.from(b).upload(path, file, { contentType, upsert })`, `createSignedUrls(paths, expiresIn)`, and error shapes. Check `storage.foldername()` for policies.
4. Use the Supabase MCP (or the Management API fallback) to confirm that no `attachments` bucket exists and to inspect `storage.objects` policies.
5. Confirm how ProseMirror exposes pasted and dropped files (`editorProps.handlePaste` / `handleDrop`, `event.clipboardData.files`, `view.posAtCoords`).

### 1.1 Database
Migration `create_attachments_bucket` (a Storage bucket plus policies on `storage.objects`; no public table in this phase):

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('attachments', 'attachments', false, 10485760,
        array['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

-- Owner-only: the first path segment is the owner's user id ({user_id}/{space_id}/{file}).
create policy "attachments_owner_select" on storage.objects for select to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "attachments_owner_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "attachments_owner_update" on storage.objects for update to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "attachments_owner_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = (select auth.uid())::text);
```

- **Object path:** `{user_id}/{space_id}/{uuid}.{ext}`. The space folder lets Feature 14's "delete space" and trash purge remove a space's files by prefix. The file name is a random UUID, never the user's file name.
- **Verify** in a rolled-back transaction (as a second user id) that one user can't read another user's objects, and that the bucket rejects other MIME types and files over 10 MB. Then run the security advisors.
- Record the bucket in `data-model.md` (a new "Storage" section) and the DB registry.

### 1.2 API Layer
`src/features/attachments/api.js` (the only Storage access):

```js
export const attachmentKeys = {
  all: ['attachments'],
  url: (path) => [...attachmentKeys.all, 'url', path],   // signed URL for one image
}
export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const SIGNED_URL_TTL = 60 * 60          // 1 hour
```

| Function / hook | Details |
|---|---|
| `uploadImage({ spaceId, file })` | Validates the type and size (`ImageUploadError` with a friendly message), reads the natural `width`/`height` (`createImageBitmap`, with an `Image()` fallback), then uploads to `{user.id}/{spaceId}/{crypto.randomUUID()}.{ext}` with `contentType`, `upsert: false`. Gets `user.id` from `supabase.auth.getUser()`. Returns `{ path, width, height }` |
| `getImageUrls(paths)` | `createSignedUrls(paths, SIGNED_URL_TTL)` → `Map(path → url)` |
| `useImageUrl(path)` | `useQuery({ queryKey: url(path), queryFn: …, staleTime: 50 min, gcTime: 55 min, enabled: !!path })`, refreshed before the URL expires |
| `useImageHandlers({ spaceId })` | Returns the editor's `images` config, memoised on `spaceId`: `{ upload: (file) => uploadImage({ spaceId, file }), resolveUrl: (path) => qc.fetchQuery(...) }`. `resolveUrl` goes through the same query cache as `useImageUrl`, so an image is signed once per hour however often it renders |

Pure helpers in `src/features/attachments/utils.js`, all tested: `validateImageFile(file)` (returns an error message or `null`), `imageExtension(mime)`, `imagePath({ userId, spaceId, id, mime })`.

### 1.3 Components

```
src/components/editor/
├── extensions/
│   ├── ImageBlock.js          # Image.extend: attrs path, alt, width, height, uploadId; node view; markdown
│   └── ImageUpload.js         # paste / drop handling + insertImageFiles(editor, files)
├── ImageBlockView.jsx         # node view: signed-URL image, upload preview + spinner, error state, alt
└── (changes) buildExtensions.js, slashItems.js, RichTextEditor.jsx, editor.css, markdown.js
src/features/attachments/
├── api.js
└── utils.js
```

**`features.images`** (the editor never imports feature code): `{ upload(file) → Promise<{ path, width, height }>, resolveUrl(path) → Promise<string> }`. Without it, image paste, drop and the "Image" slash item are off, and existing image nodes render a neutral "Image unavailable" box.

**`ImageBlock`** (`@tiptap/extension-image` extended, node name `image`, block, draggable):
- Attributes: `path` (the Storage path; this is what's saved), `alt` (default `''`), `width`, `height` (natural size, for the aspect ratio), and `uploadId` (transient, only while uploading; never saved).
- `src` is **not** saved. The node view resolves `path` to a signed URL. `renderHTML` writes `data-path` and `alt` (no `src`), so copied HTML never embeds an expiring link.
- `renderMarkdown`: `![alt](axon-image:{path})`. Copy as Markdown keeps a stable reference rather than a URL that expires in an hour.

**`ImageUpload`** (an Extension with a ProseMirror plugin):
- `handlePaste`: when the clipboard has image files, insert them at the selection. Text and HTML paste is untouched. When both text and image are present (a copied web page), text wins.
- `handleDrop`: for dropped image files, insert them at `posAtCoords`.
- `insertImageFiles(editor, files, pos?)`: for each file, `validateImageFile` → a toast on error. Otherwise it inserts an `image` node with a blob `URL.createObjectURL` preview kept in extension storage by `uploadId`, calls `features.images.upload(file)`, then sets `path`/`width`/`height` and clears `uploadId` on the node found by `uploadId` (it may have moved). On failure it removes the node, shows a toast, and revokes the blob URL.
- Exported for the slash item.

**Slash item "Image"** (`slashItems`, after Divider, hint none, keywords `image picture screenshot photo`): opens a hidden `<input type="file" accept={IMAGE_TYPES}>` and calls `insertImageFiles`. It's hidden when `features.images` is missing (via `SlashCommand` `exclude`).

**`ImageBlockView`** (`ReactNodeViewRenderer`, `NodeViewWrapper` block):
- **Uploading:** the blob preview at 50% opacity with a small centred spinner (a spinner inside the media box is allowed, like a button).
- **Ready:** `<img>` from `resolveUrl(path)`, `loading="lazy"`, `alt`, `rounded-lg`, `max-w-full h-auto`, with `aspect-ratio` from `width`/`height` so reloads don't jump. A muted skeleton shows while the URL resolves.
- **Error** (the URL or image failed): a bordered muted box, "Image unavailable" with a retry button.
- **Selected** (`selected` prop): `ring-2 ring-ring` with a 2px offset. Delete and Backspace remove it (ProseMirror's default for a selected node).
- **Alt text:** when selected, a small "Alt text" button in the corner opens an inline input (Enter saves via `updateAttributes({ alt })`). It's hidden in read-only editors.

**`editor.css`:** image block spacing, the selected ring on tokens, and a drop-cursor colour (`--ring`).

**Wiring:**
- `NoteEditor`: `features={{ slash: true, onSave: flush, images: useImageHandlers({ spaceId: note.space_id }) }}`.
- `TaskDialog`: `images: useImageHandlers({ spaceId: defaultSpace })`, so images work in create and edit, since the path needs only the space.
- The compact editor shows images at full description width.

### 1.4 Routes and Integration
- No routes. `package.json` gains `@tiptap/extension-image`.
- `vite.config.js`: nothing (it falls in the `editor` chunk).
- `note.content_text` / `task.description_text` don't include images, so excerpts and search are unchanged.

### 1.5 Impact on Existing Features
| Existing feature | Impact | Action |
|---|---|---|
| 06 editor | New node and paste/drop handling | `buildExtensions` adds `ImageBlock` always (so existing images render anywhere) and `ImageUpload` when `features.images` is set |
| 06 note editor, task dialog | Pass `features.images` | As above |
| 06 `isNoteEmpty` / `isDocEmpty` | A note with only an image | Already counted as content (a non-paragraph block) |
| 06 `markdown.js` | Image nodes | `axon-image:` reference, tested |
| 14 trash purge, space delete | Orphaned files | Out of scope here. 14 deletes the `{user_id}/{space_id}/` prefix when a space is deleted; per-entity cleanup comes with Phase 2's table |

### 1.6 Not in This Phase
- ~~Image resizing~~ (added as a follow-up on 2026-09-25, the user's request; see §1.8). Alignment, captions, galleries and a lightbox/zoom remain in the backlog.
- Client-side downscaling or compression. The 10 MB cap stands in; revisit if screenshots are heavy.
- Removing a Storage object when its image is deleted from a doc (orphans are left; cleanup needs the Phase 2 table or a sweep).
- Non-image files (Phase 2), space images (Phase 3), images in the journal (09) and reports (11); those inherit it by passing `features.images`.

### 1.7 Checklist: Before Marking Complete
- [x] `create_attachments_bucket` is applied and mirrored. Cross-user reads are denied, the bucket enforces type and size, and advisors are clean
- [x] Pasting a screenshot, dropping a file and "/ Image" each insert an image in a note **and** in the task dialog (create and edit), with a preview while uploading *(built and covered by editor tests; confirm the real upload in the browser)*
- [x] Wrong types and files over 10 MB show a toast and insert nothing. A failed upload removes the placeholder
- [x] Images survive reload (the signed URL resolves from `path`), keep their aspect ratio (no jump), and never overflow the column
- [x] Selecting shows the ring. Delete removes it. Alt text can be set and is saved
- [x] Only `path`/`alt`/`width`/`height` are saved (no `src`, no blob URL, no `uploadId`). Copy as Markdown writes `![alt](axon-image:…)`
- [x] Tests: `validateImageFile`, `imageExtension`, `imagePath`, Markdown for image nodes, and an editor test inserting an image through a mocked `features.images`
- [x] `npm run lint`, `npm test` and `npm run build` pass
- [x] `axon-rules` audit is clean for the changed files
- [x] `00-index.md` status, DB registry and changelog, `data-model.md` (Storage) and `axon-data-patterns.md` §10 are updated

### 1.8 Implementation Notes
- **Bucket verified** in rolled-back transactions against `storage.objects`:
  - The owner can insert into and see their own folder.
  - A second user id sees nothing of theirs.
  - Writing into someone else's folder fails the RLS check.
  - Size and type limits are enforced by the Storage API from the bucket settings (`file_size_limit`, `allowed_mime_types`), and mirrored client-side by `validateImageFile`.
  - Advisors show no new warnings. Migration `20260925123002`.
- **`ImageBlock`** extends `@tiptap/extension-image` 3.31. `addAttributes` is replaced with `path`, `alt`, `width`, `height` and `uploadId` (`rendered: false`); `src` and `title` are dropped.
  - `parseHTML` takes only `img[data-path]`. Copying images between notes works, while pasted web images are ignored (their text still pastes).
  - Markdown round-trips `axon-image:{path}`.
- **Handlers reach the editor two ways:**
  - At creation, `ImageUpload.configure({ handlers })` seeds editor storage, so image views have them on the first render. Storage isn't reactive, so an effect alone would leave "Image unavailable" stuck.
  - Afterwards, `setImageHandlers` (from a `RichTextEditor` effect) keeps them current.
  - The "/ Image" slash item is excluded when `features.images` is missing.
- **Upload flow** (`insertImageFiles`): validate (a toast on error), then insert a node with `uploadId` whose blob preview is kept in storage, then `upload`.
  - On success, `setNodeMarkup` sets `path`/`width`/`height` (found by `uploadId`, so it's safe if the node moved). The preview stays mapped to the new `path`, so there's no flash or signed-URL round trip right after uploading.
  - On failure, it shows a toast and deletes the node. Blob URLs are revoked on failure and when the editor is destroyed.
- **Saving:** `RichTextEditor` passes `stripPendingImages(json)` to `onChange`, so an image still uploading is never saved. Leaving mid-upload just drops it; the finished upload's transaction saves it.
- **Paste rule:** image files are uploaded only when the clipboard has **no plain text**. A screenshot or "Copy image" has none; copied web content with text pastes normally.
- **Signed URLs:** `resolveUrl` = `qc.fetchQuery` with a 1-hour URL, `staleTime` 50 minutes and `gcTime` 55 minutes, so each image is signed at most about once an hour. `useImageUrl(path)` is exported for Phase 3.
- **The upload path's user id** comes from `supabase.auth.getSession()` (local, no network round trip).
- **Drop cursor:** StarterKit's `dropcursor` is `var(--ring)`, 2px.
- **Bundle:** the `editor` chunk is about 594 kB raw and 185 kB gzip.
- **Follow-up (2026-09-25, the user's request): resizing.**
  - A selected image shows a handle on each side (`ImageResizeHandle`). Dragging sets the width live and saves it on release as a new `displayWidth` attribute (null = natural size; `data-display-width` in HTML). The height follows the aspect ratio.
  - The width is clamped to 80px minimum and the column width maximum (`imageSize.js` `clampImageWidth`, tested).
  - Arrow keys on a focused handle resize by 20px (Shift: 80px). A double-click resets to the natural size.
  - Handles prevent the pointer default and use pointer capture, so ProseMirror never starts a node drag.
- **Deferred:** a real upload against Supabase can't be exercised in jsdom; the user should confirm paste, drop and "/ Image" in the browser. Orphaned files remain when images are removed from docs (as planned).

**Stop here. Show the result and wait for approval.**

---

## Phase 2: File Attachments on Tasks ✅ Complete (2026-09-30)

> **Why now (the user, 2026-09-30):** Feature 17 Phase 4 copies Jira attachments into Axon and builds on this phase. **Decisions:** the project is on Supabase's **free plan** (at most 50 MB per file and 1 GB of storage in all), and **videos are skipped for now**.

### Goal
On a task's page (and the task dialog in edit mode), an **Attachments** section lists the task's files: a type icon (or a small thumbnail for images), the name, size and date. **Attach files** (or dropping files onto the section) uploads any non-video file up to 50 MB. A file can be downloaded under its own name, or deleted after a confirm. Task cards show a paperclip count. Settings shows how much of the free plan's 1 GB the attachments use.

### Before Starting: Confirm With Codebase
1. Phase 1 is approved: `features/attachments/api.js` (`uploadImage`, `useImageUrl`, `attachmentKeys`) and `utils.js` exist.
2. supabase-js v2 Storage: `createSignedUrl(path, ttl, { download: fileName })` (forces a download under that name), `remove([paths])`, and the upload error for a file over the bucket limit.
3. The task detail layout (`TaskDetail.jsx`: description, checklist, linked notes, activity) and the dialog's edit mode (`TaskDialog.jsx` → `TaskForm`), for where the section goes.
4. `tasks/api.js` `LIST_COLUMNS` (the embed for the count, like `note_count:note_task_links(count)`) and `TaskCard`'s meta row.
5. With the MCP, the bucket's current `file_size_limit` (10 MB) and `allowed_mime_types` (images only).

### 2.1 Database
Migration `create_attachments_table`:

```sql
create table public.attachments (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null default auth.uid() references auth.users(id) on delete cascade,
  space_id           uuid not null,
  task_id            uuid not null,
  path               text unique,                        -- Storage path; null = the file stayed at its source
  name               text not null check (char_length(btrim(name)) between 1 and 255),
  mime               text not null default 'application/octet-stream' check (char_length(mime) <= 150),
  size               bigint not null default 0 check (size >= 0),
  width              integer check (width > 0),          -- images only (thumbnails, inline images)
  height             integer check (height > 0),
  source             text not null default 'upload' check (source in ('upload','jira')),
  jira_attachment_id text check (jira_attachment_id ~ '^[0-9]+$'),   -- Feature 17 Phase 4
  external_url       text check (external_url ~* '^https://'),       -- a file left in Jira (too big, or a video)
  created_at         timestamptz not null default now(),
  check (path is not null or external_url is not null),
  unique (id, user_id),
  foreign key (space_id, user_id) references public.spaces(id, user_id) on delete cascade,
  foreign key (task_id, user_id) references public.tasks(id, user_id) on delete cascade
);
create index attachments_task_idx on public.attachments (task_id, created_at);
create index attachments_space_idx on public.attachments (space_id);
create unique index attachments_jira_unique on public.attachments (task_id, jira_attachment_id)
  where jira_attachment_id is not null;
alter table public.attachments enable row level security;
create policy "attachments_owner_all" on public.attachments for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Any file type up to the free plan's 50 MB cap. Videos are refused in the app, not the bucket.
update storage.buckets set file_size_limit = 52428800, allowed_mime_types = null
  where id = 'attachments';
```

- **No `deleted_at`:** a task's files follow the task. Soft-deleting a task keeps them, and a restore brings them back. Deleting a file is permanent (a confirm). Purging a task in Feature 14 deletes its rows by cascade and its Storage objects by path.
- **Paths:** the same `{user_id}/{space_id}/{uuid}.{ext}` as editor images (`ext` from the file name, else from the MIME type, else `bin`).
- **Verify** (rolled back):
  - another user's task or space can't be attached (the composite FKs);
  - a row with neither `path` nor `external_url` is rejected;
  - a duplicate `(task_id, jira_attachment_id)` is rejected.
- **Then:** run the advisors, and update `data-model.md` (the table and the Storage section's new limits) and the DB registry.

### 2.2 API Layer
`src/features/attachments/api.js` (extended):

```js
attachmentKeys.task = (taskId) => [...attachmentKeys.all, 'task', taskId]
attachmentKeys.usage = () => [...attachmentKeys.all, 'usage']
export const MAX_FILE_BYTES = 50 * 1024 * 1024
```

| Function / hook | Details |
|---|---|
| `fetchTaskAttachments(taskId)` / `useTaskAttachments(taskId)` | Rows oldest first, `enabled: !!taskId` |
| `uploadAttachment({ task, file })` | `validateAttachmentFile` (an `AttachmentUploadError`), the image size for images (`readImageSize`, split out of `uploadImage`), upload to the path, then insert the row. If the insert fails, the Storage object is removed. Returns the row |
| `useUploadAttachments()` | Mutation over `{ task, files }`: one file at a time, collecting `{ uploaded, failed }`. Invalidates `task(taskId)`, `usage()` and `taskKeys.lists()` (the card count). One toast at the end ("Attached 3 files", or which ones failed) |
| `deleteAttachment(row)` / `useDeleteAttachment()` | Removes the Storage object (when `path`), then the row. Optimistic removal from `task(taskId)`, rolled back on error |
| `getDownloadUrl(row)` | `createSignedUrl(path, 60, { download: row.name })`. A row with only `external_url` opens that URL instead |
| `fetchAttachmentUsage()` / `useAttachmentUsage()` | `sum(size)` over rows with a `path` (a select of `size`, summed on the client) |

`src/features/attachments/utils.js` (tested):
- `validateAttachmentFile(file)`: videos (`video/*`, or `.mp4`, `.mov`, `.webm`, `.mkv` and `.avi` names) get "Videos aren't supported yet". Over 50 MB gets "Files can be up to 50 MB on the free plan". Empty files are refused.
- `attachmentPath({ userId, spaceId, id, name, mime })`.
- `formatBytes(n)`: "820 KB", "4.2 MB".
- `fileKind(mime, name)`: `image` · `pdf` · `sheet` · `doc` · `archive` · `code` · `other`, for the icon.

### 2.3 Components
```
src/features/attachments/components/
├── TaskAttachments.jsx      # the section: header (count, Attach files), drop zone, list, empty line
├── AttachmentRow.jsx        # icon or thumbnail, name, size · date, Jira badge, download, delete
└── AttachmentIcon.jsx       # lucide icon per fileKind (image, file-text, sheet, file-archive, file-code, file)
```

- **`TaskAttachments({ task })`:**
  - Header: "Attachments" (`font-medium`) with a count, then a ghost **Attach files** button (`paperclip`) that opens a multi-file `<input type="file">`.
  - Dropping files anywhere on the section uploads them. While dragging, the section shows a dashed `border-border-strong` outline.
  - Uploading files show as rows with a spinner (in the row's icon slot) until they're done.
  - **Empty state:** the header and one faint line, "Drop files here or attach them." It's a small section, so no `EmptyState` box.
  - **Loading:** two 40px row skeletons. **Error:** an inline `ErrorState` with retry.
- **`AttachmentRow`:**
  - Layout: 40px tall, `rounded-md`, hover `bg-accent`. It shows the icon (or a 28px `rounded-sm` thumbnail for images, through `useImageUrl`), then the name (truncated, full name on hover), then mono `text-xs` "4.2 MB · 30 Sep". A `JiraKeyBadge`-style "Jira" label appears when `source = 'jira'`, and "In Jira ↗" when the file stayed there.
  - On the right: Download (an icon button with a tooltip) and ⋮ → **Delete** (`destructive`), which opens a `ConfirmDialog`: "Delete this file? It's removed from Axon for good."
  - The whole row downloads on click (a `<button>`, keyboard reachable).
- **Where:**
  - `TaskDetail`: after the description, before the checklist.
  - `TaskDialog` in edit mode: after the checklist, collapsed to the header and the list.
  - Create mode has no section: files need a saved task. Jira import copies its files after saving; see Feature 17 Phase 4.
- **Count:** `LIST_COLUMNS` gains `attachment_count:attachments(count)`, flattened like `note_count`. `TaskCard`'s meta row shows a `paperclip` + n when above 0 (beside the linked-notes count).
- **Settings:** a **Storage** line in Settings → Preferences, "Attachments use 120 MB of the free plan's 1 GB" (`useAttachmentUsage`). Editor images aren't counted; the line says "attachments".
- **Motion:** new rows enter with `listItem`, and deleted ones leave with `AnimatePresence`.

### 2.4 Routes and Integration
- No new routes.
- `TaskDetail.jsx` and `TaskDialog.jsx` (edit mode) mount `TaskAttachments`.
- `TaskCard` shows the count.
- Settings → Preferences gets the Storage line.

### 2.5 Impact on Existing Features
| Existing feature | Impact | Action |
|---|---|---|
| 15 Phase 1 bucket | Wider limits (50 MB, any type) | Editor images keep their own 10 MB image-only check in `validateImageFile` |
| 04 tasks list | New count embed | `LIST_COLUMNS`, `mapRow` |
| 07 task detail | New section | Mounted after the description |
| 14 Trash (later) | Purging a task must remove its files | Recorded in `14-pins-and-trash.md` when that phase is planned |

### 2.6 Not in This Phase
- Video files and a player (skipped, the user's decision); previews for PDFs and other files (download only).
- Attachments on notes or events.
- Upload progress bars (supabase-js has no progress callback; each file shows a spinner).
- Jira (Feature 17 Phase 4); space images (Phase 3).

### 2.7 Checklist: Before Marking Complete
- [x] `create_attachments_table` is applied and mirrored; the rolled-back checks pass; advisors are clean
- [ ] Attach files and drag-and-drop upload several files to a task; they list with icon or thumbnail, name, size and date *(built and component-tested; confirm the real upload in the browser)*
- [x] Videos, empty files and files over 50 MB are refused with a clear toast, and nothing is stored (`validateAttachmentFile` runs before any upload)
- [ ] Download saves the file under its own name; Delete (after the confirm) removes the row and the Storage object *(confirm in the browser)*
- [ ] Cards show the paperclip count; Settings shows the storage used *(confirm in the browser)*
- [x] Soft-deleting and restoring a task keeps its files (nothing touches `attachments` on a soft delete; rows cascade only on a hard delete)
- [x] Tests: `validateAttachmentFile`, `attachmentPath`, `formatBytes`, `fileKind`; a component test for `TaskAttachments` with a mocked API (list, empty, upload row, delete confirm)
- [x] `npm run lint`, `npm test` and `npm run build` pass; `axon-rules` audit is clean
- [x] `00-index.md`, `data-model.md` and `axon-data-patterns.md` §10 are updated

### 2.8 Implementation Notes (2026-09-30)
- **Migration `20260930054405_create_attachments_table`**, as planned, plus `attachments_user_idx` (an index for the `user_id` FK). It also widens the bucket to 50 MB with any MIME type.
  - Rolled-back checks (5/5): another user can't attach to the owner's space (`attachments_space_id_user_id_fkey`); a row with neither `path` nor `external_url` is rejected; a duplicate `(task_id, jira_attachment_id)` is rejected; a second user sees 0 rows under RLS; the bucket reads `52428800` / any type.
  - Advisors: only the 3 existing warnings.
- **API** (`features/attachments/api.js`): the user id comes from a shared `currentUserId()`, now also used by `uploadImage`.
  - `uploadAttachment` removes the stored object if the row insert fails.
  - `useUploadAttachments` uploads one file at a time. Each finished row goes into the task's cache straight away, and `onFileSettled` drops that file's placeholder. There's one toast at the end, plus an error toast naming the failures.
  - `useDeleteAttachment` is optimistic with rollback. It removes the Storage object first, then the row.
  - Downloads use `createSignedUrl(path, 60, { download: name })`, opened through `openLink` (new in `lib/download.js`, a temporary link, so the page stays put). A file left in Jira opens in a new tab.
- **Components:** `TaskAttachments`, `AttachmentRow` and `AttachmentIcon` in `features/attachments/components/`.
  - Where: after the description on the task page; after the checklist in the edit dialog (`border-t px-5 py-4`, like the checklist).
  - Dropping files on the section shows a dashed `outline-border-strong` outline. Pending uploads are rows with a spinner in the icon slot, inside the row's button.
  - **Deviation:** the empty state is one faint line ("Drop files here or attach them."), not an `EmptyState` box. This is a small section inside the task page, as the plan said.
- **Settings:** the Storage row lives in `features/settings/components/StorageUsageRow.jsx`, not in attachments. The audit caught a two-way component import between the features. It shows mono "120 MB of 1 GB" (`useAttachmentUsage`, which sums `size` over rows with a `path`).
- **Tasks list:** `attachment_count:attachments(count)` in `LIST_COLUMNS`. `TaskCard`'s meta row shows `paperclip` + n.
- **Tests:** 4 new utils tests and `src/tests/features/attachments/TaskAttachments.test.jsx` (4: empty, list with the Jira and "In Jira" labels, the uploading row, delete only after the confirm).
- **Added the same day (the user's request): documents alongside images everywhere on a task.**
  - **New-task dialog:** a `StagedAttachments` section holds the chosen files, with Attach files, drop, and ✕ to remove. They're uploaded right after the task is saved (`uploadFiles({ task: row, files })` in `done`), like the staged checklist. Files are checked as they're staged (`useAcceptFiles`, which toasts each refusal). Create more clears them.
  - **Documents dropped or pasted into a description** (the dialog, create or edit, and the task page) go to the task's attachments, staged in create mode. This uses a new editor option, `features.files: { onFiles(files) }` (`setFileHandler` / `takeFiles` in `ImageUpload.js`). With a files handler, an image the text refuses (over 10 MB, or HEIC/SVG) goes to the attachments too.
  - **Every file drop or paste into an editor is now taken.** Before, a dropped PDF fell through to the browser, which would likely have opened it in place of the app. Without a files handler (notes, the journal), the toast says "Only images can go in the text."
  - Tests: `takeFiles` routing (3, in `images.test.jsx`) and `StagedAttachments.test.jsx` (stage, refuse a video, remove).
- **Still to confirm in the browser:**
  - staged files on a new task (uploaded after Create task), and a PDF dropped into a description landing in Attachments;
  - a real upload (several files, drag and drop), the thumbnail for an image, download under the file's own name, delete;
  - a video or a file over 50 MB being refused;
  - the card count and the Settings storage line.

**Stop here. Show the result and wait for approval.**

---

## Phase 3: Space Images

### Outline
- `spaces.image_path` (nullable). The space dialog's identity picker gets **Emoji · Image**, and the image is cropped square on upload.
- `SpaceIcon` renders the image (signed URL, cached) when set, else the emoji.

---

## Data Model Summary (after all phases)

```
storage bucket "attachments"   ({user_id}/{space_id}/{uuid}.{ext}, private, signed URLs)
tasks 1 ── n attachments       (Phase 2)
spaces.image_path               (Phase 3)
editor docs (notes.content, tasks.description) reference images by path in `image` nodes
```

### Storage: `attachments` bucket
| Setting | Value |
|---|---|
| public | false (signed URLs, 1 hour) |
| file_size_limit | 10 MB (Phase 1) |
| allowed_mime_types | png, jpeg, webp, gif (Phase 1) |
| policies | owner-only select, insert, update and delete on the first path segment |

---

## Out of Scope (All Phases)
- Public share links for images or files: Axon is single-user.
- Video and audio embeds: backlog.
- Image editing (crop, annotate): backlog.
- Import and export of all media: Feature 19.

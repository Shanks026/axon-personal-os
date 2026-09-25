# Feature 15: Attachments and Media

**Product**: Axon, a personal second-brain OS
**File**: `.claude/features/15-attachments-and-media.md`
**Status**: 🟡 In progress (Phase 1 ✅ 2026-09-25, pulled forward at the user's request; Phases 2–3 later)
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

## Phase 2: File Attachments on Tasks

### Goal
The task dialog (and later the task detail page, 07) gets an "Attach" chip. The user uploads any file (up to 25 MB), sees the files listed with type icon, name, size and date, can download one (signed URL) or delete it (removed from Storage too). Cards show a paperclip count.

### Outline (detailed when Phase 1 is approved)
- `attachments` table: `id`, `user_id`, `space_id`, `task_id` (composite FK, cascade), `path`, `name`, `mime`, `size`, `created_at`, owner RLS. The bucket's MIME list and size limit widen (or a second `files` bucket is added).
- `useTaskAttachments(taskId)`, `useUploadAttachment`, `useDeleteAttachment` (the Storage object and the row).
- Soft-deleting a task keeps its files, and a restore brings them back. Purge (14) deletes them.

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

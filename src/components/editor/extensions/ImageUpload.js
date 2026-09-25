import { Extension } from '@tiptap/react'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { toast } from 'sonner'

/**
 * Points the editor at the feature's image handlers (`features.images`: `validate`, `upload`,
 * `resolveUrl`), or at nothing (images off). `RichTextEditor` calls it whenever they change.
 */
export function setImageHandlers(editor, handlers) {
  editor.storage.imageUpload.handlers = handlers ?? null
}

/** The node (and its position) carrying a given `uploadId`, if it's still in the doc. */
function findUpload(state, uploadId) {
  let found = null
  state.doc.descendants((node, pos) => {
    if (found) return false
    if (node.type.name === 'image' && node.attrs.uploadId === uploadId) {
      found = { node, pos }
      return false
    }
    return true
  })
  return found
}

/**
 * Inserts image files at `pos` (or the selection): each valid file appears at once as a local
 * preview (`uploadId`), uploads through `handlers.upload`, then becomes a stored image
 * (`path`, `width`, `height`). A bad file or a failed upload shows a toast and leaves nothing.
 * Returns true when at least one image was taken.
 */
export function insertImageFiles(editor, files, pos) {
  const storage = editor.storage.imageUpload
  const handlers = storage.handlers
  if (!handlers) return false
  const images = [...files].filter((f) => f.type.startsWith('image/'))
  if (!images.length) return false

  let at = pos
  for (const file of images) {
    const problem = handlers.validate?.(file)
    if (problem) {
      toast.error(problem)
      continue
    }
    const uploadId = crypto.randomUUID()
    const preview = URL.createObjectURL(file)
    storage.previews.set(uploadId, preview)
    const node = { type: 'image', attrs: { uploadId, alt: '' } }
    if (at == null) editor.chain().focus().insertContent(node).run()
    else {
      editor.chain().focus().insertContentAt(at, node).run()
      at = undefined // the rest follow the first, at the new selection
    }

    handlers.upload(file).then(
      ({ path, width, height }) => {
        if (editor.isDestroyed) return
        // Keep showing the local copy for this path: no flash while a signed URL loads.
        storage.previews.set(path, preview)
        const found = findUpload(editor.state, uploadId)
        if (!found) return
        editor.view.dispatch(
          editor.state.tr.setNodeMarkup(found.pos, undefined, {
            ...found.node.attrs,
            path,
            width,
            height,
            uploadId: null,
          }),
        )
      },
      (err) => {
        toast.error(err?.message ?? 'Couldn’t upload the image')
        storage.previews.delete(uploadId)
        URL.revokeObjectURL(preview)
        if (editor.isDestroyed) return
        const found = findUpload(editor.state, uploadId)
        if (found) editor.view.dispatch(editor.state.tr.delete(found.pos, found.pos + 1))
      },
    )
  }
  return true
}

/** Opens the file picker (the "/ Image" item) and inserts what's chosen. */
export function pickImageFiles(editor) {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/png,image/jpeg,image/webp,image/gif'
  input.multiple = true
  input.onchange = () => {
    if (input.files?.length) insertImageFiles(editor, input.files)
  }
  input.click()
}

/**
 * Drops image nodes that are still uploading (no `path` yet) from a doc before it's saved, so a
 * note left mid-upload never stores a placeholder. The finished upload saves again.
 */
export function stripPendingImages(doc) {
  if (!doc?.content) return doc
  const walk = (nodes) =>
    nodes
      .filter((n) => !(n.type === 'image' && !n.attrs?.path))
      .map((n) => (n.content ? { ...n, content: walk(n.content) } : n))
  return { ...doc, content: walk(doc.content) }
}

/**
 * Paste and drop of image files (screenshots, files from the desktop). Pasting text or HTML is
 * untouched: a clipboard with plain text is left to the normal paste. Off without handlers.
 */
export const ImageUpload = Extension.create({
  name: 'imageUpload',

  addOptions() {
    return { handlers: null }
  },

  // Seeded from the options, so image views have their handlers on the very first render.
  addStorage() {
    return { handlers: this.options.handlers, previews: new Map() }
  },

  onDestroy() {
    for (const url of new Set(this.storage.previews.values())) URL.revokeObjectURL(url)
    this.storage.previews.clear()
  },

  addProseMirrorPlugins() {
    const editor = this.editor
    return [
      new Plugin({
        key: new PluginKey('imageUpload'),
        props: {
          handlePaste: (_view, event) => {
            const data = event.clipboardData
            if (!data?.files?.length || data.getData('text/plain')) return false
            return insertImageFiles(editor, data.files)
          },
          handleDrop: (view, event, _slice, moved) => {
            if (moved || !event.dataTransfer?.files?.length) return false
            const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos
            const taken = insertImageFiles(editor, event.dataTransfer.files, pos)
            if (taken) event.preventDefault()
            return taken
          },
        },
      }),
    ]
  },
})

import { useEffect, useState } from 'react'
import { NodeViewWrapper } from '@tiptap/react'
import { ImageOff, Loader2, RotateCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

/** Resolves a stored image's `path` to a URL through the editor's handlers (cached upstream). */
function useResolvedUrl(editor, path, preview) {
  const [state, setState] = useState({ path: null, url: null, failed: false })
  const [attempt, setAttempt] = useState(0)
  const resolveUrl = editor.storage.imageUpload?.handlers?.resolveUrl

  useEffect(() => {
    if (!path || preview || !resolveUrl) return undefined
    let live = true
    resolveUrl(path).then(
      (url) => live && setState({ path, url, failed: false }),
      () => live && setState({ path, url: null, failed: true }),
    )
    return () => {
      live = false
    }
  }, [path, preview, resolveUrl, attempt])

  const current = state.path === path ? state : { url: null, failed: false }
  return {
    url: preview ?? current.url,
    // No handlers (an editor without images) can't resolve a stored image either.
    failed: !preview && (current.failed || (!!path && !resolveUrl)),
    retry: () => {
      setState({ path: null, url: null, failed: false })
      setAttempt((n) => n + 1)
    },
  }
}

/** Inline "Alt text" editor shown on a selected image. */
function AltTextField({ value, onSave }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(value)
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setText(value)
          setOpen(true)
        }}
        className="rounded-md bg-background/90 px-2 py-1 text-xs text-muted-foreground shadow-xs outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        {value ? 'Edit alt text' : 'Alt text'}
      </button>
    )
  }
  const save = () => {
    onSave(text.trim())
    setOpen(false)
  }
  return (
    <input
      autoFocus
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        // Keep keys away from the editor while typing here.
        e.stopPropagation()
        if (e.key === 'Enter') save()
        if (e.key === 'Escape') setOpen(false)
      }}
      placeholder="Describe the image"
      aria-label="Alt text"
      className="h-7 w-64 max-w-full rounded-md border bg-background px-2 text-xs shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
    />
  )
}

/**
 * Node view for `ImageBlock`: the uploading preview (faded, with a spinner), the stored image
 * via a signed URL, or "Image unavailable" with a retry. Its natural size reserves the space
 * (aspect ratio), and it never grows past the column. Selected: an accent ring, plus alt text.
 */
export function ImageBlockView({ node, editor, selected, updateAttributes }) {
  const { path, alt, width, height, uploadId } = node.attrs
  const previews = editor.storage.imageUpload?.previews
  const preview = previews?.get(uploadId) ?? previews?.get(path) ?? null
  const { url, failed, retry } = useResolvedUrl(editor, path, preview)
  const uploading = !!uploadId
  // A node with neither a stored path nor an upload in flight has nothing to show.
  const unavailable = failed || (!path && !uploading)
  const box = {
    width: width ? `${width}px` : undefined,
    aspectRatio: width && height ? `${width} / ${height}` : undefined,
  }

  return (
    <NodeViewWrapper className="axon-image" data-drag-handle>
      <div
        className={cn(
          'relative max-w-full rounded-lg',
          selected && 'ring-2 ring-ring ring-offset-2 ring-offset-background',
        )}
        style={box}
      >
        {unavailable ? (
          <div className="flex min-h-24 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border-strong bg-muted p-4 text-muted-foreground">
            <ImageOff className="size-4" aria-hidden />
            <span className="text-xs">Image unavailable</span>
            {path && editor.storage.imageUpload?.handlers && (
              <button
                type="button"
                contentEditable={false}
                onClick={retry}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
              >
                <RotateCw className="size-3" aria-hidden />
                Retry
              </button>
            )}
          </div>
        ) : url ? (
          <img
            src={url}
            alt={alt ?? ''}
            loading="lazy"
            draggable={false}
            className={cn('block h-auto w-full rounded-lg', uploading && 'opacity-50')}
          />
        ) : (
          <Skeleton
            className="min-h-24 w-full rounded-lg"
            style={{ aspectRatio: box.aspectRatio }}
          />
        )}

        {uploading && (
          <span
            className="absolute inset-0 flex items-center justify-center"
            role="status"
            aria-label="Uploading image"
          >
            <Loader2 className="size-5 animate-spin text-foreground" aria-hidden />
          </span>
        )}

        {selected && editor.isEditable && !uploading && path && (
          <div contentEditable={false} className="absolute bottom-2 left-2">
            <AltTextField value={alt ?? ''} onSave={(v) => updateAttributes({ alt: v })} />
          </div>
        )}
      </div>
    </NodeViewWrapper>
  )
}

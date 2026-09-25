import { useEffect, useRef } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import { cn } from '@/lib/utils'
import { EditorBubbleMenu } from '@/components/editor/EditorBubbleMenu'
import { TableBubbleMenu } from '@/components/editor/TableBubbleMenu'
import { buildExtensions } from '@/components/editor/extensions/buildExtensions'
import { setImageHandlers, stripPendingImages } from '@/components/editor/extensions/ImageUpload'
import { setSaveHandler } from '@/components/editor/extensions/KeyboardShortcuts'
import '@/components/editor/editor.css'

const DEFAULT_FEATURES = { slash: true, codeHighlight: true }
const MAX_TEXT = 100_000

/**
 * The shared Tiptap editor (notes now; task descriptions, journal and reports later).
 * `value` (a Tiptap JSON doc) is read once on mount: the editor is uncontrolled afterwards, so
 * remount it with `key={entity.id}` to load another document. `onChange(json, text)` fires on
 * every edit with the doc and its plain text (blocks separated by newlines, capped at 100k).
 * `onEditorReady(editor)` hands the instance to the page (focus, Ctrl+S, Copy as Markdown).
 * `label` is the editable area's accessible name. `features` (read once, merged over the
 * defaults `{ slash: true, codeHighlight: true }`) may add `onSave`, called on Ctrl/Cmd+S;
 * the latest `onSave` is always used. `features.images` (`{ validate, upload, resolveUrl }`)
 * turns on image paste, drop and "/ Image"; images still uploading are left out of `onChange`.
 *
 * `variant="compact"` is the task dialog's description: `text-sm`, no minimum height, the
 * placeholder "Add description…", H2–H3 only, no H1 or Table in the `/` menu, and Mod-Enter left
 * to the dialog's form. Its popups stay inside the dialog (see `suggestionRenderer`).
 */
export function RichTextEditor({
  value,
  onChange,
  variant = 'full',
  placeholder,
  editable = true,
  features,
  autofocus = false,
  onEditorReady,
  label = 'Editor',
  className,
}) {
  const compact = variant === 'compact'
  const onChangeRef = useRef(onChange)
  const onReadyRef = useRef(onEditorReady)
  useEffect(() => {
    onChangeRef.current = onChange
    onReadyRef.current = onEditorReady
  })

  const editor = useEditor({
    extensions: buildExtensions({
      placeholder: placeholder ?? (compact ? 'Add description…' : "Type '/' for commands"),
      features: { ...DEFAULT_FEATURES, ...features, compact },
    }),
    content: value ?? '',
    editable,
    autofocus,
    // Client-only app: render straight away, and don't re-render React on every keystroke
    // (the bubble menu subscribes to what it needs through useEditorState).
    immediatelyRender: true,
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: {
        class: compact ? 'axon-prose axon-prose-compact' : 'axon-prose',
        'aria-label': label,
      },
    },
    onUpdate: ({ editor: e }) =>
      onChangeRef.current?.(
        stripPendingImages(e.getJSON()),
        e.getText({ blockSeparator: '\n' }).slice(0, MAX_TEXT),
      ),
  })

  useEffect(() => {
    if (editor) onReadyRef.current?.(editor)
  }, [editor])

  // Ctrl/Cmd+S inside the editor calls the latest onSave (KeyboardShortcuts reads it from storage).
  const onSave = features?.onSave
  const images = features?.images
  useEffect(() => {
    if (editor) setImageHandlers(editor, images)
  }, [editor, images])
  useEffect(() => {
    if (editor) setSaveHandler(editor, onSave)
  }, [editor, onSave])

  useEffect(() => {
    if (editor && editor.isEditable !== editable) editor.setEditable(editable)
  }, [editor, editable])

  return (
    <div className={cn('relative', className)}>
      <EditorContent editor={editor} />
      {editor && editable && <EditorBubbleMenu editor={editor} compact={compact} />}
      {editor && editable && <TableBubbleMenu editor={editor} />}
    </div>
  )
}

import { useEffect, useRef } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import { cn } from '@/lib/utils'
import { EditorBubbleMenu } from '@/components/editor/EditorBubbleMenu'
import { buildExtensions } from '@/components/editor/extensions/buildExtensions'
import '@/components/editor/editor.css'

const DEFAULT_FEATURES = { slash: true }
const MAX_TEXT = 100_000

/**
 * The shared Tiptap editor (notes now; task descriptions, journal and reports later).
 * `value` (a Tiptap JSON doc) is read once on mount: the editor is uncontrolled afterwards, so
 * remount it with `key={entity.id}` to load another document. `onChange(json, text)` fires on
 * every edit with the doc and its plain text (blocks separated by newlines, capped at 100k).
 * `onEditorReady(editor)` hands the instance to the page (focus, Ctrl+S, Copy as Markdown).
 * `label` is the editable area's accessible name.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder = "Type '/' for commands",
  editable = true,
  features = DEFAULT_FEATURES,
  autofocus = false,
  onEditorReady,
  label = 'Editor',
  className,
}) {
  const onChangeRef = useRef(onChange)
  const onReadyRef = useRef(onEditorReady)
  useEffect(() => {
    onChangeRef.current = onChange
    onReadyRef.current = onEditorReady
  })

  const editor = useEditor({
    extensions: buildExtensions({ placeholder, features }),
    content: value ?? '',
    editable,
    autofocus,
    // Client-only app: render straight away, and don't re-render React on every keystroke
    // (the bubble menu subscribes to what it needs through useEditorState).
    immediatelyRender: true,
    shouldRerenderOnTransaction: false,
    editorProps: { attributes: { class: 'axon-prose', 'aria-label': label } },
    onUpdate: ({ editor: e }) =>
      onChangeRef.current?.(e.getJSON(), e.getText({ blockSeparator: '\n' }).slice(0, MAX_TEXT)),
  })

  useEffect(() => {
    if (editor) onReadyRef.current?.(editor)
  }, [editor])

  useEffect(() => {
    if (editor && editor.isEditable !== editable) editor.setEditable(editable)
  }, [editor, editable])

  return (
    <div className={cn('relative', className)}>
      <EditorContent editor={editor} />
      {editor && editable && <EditorBubbleMenu editor={editor} />}
    </div>
  )
}

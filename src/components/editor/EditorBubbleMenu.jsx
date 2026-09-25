import { useEffect, useMemo, useState } from 'react'
import { useEditorState } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import { NodeSelection } from '@tiptap/pm/state'
import {
  Bold,
  Check,
  ChevronDown,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  Link,
  List,
  ListChecks,
  ListOrdered,
  Pilcrow,
  SquareCheckBig,
  Strikethrough,
  TextQuote,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { EDIT_LINK_EVENT } from '@/components/editor/extensions/KeyboardShortcuts'
import { mentionNode } from '@/components/editor/extensions/TaskMention'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const MARKS = [
  { id: 'bold', label: 'Bold', icon: Bold, run: (c) => c.toggleBold() },
  { id: 'italic', label: 'Italic', icon: Italic, run: (c) => c.toggleItalic() },
  { id: 'strike', label: 'Strikethrough', icon: Strikethrough, run: (c) => c.toggleStrike() },
  { id: 'code', label: 'Inline code', icon: Code, run: (c) => c.toggleCode() },
]

const TURN_INTO = [
  { id: 'paragraph', label: 'Text', icon: Pilcrow, run: (c) => c.setParagraph() },
  { id: 'h1', label: 'Heading 1', icon: Heading1, run: (c) => c.setNode('heading', { level: 1 }) },
  { id: 'h2', label: 'Heading 2', icon: Heading2, run: (c) => c.setNode('heading', { level: 2 }) },
  { id: 'h3', label: 'Heading 3', icon: Heading3, run: (c) => c.setNode('heading', { level: 3 }) },
  { id: 'bulletList', label: 'Bulleted list', icon: List, run: (c) => c.toggleBulletList() },
  {
    id: 'orderedList',
    label: 'Numbered list',
    icon: ListOrdered,
    run: (c) => c.toggleOrderedList(),
  },
  { id: 'taskList', label: 'Checklist', icon: ListChecks, run: (c) => c.toggleTaskList() },
  { id: 'blockquote', label: 'Quote', icon: TextQuote, run: (c) => c.toggleBlockquote() },
]

/** The current block, for the "Turn into" label and check. Lists win over their paragraphs. */
function currentBlock(editor) {
  for (const id of ['taskList', 'bulletList', 'orderedList', 'blockquote']) {
    if (editor.isActive(id)) return id
  }
  for (const level of [1, 2, 3]) if (editor.isActive('heading', { level })) return `h${level}`
  return 'paragraph'
}

/** Shown for a non-empty text selection, never inside a code block or on a selected node. */
function shouldShow({ editor, state, from, to }) {
  const { selection } = state
  if (!editor.isEditable || selection.empty || selection instanceof NodeSelection) return false
  if (editor.isActive('codeBlock')) return false
  if (!state.doc.textBetween(from, to).trim()) return false
  return editor.view.hasFocus() || editor.view.dom.parentElement?.contains(document.activeElement)
}

function ToolButton({ label, pressed, onClick, children }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          aria-pressed={pressed}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onClick}
          className={cn(
            'flex size-7 items-center justify-center rounded-md text-foreground outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring',
            pressed && 'bg-accent',
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

/** Inline URL field that replaces the buttons while editing a link. Empty removes the link. */
function LinkField({ editor, onDone }) {
  const [url, setUrl] = useState(() => editor.getAttributes('link').href ?? '')
  const apply = () => {
    const href = url.trim()
    const chain = editor.chain().focus().extendMarkRange('link')
    if (href) chain.setLink({ href }).run()
    else chain.unsetLink().run()
    onDone()
  }
  return (
    <form
      className="flex items-center gap-1 px-1"
      onSubmit={(e) => {
        e.preventDefault()
        apply()
      }}
    >
      <input
        autoFocus
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault()
            editor.commands.focus()
            onDone()
          }
        }}
        placeholder="Paste a link…"
        aria-label="Link URL"
        className="h-7 w-56 bg-transparent px-1 outline-none placeholder:text-faint"
      />
      <button
        type="submit"
        aria-label="Apply link"
        className="flex size-7 items-center justify-center rounded-md outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Check className="size-3.5" />
      </button>
    </form>
  )
}

/**
 * Selection toolbar (design 07b): bold, italic, strike, code, link, H2 and highlight, then a
 * "Turn into" menu, and "Make task" when the editor has task mentions (design D2): the selected
 * text becomes a new task and is replaced by its mention chip. Underline stays on Mod+U; Mod+K
 * opens the link field. Buttons keep the editor's focus (mousedown is
 * prevented), and the menu re-reads the active marks through `useEditorState`, since the editor
 * doesn't re-render on every transaction.
 */
export function EditorBubbleMenu({ editor, compact = false }) {
  const [editingLink, setEditingLink] = useState(false)
  const active = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      strike: e.isActive('strike'),
      code: e.isActive('code'),
      link: e.isActive('link'),
      h2: e.isActive('heading', { level: 2 }),
      highlight: e.isActive('highlight'),
      block: currentBlock(e),
    }),
  })
  // Stable: the BubbleMenu re-sends its options whenever they change identity.
  const options = useMemo(
    () => ({ placement: 'top', offset: 8, onHide: () => setEditingLink(false) }),
    [],
  )

  // Mod-k with text selected (KeyboardShortcuts) opens the link field.
  useEffect(() => {
    const open = () => setEditingLink(true)
    editor.on(EDIT_LINK_EVENT, open)
    return () => {
      editor.off(EDIT_LINK_EVENT, open)
    }
  }, [editor])

  const run = (fn) => fn(editor.chain().focus()).run()
  const mentions = editor.storage.taskMention?.config
  const makeTask = () => {
    const { from, to } = editor.state.selection
    const title = editor.state.doc
      .textBetween(from, to, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 300)
    if (!title) return
    mentions.create(title).then(
      (task) => editor.chain().focus().insertContentAt({ from, to }, mentionNode(task)).run(),
      (err) => toast.error(err?.message ?? 'Couldn’t create the task'),
    )
  }
  // The compact editor (task descriptions) has no Heading 1.
  const turnInto = compact ? TURN_INTO.filter((b) => b.id !== 'h1') : TURN_INTO
  const block = turnInto.find((b) => b.id === active.block) ?? turnInto[0]

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={shouldShow}
      options={options}
      className="z-40 flex h-9 items-center gap-0.5 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md"
    >
      {editingLink ? (
        <LinkField editor={editor} onDone={() => setEditingLink(false)} />
      ) : (
        <>
          {MARKS.map((m) => (
            <ToolButton
              key={m.id}
              label={m.label}
              pressed={active[m.id]}
              onClick={() => run(m.run)}
            >
              <m.icon className="size-3.5" />
            </ToolButton>
          ))}
          <ToolButton label="Link" pressed={active.link} onClick={() => setEditingLink(true)}>
            <Link className="size-3.5" />
          </ToolButton>
          <ToolButton
            label="Heading 2"
            pressed={active.h2}
            onClick={() => run((c) => c.toggleHeading({ level: 2 }))}
          >
            <Heading2 className="size-3.5" />
          </ToolButton>
          <ToolButton
            label="Highlight"
            pressed={active.highlight}
            onClick={() => run((c) => c.toggleHighlight())}
          >
            <Highlighter className="size-3.5" />
          </ToolButton>
          <span aria-hidden className="mx-0.5 h-4 w-px bg-border" />
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Turn into"
                onMouseDown={(e) => e.preventDefault()}
                className="flex h-7 items-center gap-1 rounded-md px-2 whitespace-nowrap outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-accent"
              >
                {block.label}
                <ChevronDown className="size-3.5 text-faint" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              {turnInto.map((b) => (
                <DropdownMenuItem key={b.id} onSelect={() => run(b.run)}>
                  <b.icon />
                  <span className="flex-1">{b.label}</span>
                  {b.id === active.block && <Check className="size-3.5" aria-label="Current" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {mentions && (
            <>
              <span aria-hidden className="mx-0.5 h-4 w-px bg-border" />
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={makeTask}
                className="flex h-7 items-center gap-1.5 rounded-md px-2 whitespace-nowrap outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
              >
                <SquareCheckBig className="size-3.5" aria-hidden />
                Make task
              </button>
            </>
          )}
        </>
      )}
    </BubbleMenu>
  )
}

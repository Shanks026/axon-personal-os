import { useCallback } from 'react'
import { BubbleMenu } from '@tiptap/react/menus'
import {
  ArrowDownToLine,
  ArrowLeftToLine,
  ArrowRightToLine,
  ArrowUpToLine,
  Columns3,
  Heading,
  Rows3,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const ACTIONS = [
  { label: 'Add row above', icon: ArrowUpToLine, run: (c) => c.addRowBefore() },
  { label: 'Add row below', icon: ArrowDownToLine, run: (c) => c.addRowAfter() },
  { label: 'Delete row', icon: Rows3, run: (c) => c.deleteRow(), destructive: true },
  'divider',
  { label: 'Add column left', icon: ArrowLeftToLine, run: (c) => c.addColumnBefore() },
  { label: 'Add column right', icon: ArrowRightToLine, run: (c) => c.addColumnAfter() },
  { label: 'Delete column', icon: Columns3, run: (c) => c.deleteColumn(), destructive: true },
  'divider',
  { label: 'Toggle header row', icon: Heading, run: (c) => c.toggleHeaderRow() },
  { label: 'Delete table', icon: Trash2, run: (c) => c.deleteTable(), destructive: true },
]

const shouldShow = ({ editor }) =>
  editor.isEditable && editor.isActive('table') && editor.view.hasFocus()
const OPTIONS = { placement: 'bottom-start', offset: 6, flip: false }

/** The table the selection is in, for anchoring the menu under it. */
function tableElement(editor) {
  const { node } = editor.view.domAtPos(editor.state.selection.from)
  const el = node.nodeType === 1 ? node : node.parentElement
  return el?.closest('table') ?? null
}

/**
 * Table controls (Phase 2): shown under the table while the cursor is in one. Rows and columns
 * are added or deleted around the current cell; Tab and Shift+Tab move between cells (built into
 * the Table extension). Anchored to the table, so it never collides with the text bubble menu,
 * which sits above a selection.
 */
export function TableBubbleMenu({ editor }) {
  const run = (fn) => fn(editor.chain().focus()).run()
  // Stable props: the BubbleMenu re-sends its options whenever these change identity.
  const anchor = useCallback(() => {
    const table = tableElement(editor)
    return table ? { getBoundingClientRect: () => table.getBoundingClientRect() } : null
  }, [editor])

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="tableMenu"
      shouldShow={shouldShow}
      getReferencedVirtualElement={anchor}
      options={OPTIONS}
      className="z-30 flex h-9 items-center gap-0.5 rounded-lg border bg-popover p-1 text-popover-foreground shadow-md"
    >
      {ACTIONS.map((a, i) =>
        a === 'divider' ? (
          <span key={i} aria-hidden className="mx-0.5 h-4 w-px bg-border" />
        ) : (
          <Tooltip key={a.label}>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={a.label}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => run(a.run)}
                className={cn(
                  'flex size-7 items-center justify-center rounded-md outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring',
                  a.destructive && 'hover:text-destructive',
                )}
              >
                <a.icon className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>{a.label}</TooltipContent>
          </Tooltip>
        ),
      )}
    </BubbleMenu>
  )
}

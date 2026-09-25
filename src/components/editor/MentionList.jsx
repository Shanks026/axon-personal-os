import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { scaleIn } from '@/components/motion/presets'

/**
 * The `[[` task search list (design 07b "Link a task"), rendered by the TaskMention suggestion.
 * Rows come from `features.taskMentions.search` (`{ id, label, icon, iconClassName, hint }`); a
 * "Create task '…'" row follows when the query matches no title exactly. Keyboard: ↑ ↓ Enter
 * (the plugin handles Esc). The ref exposes `onKeyDown`.
 */
export function MentionList({ items, query, loading, command, ref }) {
  const trimmed = (query ?? '').trim()
  const canCreate =
    trimmed.length > 0 && !items.some((t) => t.label.toLowerCase() === trimmed.toLowerCase())
  const rows = canCreate ? [...items, { create: trimmed }] : items
  const [selected, setSelected] = useState(0)
  const [prevRows, setPrevRows] = useState(rows.length)
  const listRef = useRef(null)

  if (rows.length !== prevRows) {
    setPrevRows(rows.length)
    setSelected(0)
  }

  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (!rows.length) return false
      if (event.key === 'ArrowDown') {
        setSelected((i) => (i + 1) % rows.length)
        return true
      }
      if (event.key === 'ArrowUp') {
        setSelected((i) => (i - 1 + rows.length) % rows.length)
        return true
      }
      if (event.key === 'Enter') {
        command(rows[selected])
        return true
      }
      return false
    },
  }))

  return (
    <motion.div
      variants={scaleIn}
      initial="initial"
      animate="animate"
      className="w-95 rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-md"
    >
      <p className="px-2 pt-1.5 pb-1 text-xs font-medium text-faint">Link a task</p>
      {loading && rows.length === 0 ? (
        <p className="px-2 py-2 text-muted-foreground">Searching…</p>
      ) : rows.length === 0 ? (
        <p className="px-2 py-2 text-muted-foreground">No tasks</p>
      ) : (
        <div ref={listRef} role="listbox" aria-label="Tasks" className="max-h-80 overflow-y-auto">
          {rows.map((row, i) => (
            <button
              key={row.create ? 'create' : row.id}
              type="button"
              role="option"
              aria-selected={i === selected}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setSelected(i)}
              onClick={() => command(row)}
              className={cn(
                'flex h-9 w-full items-center gap-2.5 rounded-md px-2 text-left outline-none',
                i === selected && 'bg-accent',
                row.create && 'mt-1 border-t text-muted-foreground',
              )}
            >
              {row.create ? (
                <>
                  <Plus className="size-3.5 shrink-0" aria-hidden />
                  <span className="truncate">Create task “{row.create}”</span>
                </>
              ) : (
                <>
                  {row.icon && (
                    <row.icon className={cn('size-3.5 shrink-0', row.iconClassName)} aria-hidden />
                  )}
                  <span className="min-w-0 flex-1 truncate">{row.label}</span>
                  {row.hint && <span className="shrink-0 text-xs text-faint">{row.hint}</span>}
                </>
              )}
            </button>
          ))}
        </div>
      )}
    </motion.div>
  )
}

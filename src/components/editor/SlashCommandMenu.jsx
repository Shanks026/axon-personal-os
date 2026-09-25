import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { scaleIn } from '@/components/motion/presets'

/**
 * The `/` menu's list (design 07b "Blocks"), rendered by the slash suggestion. Keyboard-driven:
 * ↑ ↓ move, Enter inserts (the suggestion plugin handles Esc). The ref exposes `onKeyDown`.
 */
export function SlashCommandMenu({ items, command, ref }) {
  const [selected, setSelected] = useState(0)
  const [prevItems, setPrevItems] = useState(items)
  const listRef = useRef(null)

  // A new query resets the highlight to the first match.
  if (items !== prevItems) {
    setPrevItems(items)
    setSelected(0)
  }

  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (!items.length) return false
      if (event.key === 'ArrowDown') {
        setSelected((i) => (i + 1) % items.length)
        return true
      }
      if (event.key === 'ArrowUp') {
        setSelected((i) => (i - 1 + items.length) % items.length)
        return true
      }
      if (event.key === 'Enter') {
        command(items[selected])
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
      className="w-70 rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-md"
    >
      <p className="px-2 pt-1.5 pb-1 text-xs font-medium text-faint">Blocks</p>
      {items.length === 0 ? (
        <p className="px-2 py-2 text-muted-foreground">No matches</p>
      ) : (
        <div
          ref={listRef}
          role="listbox"
          aria-label="Insert block"
          className="max-h-80 overflow-y-auto"
        >
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-selected={i === selected}
              // Keep the editor's focus and selection; the click inserts.
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setSelected(i)}
              onClick={() => command(item)}
              className={cn(
                'flex h-9 w-full items-center gap-2.5 rounded-md px-2 text-left outline-none',
                i === selected && 'bg-accent',
              )}
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground">
                <item.icon className="size-3.5" aria-hidden />
              </span>
              <span className="flex-1 truncate">{item.title}</span>
              {item.hint && <span className="font-mono text-xs text-faint">{item.hint}</span>}
            </button>
          ))}
        </div>
      )}
    </motion.div>
  )
}

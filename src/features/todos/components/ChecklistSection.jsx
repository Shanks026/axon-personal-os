import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { springs } from '@/components/motion/presets'
import { useTodos } from '@/features/todos/api'
import { ChecklistProgressBadge } from '@/features/todos/components/ChecklistProgressBadge'
import { StagedChecklist } from '@/features/todos/components/StagedChecklist'
import { TodoChecklist } from '@/features/todos/components/TodoChecklist'

/**
 * The collapsible "Checklist" section of `TaskDialog`. Editing a task, it wraps the live
 * `TodoChecklist` (saves as you go). Creating one, pass `staged` ({ items, onChange }) instead:
 * the titles are held in the dialog and saved after the task is created.
 */
export function ChecklistSection({ taskId, spaceId, staged }) {
  const [open, setOpen] = useState(true)
  // Same query (and cache entry) as the TodoChecklist below; read here for the header's progress.
  // Disabled without a taskId (create mode).
  const { data: items = [] } = useTodos({ taskId })
  const done = items.filter((t) => t.is_done).length
  return (
    <div className="border-t px-5 py-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex h-6 items-center gap-1.5 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronRight
          className={cn('size-4 text-muted-foreground transition-transform', open && 'rotate-90')}
          aria-hidden
        />
        <span className="font-medium">Checklist</span>
        {staged ? (
          staged.items.length > 0 && (
            <span className="text-muted-foreground">· {staged.items.length}</span>
          )
        ) : items.length > 0 ? (
          <ChecklistProgressBadge progress={{ done, total: items.length }} />
        ) : (
          <span className="text-muted-foreground">· saves as you go</span>
        )}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={springs.gentle}
            className="overflow-hidden"
          >
            {staged ? (
              <StagedChecklist items={staged.items} onChange={staged.onChange} />
            ) : (
              <TodoChecklist taskId={taskId} spaceId={spaceId} showTitle={false} className="mt-2" />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

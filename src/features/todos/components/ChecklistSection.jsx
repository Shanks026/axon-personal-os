import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { springs } from '@/components/motion/presets'
import { useTodos } from '@/features/todos/api'
import { ChecklistProgress } from '@/features/todos/components/ChecklistProgress'
import { TodoChecklist } from '@/features/todos/components/TodoChecklist'

/**
 * The collapsible "Checklist" section mounted in `TaskDialog` (edit mode). Wraps `TodoChecklist`
 * with a disclosure header and a hint that it saves independently of the dialog's own submit.
 */
export function ChecklistSection({ taskId, spaceId }) {
  const [open, setOpen] = useState(true)
  // Same query (and cache entry) as the TodoChecklist below; read here for the header's progress.
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
        {items.length > 0 ? (
          <ChecklistProgress done={done} total={items.length} />
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
            <TodoChecklist taskId={taskId} spaceId={spaceId} showTitle={false} className="mt-2" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

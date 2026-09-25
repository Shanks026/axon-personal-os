import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { springs } from '@/components/motion/presets'
import { TodoChecklist } from '@/features/todos/components/TodoChecklist'

/**
 * The collapsible "Checklist" section mounted in `TaskDialog` (edit mode). Wraps `TodoChecklist`
 * with a disclosure header and a hint that it saves independently of the dialog's own submit.
 */
export function ChecklistSection({ taskId, spaceId }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="border-t px-5 py-3.5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex h-6 items-center gap-1.5 text-xs text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronRight
          className={cn('size-3.5 text-faint transition-transform', open && 'rotate-90')}
          aria-hidden
        />
        Checklist saves as you go
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
            <TodoChecklist taskId={taskId} spaceId={spaceId} className="mt-2" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

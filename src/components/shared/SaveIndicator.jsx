import { Check, CircleAlert } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { fadeIn } from '@/components/motion/presets'
import { cn } from '@/lib/utils'

const COPY = { saving: 'Saving…', saved: 'Saved', error: 'Not saved' }

/** Quiet save status for autosaving surfaces: 'idle' | 'saving' | 'saved' | 'error'. */
export function SaveIndicator({ status, className }) {
  return (
    <span className={cn('inline-flex h-5 items-center', className)} aria-live="polite">
      <AnimatePresence mode="wait" initial={false}>
        {status !== 'idle' && (
          <motion.span
            key={status}
            variants={fadeIn}
            initial="initial"
            animate="animate"
            exit="exit"
            className={cn(
              'inline-flex items-center gap-1 font-mono text-xs',
              status === 'error' ? 'text-destructive' : 'text-muted-foreground',
            )}
          >
            {status === 'saved' && <Check className="size-3" aria-hidden />}
            {status === 'error' && <CircleAlert className="size-3" aria-hidden />}
            {COPY[status]}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}

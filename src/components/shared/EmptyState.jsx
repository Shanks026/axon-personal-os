import { motion } from 'motion/react'
import { fadeIn } from '@/components/motion/presets'
import { cn } from '@/lib/utils'

/** Icon tile, title, a one-line reason and one primary action (design-system.md → Empty state). */
export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <motion.div
      variants={fadeIn}
      initial="initial"
      animate="animate"
      className={cn(
        'flex flex-col items-center gap-1 rounded-lg border border-dashed border-border-strong px-6 py-10 text-center',
        className,
      )}
    >
      {Icon && (
        <div className="mb-2 flex size-9 items-center justify-center rounded-lg border bg-card text-space">
          <Icon className="size-4" aria-hidden />
        </div>
      )}
      <p className="font-semibold">{title}</p>
      {description && <p className="max-w-sm text-small text-muted-foreground">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </motion.div>
  )
}

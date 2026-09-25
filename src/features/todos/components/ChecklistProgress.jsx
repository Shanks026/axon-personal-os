import { motion } from 'motion/react'
import { springs } from '@/components/motion/presets'

/** "2/4" plus a thin 120px bar (design: Task Detail.dc.html checklist header). */
export function ChecklistProgress({ done, total }) {
  const pct = total > 0 ? (done / total) * 100 : 0
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-xs text-faint">
        {done}/{total}
      </span>
      <div className="h-0.75 w-30 shrink-0 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full origin-left bg-space"
          initial={false}
          animate={{ scaleX: pct / 100 }}
          transition={springs.gentle}
          style={{ width: '100%' }}
        />
      </div>
    </div>
  )
}

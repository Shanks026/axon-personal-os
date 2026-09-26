import { motion } from 'motion/react'
import { zonedParts } from '@/lib/dates'
import { fadeIn } from '@/components/motion/presets'

/**
 * The current-time line in today's column (design: destructive, with a dot at the left edge).
 * `now` comes from `useNow()`, so it moves every minute.
 */
export function NowLine({ now, timeZone }) {
  const [h, m] = zonedParts(now, timeZone).time.split(':').map(Number)
  const top = ((h * 60 + m) / 1440) * 100
  return (
    <motion.div
      variants={fadeIn}
      initial="initial"
      animate="animate"
      aria-hidden
      className="pointer-events-none absolute inset-x-0 z-2 h-0.5 -translate-y-1/2 bg-destructive"
      style={{ top: `${top}%` }}
    >
      <span className="absolute top-1/2 -left-1 size-2 -translate-y-1/2 rounded-full bg-destructive" />
    </motion.div>
  )
}

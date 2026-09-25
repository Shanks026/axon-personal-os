import { motion } from 'motion/react'
import { durations, easings, springs } from '@/components/motion/presets'
import { cn } from '@/lib/utils'

// Motion's spring/inertia transitions only support two keyframes, so the "pop" (1 → 1.08 → 1)
// needs a tween, not `springs.snappy`, even though everything else here is spring-driven.
const popTransition = { duration: durations.slow, times: [0, 0.4, 1], ease: easings.standard }

// design: 17px/rounded-md on the Todos page, 15px/rounded-sm in a task's compact checklist.
const SIZES = {
  default: { box: 'size-4.25 rounded-md', check: 'size-3' },
  sm: { box: 'size-3.75 rounded-sm', check: 'size-2.75' },
}

/**
 * A button-based checkbox (design: Todos.dc.html), not the shadcn primitive, so the box's pop
 * and the check can be motion-driven (design-system.md → Todo/task complete: fills and scales
 * 1 → 1.08 → 1 on check).
 */
export function AnimatedCheckbox({ checked, onCheckedChange, label, size = 'default', className }) {
  const s = SIZES[size]
  return (
    <motion.button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onCheckedChange(!checked)}
      animate={checked ? { scale: [1, 1.08, 1] } : { scale: 1 }}
      transition={checked ? popTransition : springs.snappy}
      className={cn(
        'border-1.5 flex shrink-0 items-center justify-center text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring',
        s.box,
        checked
          ? 'border-ok bg-ok'
          : 'border-border-strong bg-transparent transition-colors hover:border-foreground',
        className,
      )}
    >
      <motion.svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={s.check}
        initial={false}
        animate={{ scale: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
        transition={springs.snappy}
        aria-hidden
      >
        <path d="M20 6 9 17l-5-5" />
      </motion.svg>
    </motion.button>
  )
}

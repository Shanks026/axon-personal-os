import { motion } from 'motion/react'
import { springs } from '@/components/motion/presets'
import { cn } from '@/lib/utils'

/**
 * A button-based checkbox (design: Todos.dc.html), not the shadcn primitive, so the box's pop
 * and the check can be motion-driven (design-system.md → Todo/task complete: fills and scales
 * 1 → 1.08 → 1 on check).
 */
export function AnimatedCheckbox({ checked, onCheckedChange, label, className }) {
  return (
    <motion.button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onCheckedChange(!checked)}
      animate={checked ? { scale: [1, 1.08, 1] } : { scale: 1 }}
      transition={springs.snappy}
      className={cn(
        'border-1.5 flex size-4.25 shrink-0 items-center justify-center rounded-md text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring',
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
        className="size-3"
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

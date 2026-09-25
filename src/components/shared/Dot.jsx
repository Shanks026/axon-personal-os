import { dotClasses } from '@/lib/tint'
import { cn } from '@/lib/utils'

/**
 * A plain filled circle in a Tailwind colour-scale key, for priority: a colour is more legible
 * at a glance than a signal-bars icon (the user's request, 2026-09-25). Drop-in for anywhere a
 * lucide icon component is expected — accepts `className` and `color` (a `lib/tint.js` key,
 * e.g. `TASK_PRIORITY_MAP[priority].color`) instead of an inline `style`.
 */
export function Dot({ color, className, ...props }) {
  return (
    <span
      aria-hidden
      className={cn('inline-block size-2.5 shrink-0 rounded-full', dotClasses(color), className)}
      {...props}
    />
  )
}

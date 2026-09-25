import { Check } from 'lucide-react'
import { dotClasses, textClasses } from '@/lib/tint'
import { cn } from '@/lib/utils'

/**
 * The calendar legend mark (design): a filled dot for an event, a hollow square for a due task or
 * todo (filled with a check when done). Tinted with the item's space colour (`spaces.color`)
 * through `lib/tint.js`, never the space accent variable.
 * @param {{ kind: 'event' | 'task' | 'todo', color?: string, done?: boolean, className?: string }} props
 */
export function ItemMarker({ kind, color, done = false, className }) {
  if (kind === 'event') {
    return (
      <span
        aria-hidden
        className={cn('size-1.5 shrink-0 rounded-full', dotClasses(color), className)}
      />
    )
  }
  return (
    <span
      aria-hidden
      className={cn(
        'flex size-2.5 shrink-0 items-center justify-center rounded-xs border border-current',
        textClasses(color),
        className,
      )}
    >
      {done && <Check className="size-2" strokeWidth={4} />}
    </span>
  )
}

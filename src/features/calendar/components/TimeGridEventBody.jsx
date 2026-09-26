import { formatTimeRange } from '@/lib/dates'
import { eventBlockClasses } from '@/lib/tint'
import { cn } from '@/lib/utils'

/**
 * The block's contents, shared by the grid and the drag overlay. Short blocks (under 30 minutes)
 * show the title only.
 */
export function TimeGridEventBody({ item, color, timeZone, short, lifted = false, className }) {
  return (
    <div
      className={cn(
        'flex h-full w-full flex-col overflow-hidden rounded-md border-l-3 px-1.5 py-1 text-left',
        eventBlockClasses(color),
        lifted && 'scale-102 bg-card shadow-md dark:bg-card',
        short && 'flex-row items-center gap-1.5 py-0',
        className,
      )}
    >
      <span className="truncate text-xs font-medium text-foreground">{item.title}</span>
      {!short && (
        <span className="truncate font-mono text-xs text-muted-foreground tabular-nums">
          {formatTimeRange(item.start, item.end, timeZone)}
        </span>
      )}
    </div>
  )
}

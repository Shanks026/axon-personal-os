import { NotebookPen } from 'lucide-react'
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
      <span className="flex min-w-0 items-center gap-1">
        <span className="truncate text-xs font-medium text-foreground">{item.title}</span>
        {item.raw?.note_id && (
          <NotebookPen
            className="size-3 shrink-0 text-muted-foreground"
            aria-label="Has meeting note"
          />
        )}
      </span>
      {!short && (
        <span className="truncate font-mono text-xs text-muted-foreground tabular-nums">
          {formatTimeRange(item.start, item.end, timeZone)}
        </span>
      )}
    </div>
  )
}

import { ListChecks } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * "3/7" checklist progress with a fixed `list-checks` icon (cards, rows, board, the task dialog's
 * checklist header). Colour carries the progress, not the icon (the user's call, 2026-09-25):
 * nothing checked is muted; partly done tints the done count emerald; all done turns the whole
 * badge emerald. Renders nothing without checklist items.
 */
export function ChecklistProgressBadge({ progress, className }) {
  if (!progress?.total) return null
  const { done, total } = progress
  const complete = done === total
  const emerald = 'text-emerald-600 dark:text-emerald-400'
  return (
    <span
      className={cn(
        'flex items-center gap-1.25 font-mono text-xs tabular-nums',
        complete ? emerald : 'text-muted-foreground',
        className,
      )}
      aria-label={`Checklist ${done} of ${total} done`}
    >
      <ListChecks className="size-3.5 shrink-0" aria-hidden />
      <span aria-hidden>
        <span className={cn(done > 0 && !complete && emerald)}>{done}</span>/{total}
      </span>
    </span>
  )
}

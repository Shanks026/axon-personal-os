import { ListChecks } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * "3/5" with a checklist icon (design: Tasks.dc.html card footer, `list-checks`). Muted, turns
 * the ok tone when every item is done. Renders nothing for a task with no checklist items.
 */
export function ChecklistProgressBadge({ progress, className }) {
  if (!progress?.total) return null
  const complete = progress.done === progress.total
  return (
    <span
      className={cn(
        'flex items-center gap-1.25 text-xs',
        complete ? 'text-ok' : 'text-muted-foreground',
        className,
      )}
    >
      <ListChecks className="size-3.25 shrink-0" aria-hidden />
      {progress.done}/{progress.total}
    </span>
  )
}

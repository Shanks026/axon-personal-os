import { dueTone, formatDateShort, formatDueLabel } from '@/lib/dates'
import { cn } from '@/lib/utils'

const TONE_CLASS = {
  overdue: 'text-destructive',
  today: 'text-warn',
  default: 'text-muted-foreground',
  none: 'text-faint',
}

/**
 * Due date in its tone (design-system.md → due labels): overdue red, today amber, otherwise
 * muted; closed items read "Completed 18 Sep" in green. Mono so columns line up.
 */
export function DueLabel({ date, completedAt, closed = false, showEmpty = true, className }) {
  if (closed && completedAt) {
    return (
      <span className={cn('font-mono text-xs whitespace-nowrap text-ok', className)}>
        Completed {formatDateShort(completedAt)}
      </span>
    )
  }
  if (!date && !showEmpty) return null
  const tone = closed ? 'default' : dueTone(date)
  return (
    <span className={cn('font-mono text-xs whitespace-nowrap', TONE_CLASS[tone], className)}>
      {date && tone === 'today' ? 'Due today' : formatDueLabel(date)}
    </span>
  )
}

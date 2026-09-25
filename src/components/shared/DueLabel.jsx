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
 * muted; closed items read "Completed 18 Sep" in a darker emerald (emerald-700; 400 in dark), a
 * step deeper than the emerald Completed status pill. Mono so columns line up (sans on cards).
 * `completedPrefix={false}` shows just the date (the task table: the status column and the
 * emerald colour already say "completed").
 */
export function DueLabel({
  date,
  completedAt,
  closed = false,
  showEmpty = true,
  completedPrefix = true,
  className,
}) {
  if (closed && completedAt) {
    return (
      <span
        className={cn(
          'font-mono text-xs whitespace-nowrap text-emerald-700 dark:text-emerald-400',
          className,
        )}
      >
        {completedPrefix && 'Completed '}
        {formatDateShort(completedAt)}
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

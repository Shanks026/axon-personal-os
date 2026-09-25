import { formatDate, formatRelative } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/** Relative time with the absolute date in a tooltip (shared by activity and work-log entries). */
export function ActivityTime({ value, className }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <time dateTime={value} className={cn('text-xs whitespace-nowrap text-faint', className)}>
          {formatRelative(value)}
        </time>
      </TooltipTrigger>
      <TooltipContent>{formatDate(value)}</TooltipContent>
    </Tooltip>
  )
}

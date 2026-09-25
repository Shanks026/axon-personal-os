import { cn } from '@/lib/utils'
import { useSpace } from '@/context/SpaceContext'
import { ActivityTime } from '@/features/tasks/components/ActivityTime'
import { describeActivity } from '@/features/tasks/utils'

/** An automatic activity entry: an icon on the timeline rail, then "Status To do → Blocked · 2h ago". */
export function ActivityEntry({ entry }) {
  const { spaceById } = useSpace()
  const { icon: Icon, iconClassName, text } = describeActivity(entry, { spaceById })
  return (
    <div className="relative flex items-start gap-3 py-1.5">
      <span className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border bg-background">
        <Icon className={cn('size-3.25', iconClassName)} aria-hidden />
      </span>
      <p className="min-w-0 flex-1 pt-0.5 text-muted-foreground">
        <span className="text-foreground">{text}</span>
        <span className="text-faint"> · </span>
        <ActivityTime value={entry.created_at} />
      </p>
    </div>
  )
}

import { CircleCheck } from 'lucide-react'
import { formatTime, formatWeekdayDate, zonedDayRange } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { useSpace } from '@/context/SpaceContext'
import { AnimatedList } from '@/components/motion/AnimatedList'
import { EntityLink } from '@/components/shared/EntityLink'
import { SpaceIcon } from '@/components/shared/SpaceIcon'
import { Skeleton } from '@/components/ui/skeleton'
import { usePreferences } from '@/features/settings/api'
import { useStatusChanges } from '@/features/tasks/api'
import { TASK_STATUS_MAP } from '@/features/tasks/constants'
import { useTodos } from '@/features/todos/api'
import { buildDoneItems } from '@/features/journal/utils'

function DoneRow({ item, space, showSpace, timezone }) {
  return (
    <div className="flex min-h-8.5 items-center gap-2">
      <div className="flex min-w-0 flex-1 items-center gap-1">
        {item.kind === 'task' ? (
          <>
            <EntityLink
              kind="task"
              id={item.task.id}
              spaceId={item.task.space_id}
              label={item.task.title}
              status={item.status}
              className="min-w-0 shrink"
            />
            {item.status !== 'done' && (
              <span className="shrink-0 text-muted-foreground">
                → {TASK_STATUS_MAP[item.status]?.label ?? item.status}
              </span>
            )}
          </>
        ) : (
          <span className="flex min-w-0 items-center gap-1.5 px-1">
            <CircleCheck
              className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-300"
              aria-hidden
            />
            <span className="truncate text-muted-foreground line-through">{item.todo.title}</span>
          </span>
        )}
      </div>
      {showSpace && space && (
        <span title={space.name}>
          <SpaceIcon icon={space.icon} size="xs" />
        </span>
      )}
      <span className="shrink-0 font-mono text-xs text-faint tabular-nums">
        {formatTime(item.at, timezone)}
      </span>
    </div>
  )
}

/**
 * The journal rail (design Journal.dc): what got done on the day, for reference while writing.
 * Tasks show once, at their latest status change that day (completions, and moves such as
 * "→ In review"); todos ticked off show struck through. Local day in the profile time zone.
 */
export function DoneThatDay({ spaceIds, date, isToday, className }) {
  const { timezone } = usePreferences()
  const { isGlobal, spaceById } = useSpace()
  const { from, to } = zonedDayRange(date, timezone)
  const changes = useStatusChanges({ spaceIds, from, to })
  const todos = useTodos({ spaceIds, doneFrom: from, doneTo: to })
  const loading = changes.isLoading || todos.isLoading
  const items = buildDoneItems(changes.data, todos.data)

  return (
    <div className={cn('flex flex-col', className)}>
      <h2 className="flex items-center gap-2 font-semibold">
        <CircleCheck className="size-3.5 text-emerald-600 dark:text-emerald-300" aria-hidden />
        {isToday ? 'Done today' : `Done on ${formatWeekdayDate(date)}`}
      </h2>
      <p className="mt-0.5 text-xs text-muted-foreground">Auto-listed for reference</p>
      <div className="mt-2.5">
        {loading ? (
          <div className="flex flex-col gap-3 py-1" aria-hidden>
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
          </div>
        ) : changes.error || todos.error ? (
          <p className="text-xs text-destructive">Couldn’t load what was done.</p>
        ) : items.length === 0 ? (
          <p className="py-1 text-muted-foreground">Nothing completed on this day</p>
        ) : (
          <AnimatedList
            items={items}
            getKey={(item) => item.key}
            renderItem={(item) => (
              <DoneRow
                item={item}
                space={spaceById.get(
                  item.kind === 'task' ? item.task.space_id : item.todo.space_id,
                )}
                showSpace={isGlobal}
                timezone={timezone}
              />
            )}
          />
        )}
      </div>
    </div>
  )
}

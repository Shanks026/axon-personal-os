import { ArrowUpRight, History, RotateCcw } from 'lucide-react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { daysAgoISO, formatRelative, todayISO, zonedParts } from '@/lib/dates'
import { entityPath } from '@/lib/entityPaths'
import { EntityIcon } from '@/components/shared/EntityIcon'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { SpaceBadge } from '@/components/shared/SpaceBadge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useRestoreItem } from '@/features/inbox/api'
import { splitCapture } from '@/features/inbox/utils'
import { usePreferences } from '@/features/settings/api'

const BECAME = {
  task: 'Became a task',
  todo: 'Became a todo',
  note: 'Became a note',
  event: 'Became an event',
  discarded: 'Discarded',
}
const KIND_WORD = { task: 'task', todo: 'todo', note: 'note', event: 'event' }

/**
 * A handled item: its first line, what it became and when, a link to what it became (the target
 * page says so if it's since been deleted), and Restore (back to Open; anything it became stays).
 */
function ProcessedRow({ item, space, showSpace, slugFor, timezone }) {
  const restore = useRestoreItem()
  const made = KIND_WORD[item.processed_as]
  const to =
    made && item.processed_ref
      ? entityPath(
          { entity_type: made, id: item.processed_ref, space_id: item.space_id },
          { slugFor, timezone },
        )
      : null
  const onRestore = () =>
    restore.mutate(item.id, {
      onSuccess: () =>
        toast.success('Back in the inbox', {
          description: made ? `The ${made} stays where it is.` : undefined,
        }),
    })

  return (
    <li className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-accent/60">
      <div className="min-w-0 flex-1">
        <p className="truncate">{splitCapture(item.body).title}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{BECAME[item.processed_as]}</span>
          <span className="text-faint">·</span>
          <span>{formatRelative(item.processed_at)}</span>
          {showSpace && space && <SpaceBadge space={space} />}
        </p>
      </div>
      {to && (
        <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
          <Link to={to}>
            <EntityIcon type={made} className="size-3.5" />
            Open {made}
            <ArrowUpRight aria-hidden />
          </Link>
        </Button>
      )}
      <Button variant="outline" size="sm" onClick={onRestore} disabled={restore.isPending}>
        <RotateCcw />
        Restore
      </Button>
    </li>
  )
}

/** The Processed tab: the last 30 days, newest first, under Today / Yesterday / Earlier. */
export function ProcessedList({ query, spaceById, showSpace }) {
  const { timezone } = usePreferences()
  const { data: items = [], isLoading, error, refetch } = query
  const slugFor = (id) => spaceById.get(id)?.slug

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2" aria-hidden>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-14 rounded-lg" />
        ))}
      </div>
    )
  }
  if (error) return <ErrorState error={error} onRetry={refetch} title="Couldn’t load the history" />
  if (!items.length) {
    return (
      <EmptyState
        icon={History}
        title="Nothing processed yet"
        description="Items you turn into tasks, todos, notes or events, or discard, show here for 30 days."
      />
    )
  }

  const today = todayISO(timezone)
  const yesterday = daysAgoISO(today, 1)
  const groups = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'Earlier', items: [] },
  ]
  for (const item of items) {
    const day = zonedParts(item.processed_at, timezone)?.isoDate
    groups[day === today ? 0 : day === yesterday ? 1 : 2].items.push(item)
  }

  return (
    <div className="flex flex-col gap-6">
      {groups
        .filter((g) => g.items.length)
        .map((g) => (
          <section key={g.label}>
            <h3 className="mb-1 px-3 text-xs font-medium text-muted-foreground">{g.label}</h3>
            <ul className="flex flex-col">
              {g.items.map((item) => (
                <ProcessedRow
                  key={item.id}
                  item={item}
                  space={item.space_id ? spaceById.get(item.space_id) : null}
                  showSpace={showSpace}
                  slugFor={slugFor}
                  timezone={timezone}
                />
              ))}
            </ul>
          </section>
        ))}
    </div>
  )
}

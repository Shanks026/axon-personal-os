import { ArrowUpRight, CalendarDays, MapPin } from 'lucide-react'
import { Link } from 'react-router'
import { formatTimeRange, formatWeekdayDate, zonedParts } from '@/lib/dates'
import { paths } from '@/lib/paths'
import { useSpace } from '@/context/SpaceContext'
import { useEventForNote } from '@/features/calendar/api'
import { usePreferences } from '@/features/settings/api'

/**
 * "Meeting" in a note's Details rail: the event this note is the meeting note for, with its date,
 * time and location, and "Open in calendar" (that day, with the event open). Renders nothing when
 * the note has no event, and nothing while loading (no skeleton flash in the rail).
 */
export function LinkedEventCard({ noteId }) {
  const { data: event } = useEventForNote(noteId)
  const { spaceById } = useSpace()
  const { timezone } = usePreferences()
  if (!event) return null

  const start = zonedParts(event.starts_at, timezone)
  const slug = spaceById.get(event.space_id)?.slug
  const when = event.all_day ? 'All day' : formatTimeRange(event.starts_at, event.ends_at, timezone)

  return (
    <section aria-labelledby="linked-event" className="flex flex-col gap-1.5">
      <h3 id="linked-event" className="font-medium">
        Meeting
      </h3>
      <div className="flex flex-col gap-1 rounded-lg border px-3 py-2.5">
        <p className="flex min-w-0 items-center gap-2">
          <CalendarDays className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <span className="truncate font-medium">{event.title}</span>
        </p>
        <p className="pl-5.5 font-mono text-xs text-muted-foreground tabular-nums">
          {formatWeekdayDate(start.isoDate)} · {when}
        </p>
        {event.location && (
          <p className="flex min-w-0 items-center gap-1 pl-5.5 text-xs text-muted-foreground">
            <MapPin className="size-3 shrink-0" aria-hidden />
            <span className="truncate">{event.location}</span>
          </p>
        )}
        {slug && (
          <Link
            to={paths.space(slug).calendar({ view: 'day', date: start.isoDate, event: event.id })}
            className="mt-1 inline-flex items-center gap-1 self-start pl-5.5 text-xs text-muted-foreground underline-offset-3 hover:text-foreground hover:underline"
          >
            Open in calendar
            <ArrowUpRight className="size-3" aria-hidden />
          </Link>
        )}
      </div>
    </section>
  )
}

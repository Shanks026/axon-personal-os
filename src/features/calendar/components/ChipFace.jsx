import { CornerDownRight } from 'lucide-react'
import { formatTime } from '@/lib/dates'
import { ItemMarker } from '@/features/calendar/components/ItemMarker'

/**
 * A chip's face for an event or a task: the marker, the start time (timed events, first day) and
 * the title. Later days of a multi-day event show a continuation arrow. The drag overlay reuses it.
 */
export function ChipFace({ item, isStart = true, color, timeZone }) {
  if (item.kind === 'task') {
    return (
      <>
        <ItemMarker kind="task" color={color} done={item.done} />
        <span className="truncate">{item.title}</span>
      </>
    )
  }
  return (
    <>
      {isStart ? (
        <ItemMarker kind="event" color={color} />
      ) : (
        <CornerDownRight className="size-3 shrink-0 text-faint" aria-label="Continues" />
      )}
      {isStart && !item.allDay && (
        <span className="shrink-0 font-mono text-faint tabular-nums">
          {formatTime(item.start, timeZone)}
        </span>
      )}
      <span className="truncate">{item.title}</span>
    </>
  )
}

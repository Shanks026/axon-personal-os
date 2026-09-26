import {
  addDays,
  addMinutes,
  addMonths,
  differenceInCalendarDays,
  endOfWeek,
  format,
  isSameMonth,
  isSameYear,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { parseISODate, toISODate, zonedDayRange, zonedInstant, zonedParts } from '@/lib/dates'
import {
  AGENDA_DAYS,
  DEFAULT_EVENT_MINUTES,
  DEFAULT_START_TIME,
} from '@/features/calendar/constants'

// Calendar days are plain 'yyyy-MM-dd' strings: grid maths runs on zone-free dates, and only the
// edges (a day's UTC range, an event's instants) go through the profile time zone.

const isoDays = (startISO, count) =>
  Array.from({ length: count }, (_, i) => toISODate(addDays(parseISODate(startISO), i)))

/** A local Date for 'yyyy-MM-dd' + 'HH:mm' (zone-free arithmetic only). */
function localDateTime(isoDate, time) {
  const [y, m, d] = isoDate.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  return new Date(y, m - 1, d, hh, mm)
}

/**
 * The 6×7 month grid for the month containing `isoDate`, starting on `weekStartsOn`.
 * Always 42 cells, so months that span six weeks fit and the grid never changes height.
 */
export function buildMonthGrid(isoDate, weekStartsOn = 1, today = null) {
  const date = parseISODate(isoDate)
  const first = startOfWeek(startOfMonth(date), { weekStartsOn })
  return isoDays(toISODate(first), 42).map((iso) => {
    const d = parseISODate(iso)
    const dow = d.getDay()
    return {
      isoDate: iso,
      day: d.getDate(),
      inMonth: isSameMonth(d, date),
      isToday: iso === today,
      isWeekend: dow === 0 || dow === 6,
    }
  })
}

/** Weekday labels ("Mon" … "Sun") rotated to start on `weekStartsOn`. */
export function weekdayLabels(weekStartsOn = 1) {
  const first = startOfWeek(new Date(2026, 0, 7), { weekStartsOn })
  return Array.from({ length: 7 }, (_, i) => format(addDays(first, i), 'EEE'))
}

/** The local days a view shows, as 'yyyy-MM-dd' strings. */
export function getViewDays(view, isoDate, weekStartsOn = 1) {
  if (view === 'month') return buildMonthGrid(isoDate, weekStartsOn).map((c) => c.isoDate)
  if (view === 'week') {
    return isoDays(toISODate(startOfWeek(parseISODate(isoDate), { weekStartsOn })), 7)
  }
  if (view === 'day') return [isoDate]
  return isoDays(isoDate, AGENDA_DAYS)
}

/**
 * What a view needs to fetch: the `days` it shows, the first and last day (`startDate`/`endDate`,
 * inclusive, for `due_date` filters) and `from`/`to` (UTC ISO, half-open) for event overlap.
 */
export function getViewRange(view, isoDate, { weekStartsOn = 1, timeZone } = {}) {
  const days = getViewDays(view, isoDate, weekStartsOn)
  const startDate = days[0]
  const endDate = days[days.length - 1]
  return {
    days,
    startDate,
    endDate,
    from: zonedDayRange(startDate, timeZone).from,
    to: zonedDayRange(endDate, timeZone).to,
  }
}

/** The date one step before (`-1`) or after (`1`) `isoDate` in this view. */
export function shiftDate(view, isoDate, step) {
  const date = parseISODate(isoDate)
  if (view === 'month') return toISODate(addMonths(date, step))
  if (view === 'week') return toISODate(addDays(date, 7 * step))
  if (view === 'day') return toISODate(addDays(date, step))
  return toISODate(addDays(date, AGENDA_DAYS * step))
}

/** "September 2026" · "21 – 27 Sep 2026" · "28 Sep – 4 Oct 2026" · "Wed 23 Sep 2026" · "From 23 Sep 2026" */
export function formatRangeTitle(view, isoDate, weekStartsOn = 1) {
  const date = parseISODate(isoDate)
  if (view === 'month') return format(date, 'MMMM yyyy')
  if (view === 'day') return format(date, 'EEE d MMM yyyy')
  if (view === 'agenda') return `From ${format(date, 'd MMM yyyy')}`
  const start = startOfWeek(date, { weekStartsOn })
  const end = endOfWeek(date, { weekStartsOn })
  if (isSameMonth(start, end)) return `${format(start, 'd')} – ${format(end, 'd MMM yyyy')}`
  if (isSameYear(start, end)) return `${format(start, 'd MMM')} – ${format(end, 'd MMM yyyy')}`
  return `${format(start, 'd MMM yyyy')} – ${format(end, 'd MMM yyyy')}`
}

/** True when `isoDate` is one of the days `range` shows. */
export function isInRange(range, isoDate) {
  return !!isoDate && isoDate >= range.startDate && isoDate <= range.endDate
}

/**
 * An event's first and last local day. The end is exclusive at the instant level: an event ending
 * exactly at 00:00 doesn't touch the next day (all-day events end at 23:59:59.999).
 */
export function eventDaySpan({ start, end }, timeZone) {
  const startMs = new Date(start).getTime()
  const endMs = new Date(end).getTime()
  const lastMs = endMs > startMs ? endMs - 1 : endMs
  return {
    start: zonedParts(startMs, timeZone).isoDate,
    end: zonedParts(lastMs, timeZone).isoDate,
  }
}

function sortKey({ item, isStart }) {
  if (item.kind === 'task') return [2, '']
  if (item.kind === 'todo') return [3, '']
  // All-day events and the continuation days of multi-day events first, then timed by start.
  if (item.allDay || !isStart) return [0, '']
  return [1, item.start]
}

function compareEntries(a, b) {
  const [ra, ta] = sortKey(a)
  const [rb, tb] = sortKey(b)
  if (ra !== rb) return ra - rb
  return ta < tb ? -1 : ta > tb ? 1 : 0
}

/**
 * Buckets calendar items by local day: `Map<isoDate, { item, isStart, isEnd }[]>` for every day in
 * `days` (days with nothing get an empty array). Events (`start`/`end` instants) appear on every
 * day they touch; tasks and todos (`dueDate`) on their due day. Each day is ordered: all-day
 * events, timed events by start, tasks, then todos.
 */
export function groupItemsByDay(items, days, timeZone) {
  const map = new Map(days.map((d) => [d, []]))
  if (!days.length) return map
  const first = days[0]
  const last = days[days.length - 1]
  for (const item of items) {
    if (item.kind !== 'event') {
      map.get(item.dueDate)?.push({ item, isStart: true, isEnd: true })
      continue
    }
    const span = eventDaySpan(item, timeZone)
    if (span.end < first || span.start > last) continue
    for (const day of days) {
      if (day < span.start || day > span.end) continue
      map.get(day).push({ item, isStart: day === span.start, isEnd: day === span.end })
    }
  }
  for (const list of map.values()) list.sort(compareEntries)
  return map
}

/**
 * Form values → the row's `all_day`, `starts_at` and `ends_at` (UTC ISO). All-day spans run from
 * 00:00 on the first day to 23:59:59.999 on the last, in `timeZone`.
 */
export function toEventTimestamps(
  { all_day, start_date, end_date, start_time, end_time },
  timeZone,
) {
  if (all_day) {
    const end = new Date(new Date(zonedDayRange(end_date, timeZone).to).getTime() - 1)
    return {
      all_day: true,
      starts_at: zonedInstant(start_date, '00:00', timeZone).toISOString(),
      ends_at: end.toISOString(),
    }
  }
  return {
    all_day: false,
    starts_at: zonedInstant(start_date, start_time, timeZone).toISOString(),
    ends_at: zonedInstant(end_date, end_time, timeZone).toISOString(),
  }
}

/** The reverse of `toEventTimestamps`, for the edit form. All-day events get default times. */
export function fromEvent(event, timeZone) {
  const start = zonedParts(event.starts_at, timeZone)
  const end = zonedParts(event.ends_at, timeZone)
  if (event.all_day) {
    return {
      all_day: true,
      start_date: start.isoDate,
      end_date: end.isoDate,
      start_time: DEFAULT_START_TIME,
      end_time: addTime(DEFAULT_START_TIME, DEFAULT_EVENT_MINUTES),
    }
  }
  return {
    all_day: false,
    start_date: start.isoDate,
    end_date: end.isoDate,
    start_time: start.time,
    end_time: end.time,
  }
}

/** 'HH:mm' + minutes, wrapping past midnight ('23:30' + 60 → '00:30'). */
export function addTime(time, minutes) {
  return format(addMinutes(localDateTime('2026-01-01', time), minutes), 'HH:mm')
}

/** Minutes from one local date + time to another; the dialog keeps it when the start moves. */
export function minutesBetween(startDate, startTime, endDate, endTime) {
  const start = localDateTime(startDate, startTime)
  const end = localDateTime(endDate, endTime)
  const days = differenceInCalendarDays(end, start)
  return (
    days * 1440 +
    (end.getHours() * 60 + end.getMinutes()) -
    (start.getHours() * 60 + start.getMinutes())
  )
}

/** The end date and time `minutes` after a start (local, zone-free). */
export function endAfter(startDate, startTime, minutes) {
  const end = addMinutes(localDateTime(startDate, startTime), minutes)
  return { end_date: toISODate(end), end_time: format(end, 'HH:mm') }
}

/** Default form values for a new event on `isoDate` (09:00–10:00, not all-day). */
export function newEventDefaults(isoDate) {
  return {
    title: '',
    all_day: false,
    start_date: isoDate,
    end_date: isoDate,
    start_time: DEFAULT_START_TIME,
    end_time: addTime(DEFAULT_START_TIME, DEFAULT_EVENT_MINUTES),
    location: '',
    url: '',
    description: '',
    task_id: null,
  }
}

/** "Today" · "Tomorrow" · "Yesterday" · "Fri 25 Sep" · "Fri 25 Sep 2027" (agenda day headers). */
export function formatAgendaDay(isoDate, today) {
  const d = parseISODate(isoDate)
  const diff = differenceInCalendarDays(d, parseISODate(today))
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  return isSameYear(d, parseISODate(today)) ? format(d, 'EEE d MMM') : format(d, 'EEE d MMM yyyy')
}

// ── Week / Day time grid (Phase 2) ──────────────────────────────────────────────────────────

const DAY_MINUTES = 1440
const minutesOf = (time) => {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

/**
 * A timed event's wall-clock minutes on local day `isoDay` (0–1440), clipped to the day: an event
 * that started the day before begins at 0, one running past midnight ends at 1440. Wall-clock (not
 * elapsed) minutes, so blocks line up with the hour labels on DST change days too.
 */
export function eventMinutesOnDay({ start, end }, isoDay, timeZone) {
  const s = zonedParts(start, timeZone)
  const e = zonedParts(end, timeZone)
  return {
    startMin: s.isoDate < isoDay ? 0 : minutesOf(s.time),
    endMin: e.isoDate > isoDay ? DAY_MINUTES : minutesOf(e.time),
  }
}

/**
 * Side-by-side layout for one day's timed events (`{ id, startMin, endMin }`). Returns
 * `[{ id, top, height, left, width }]` in percent of the day column.
 *
 * Events are sorted by start (longer first on ties) and grouped into clusters of transitively
 * overlapping events. In a cluster each event takes the first column whose last event has ended;
 * width is 1 / the cluster's column count, and an event widens into free columns to its right.
 * Every event is at least `minMinutes` tall.
 */
export function layoutDayEvents(events, { minMinutes = 15 } = {}) {
  const items = events
    .map((e) => ({
      id: e.id,
      start: e.startMin,
      end: Math.min(DAY_MINUTES, Math.max(e.endMin, e.startMin + minMinutes)),
    }))
    .sort((a, b) => a.start - b.start || b.end - a.end)

  const clusters = []
  let current = null
  for (const item of items) {
    if (!current || item.start >= current.end) {
      current = { items: [], end: item.end }
      clusters.push(current)
    }
    current.items.push(item)
    current.end = Math.max(current.end, item.end)
  }

  const out = []
  for (const cluster of clusters) {
    const columnEnds = []
    for (const item of cluster.items) {
      let col = columnEnds.findIndex((end) => end <= item.start)
      if (col === -1) {
        col = columnEnds.length
        columnEnds.push(item.end)
      } else {
        columnEnds[col] = item.end
      }
      item.col = col
    }
    const count = columnEnds.length
    for (const item of cluster.items) {
      let span = 1
      for (let c = item.col + 1; c < count; c++) {
        const blocked = cluster.items.some(
          (o) => o.col === c && o.start < item.end && o.end > item.start,
        )
        if (blocked) break
        span++
      }
      out.push({
        id: item.id,
        top: (item.start / DAY_MINUTES) * 100,
        height: ((item.end - item.start) / DAY_MINUTES) * 100,
        left: (item.col / count) * 100,
        width: (span / count) * 100,
      })
    }
  }
  return out
}

/** A pointer's y offset in the grid → minutes since midnight, snapped (0–1440). */
export function minutesFromOffset(y, pxPerHour, snap = 15) {
  const minutes = Math.round(((y / pxPerHour) * 60) / snap) * snap
  return Math.min(DAY_MINUTES, Math.max(0, minutes))
}

/** A dnd-kit modifier that rounds the vertical drag to `stepPx` (15 minutes). */
export function snapModifier(stepPx) {
  return ({ transform }) => ({ ...transform, y: Math.round(transform.y / stepPx) * stepPx })
}

/** Minutes since midnight → 'HH:mm' (1440 → '24:00' is not a time, so callers roll the day). */
export const minutesToTime = (minutes) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

/**
 * Moves an event by whole days (keeping its local wall-clock times across DST) and by minutes,
 * preserving its duration. All-day events move by days and keep the all-day convention.
 * Returns `{ starts_at, ends_at }`.
 */
export function applyMove(event, { dayDelta = 0, minuteDelta = 0 }, timeZone) {
  if (event.all_day) {
    const span = eventDaySpan({ start: event.starts_at, end: event.ends_at }, timeZone)
    const { starts_at, ends_at } = toEventTimestamps(
      {
        all_day: true,
        start_date: toISODate(addDays(parseISODate(span.start), dayDelta)),
        end_date: toISODate(addDays(parseISODate(span.end), dayDelta)),
      },
      timeZone,
    )
    return { starts_at, ends_at }
  }
  const start = zonedParts(event.starts_at, timeZone)
  const duration = new Date(event.ends_at) - new Date(event.starts_at)
  const day = toISODate(addDays(parseISODate(start.isoDate), dayDelta))
  const startMs = zonedInstant(day, start.time, timeZone).getTime() + minuteDelta * 60_000
  return {
    starts_at: new Date(startMs).toISOString(),
    ends_at: new Date(startMs + duration).toISOString(),
  }
}

/** Moves an event's end by `minuteDelta`, never below `minMinutes` after its start. */
export function applyResize(event, minuteDelta, minMinutes = 15) {
  const start = new Date(event.starts_at).getTime()
  const end = new Date(event.ends_at).getTime() + minuteDelta * 60_000
  return { ends_at: new Date(Math.max(end, start + minMinutes * 60_000)).toISOString() }
}

/** Form values for a slot picked in the grid (a selection ending at 24:00 ends 00:00 next day). */
export function slotToFormValues(isoDay, startMin, endMin) {
  const start_time = minutesToTime(startMin)
  const { end_date, end_time } = endAfter(isoDay, start_time, endMin - startMin)
  return { start_date: isoDay, start_time, end_date, end_time, all_day: false }
}

/** Moves a task's due date to `isoDate`; a start date that would end up after it shifts too. */
export function rescheduleTask(task, isoDate) {
  const patch = { due_date: isoDate }
  if (!task.start_date || task.start_date <= isoDate) return patch
  if (!task.due_date) return { ...patch, start_date: isoDate }
  const days = differenceInCalendarDays(parseISODate(isoDate), parseISODate(task.due_date))
  return { ...patch, start_date: toISODate(addDays(parseISODate(task.start_date), days)) }
}

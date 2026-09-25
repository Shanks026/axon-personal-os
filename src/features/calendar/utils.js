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

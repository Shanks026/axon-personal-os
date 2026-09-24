import {
  addDays,
  differenceInCalendarDays,
  differenceInHours,
  differenceInMinutes,
  format,
  isSameYear,
  isValid,
  parseISO,
} from 'date-fns'

/** Accepts a Date, an ISO timestamp, or a 'yyyy-MM-dd' date string (parsed as local midnight). */
function toDate(value) {
  if (value == null || value === '') return null
  const d = value instanceof Date ? value : parseISO(value)
  return isValid(d) ? d : null
}

/** 'yyyy-MM-dd' → local Date (null when invalid). */
export function parseISODate(value) {
  return toDate(value)
}

/** Date → 'yyyy-MM-dd' in local time (the format of Postgres `date` columns). */
export function toISODate(value) {
  const d = toDate(value)
  return d ? format(d, 'yyyy-MM-dd') : null
}

/** 'yyyy-MM-dd' `days` before `todayISO` (windowed "done" queries: tasks, todos). */
export function daysAgoISO(todayISO, days) {
  return toISODate(addDays(parseISODate(todayISO), -days))
}

/** "23 Sep 2026" */
export function formatDate(value) {
  const d = toDate(value)
  return d ? format(d, 'd MMM yyyy') : ''
}

/** "23 Sep" */
export function formatDateShort(value) {
  const d = toDate(value)
  return d ? format(d, 'd MMM') : ''
}

/** "just now" · "5m ago" · "2h ago" · "yesterday" · "3d ago" · "12 Aug" · "12 Aug 2025" */
export function formatRelative(value, now = new Date()) {
  const d = toDate(value)
  if (!d) return ''
  const minutes = differenceInMinutes(now, d)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const days = differenceInCalendarDays(now, d)
  if (days === 0) return `${differenceInHours(now, d)}h ago`
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  return isSameYear(now, d) ? formatDateShort(d) : formatDate(d)
}

/** True when a due date is before today. */
export function isOverdue(value, now = new Date()) {
  const d = toDate(value)
  return !!d && differenceInCalendarDays(d, now) < 0
}

/**
 * Tone for a due date, which maps to a colour in the design system:
 * overdue → destructive, today → warn, default → muted-foreground, none → faint.
 */
export function dueTone(value, now = new Date()) {
  const d = toDate(value)
  if (!d) return 'none'
  const diff = differenceInCalendarDays(d, now)
  if (diff < 0) return 'overdue'
  if (diff === 0) return 'today'
  return 'default'
}

/** "Today" · "Tomorrow" · "Overdue · 3d" · "Fri 26 Sep" · "Fri 26 Sep 2027" · "No due date" */
export function formatDueLabel(value, now = new Date()) {
  const d = toDate(value)
  if (!d) return 'No due date'
  const diff = differenceInCalendarDays(d, now)
  if (diff < 0) return `Overdue · ${-diff}d`
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  return isSameYear(now, d) ? format(d, 'EEE d MMM') : format(d, 'EEE d MMM yyyy')
}

import { addDays, format, isMatch, startOfWeek } from 'date-fns'
import { parseISODate, toISODate } from '@/lib/dates'
import { JOURNAL_STRIP_DAYS } from '@/features/journal/constants'

/** "Journal · Wed 23 Sep 2026": the entry's `notes.title` (linked-notes lists, search). */
export function journalTitle(isoDate) {
  return `Journal · ${format(parseISODate(isoDate), 'EEE d MMM yyyy')}`
}

/**
 * The strip's days: `count` consecutive 'yyyy-MM-dd' dates starting at the week start one week
 * before `anchorISO`'s week, so the anchor sits in the second row-week (design: today in week 2).
 */
export function buildStripDays(anchorISO, { weekStartsOn = 1, count = JOURNAL_STRIP_DAYS } = {}) {
  const start = addDays(startOfWeek(parseISODate(anchorISO), { weekStartsOn }), -7)
  return Array.from({ length: count }, (_, i) => toISODate(addDays(start, i)))
}

/** The strip anchor moved a page back (`-1`) or forward (`1`). */
export function shiftStrip(anchorISO, direction, count = JOURNAL_STRIP_DAYS) {
  return toISODate(addDays(parseISODate(anchorISO), direction * count))
}

/** The `:date` route param as 'yyyy-MM-dd' when it's a real calendar date, else `null`. */
export function parseJournalDateParam(param) {
  if (typeof param !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(param)) return null
  return isMatch(param, 'yyyy-MM-dd') ? param : null
}

/** `Set<'yyyy-MM-dd'>` of the days that have an entry (any space). */
export function toDateSet(rows) {
  return new Set((rows ?? []).map((r) => r.journal_date))
}

/**
 * The "Done today" rail's rows, newest first: each task once, at its latest status change that
 * day (`statusChanges` arrive newest first), plus the todos ticked off.
 * @returns {Array<{ key: string, kind: 'task' | 'todo', at: string, task?: object, status?: string, todo?: object }>}
 */
export function buildDoneItems(statusChanges = [], todos = []) {
  const seen = new Set()
  const tasks = []
  for (const change of statusChanges) {
    if (seen.has(change.task.id)) continue
    seen.add(change.task.id)
    tasks.push({
      key: `task:${change.task.id}`,
      kind: 'task',
      at: change.created_at,
      task: change.task,
      status: change.to_value,
    })
  }
  const done = todos.map((todo) => ({
    key: `todo:${todo.id}`,
    kind: 'todo',
    at: todo.done_at,
    todo,
  }))
  return [...tasks, ...done].sort((a, b) => b.at.localeCompare(a.at))
}

/** A strip day's labels: `{ weekday: 'Wed', day: '23', long: 'Wednesday 23 September 2026' }`. */
export function stripDayLabels(isoDate) {
  const d = parseISODate(isoDate)
  return {
    weekday: format(d, 'EEE'),
    day: format(d, 'd'),
    long: format(d, 'EEEE d MMMM yyyy'),
  }
}

/** The day's title: "Wednesday, 23 September". */
export function journalHeading(isoDate) {
  return format(parseISODate(isoDate), 'EEEE, d MMMM')
}

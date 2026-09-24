import { addDays, endOfWeek } from 'date-fns'
import { parseISODate, toISODate } from '@/lib/dates'
import { needsRebalance, positionBetween } from '@/lib/position'
import {
  BOARD_STATUSES,
  CLOSED_STATUSES,
  TASK_STATUSES,
  TASK_TABS,
} from '@/features/tasks/constants'

/** Last day of the week containing `todayISO`, as yyyy-MM-dd (0 = Sunday start, 1 = Monday). */
export function weekEndISO(todayISO, weekStartsOn = 1) {
  return toISODate(endOfWeek(parseISODate(todayISO), { weekStartsOn }))
}

/** yyyy-MM-dd `days` before `todayISO`. */
export function daysAgoISO(todayISO, days) {
  return toISODate(addDays(parseISODate(todayISO), -days))
}

/** [{ status, tasks }] in TASK_STATUSES order, ordered by position within each group. */
export function groupTasksByStatus(tasks) {
  return TASK_STATUSES.map(({ value }) => ({
    status: value,
    tasks: tasks.filter((t) => t.status === value).sort((a, b) => a.position - b.position),
  }))
}

/** Tasks matching a tab and an optional status filter (client-side, over one scoped query). */
export function filterTasks(tasks, { tab = 'all', status = [] } = {}) {
  const tabDef = TASK_TABS.find((t) => t.value === tab) ?? TASK_TABS[0]
  return tasks.filter((t) => tabDef.match(t) && (!status.length || status.includes(t.status)))
}

/** Counts per tab for the tab bar. */
export function tabCounts(tasks) {
  return Object.fromEntries(TASK_TABS.map((t) => [t.value, tasks.filter(t.match).length]))
}

/** Board columns for a tab and status filter: the tab's statuses, narrowed by the filter. */
export function boardStatuses({ tab = 'all', status = [] } = {}) {
  const tabDef = TASK_TABS.find((t) => t.value === tab) ?? TASK_TABS[0]
  return BOARD_STATUSES.filter(
    (s) => tabDef.match({ status: s }) && (!status.length || status.includes(s)),
  )
}

/**
 * Where a dropped task lands: `column` is the target column's tasks in their new order, with the
 * moved task already in place. Returns its new position, and whether the column must be
 * renumbered because the neighbours are too close (or equal) to split.
 */
export function planBoardMove(column, taskId) {
  const i = column.findIndex((t) => t.id === taskId)
  const prev = column[i - 1]?.position ?? null
  const next = column[i + 1]?.position ?? null
  const position = positionBetween(prev, next)
  const rebalance =
    (prev != null && needsRebalance(prev, position)) ||
    (next != null && needsRebalance(position, next))
  return { position, rebalance }
}

export const isClosed = (task) => CLOSED_STATUSES.includes(task.status)

/** Tiptap doc from plain text: one paragraph per line (blank lines kept as empty paragraphs). */
export function textToDoc(text) {
  const trimmed = (text ?? '').replace(/\s+$/, '')
  if (!trimmed) return null
  return {
    type: 'doc',
    content: trimmed
      .split('\n')
      .map((line) =>
        line
          ? { type: 'paragraph', content: [{ type: 'text', text: line }] }
          : { type: 'paragraph' },
      ),
  }
}

/** "gitlab.com" from a URL, for link tooltips and chips. */
export function linkHost(url) {
  try {
    return new URL(url).host.replace(/^www\./, '')
  } catch {
    return url
  }
}

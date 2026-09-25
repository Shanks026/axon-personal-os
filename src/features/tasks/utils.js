import { endOfWeek } from 'date-fns'
import { parseISODate, toISODate } from '@/lib/dates'
import { needsRebalance, positionBetween } from '@/lib/position'
import {
  BOARD_STATUSES,
  CLOSED_STATUSES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_TABS,
} from '@/features/tasks/constants'

/** Last day of the week containing `todayISO`, as yyyy-MM-dd (0 = Sunday start, 1 = Monday). */
export function weekEndISO(todayISO, weekStartsOn = 1) {
  return toISODate(endOfWeek(parseISODate(todayISO), { weekStartsOn }))
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

const STATUS_ORDER = Object.fromEntries(TASK_STATUSES.map((s, i) => [s.value, i]))
const PRIORITY_RANK = Object.fromEntries(TASK_PRIORITIES.map((p) => [p.value, p.rank]))
const byString = (a, b) => (a < b ? -1 : a > b ? 1 : 0)

const COMPARE = {
  created: (a, b) => byString(a.created_at, b.created_at),
  updated: (a, b) => byString(a.updated_at, b.updated_at),
  priority: (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority],
  due: (a, b) => byString(a.due_date, b.due_date),
  status: (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status],
  title: (a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }),
  space: (a, b, spaceName) => byString(spaceName(a.space_id), spaceName(b.space_id)),
}

/**
 * Tasks in `sort` order ('due' ascending, '-due' descending; '' or unknown keeps the given
 * position order). Tasks without a due date always sort last. Ties fall back to position.
 * `spaceName(id)` is only needed for the Global table's space sort.
 */
export function sortTasks(tasks, sort, { spaceName = () => '' } = {}) {
  const key = sort?.replace(/^-/, '')
  const compare = COMPARE[key]
  if (!compare) return tasks
  const dir = sort.startsWith('-') ? -1 : 1
  return [...tasks].sort((a, b) => {
    if (key === 'due' && !a.due_date !== !b.due_date) return a.due_date ? -1 : 1
    return dir * compare(a, b, spaceName) || a.position - b.position
  })
}

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

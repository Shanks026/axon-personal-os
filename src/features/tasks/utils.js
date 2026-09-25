import { endOfWeek } from 'date-fns'
import { ArrowRightLeft, CalendarDays, Link2, Pencil, Plus, SignalHigh, Unlink } from 'lucide-react'
import { formatDateShort, parseISODate, toISODate } from '@/lib/dates'
import { needsRebalance, positionBetween } from '@/lib/position'
import { textClasses } from '@/lib/tint'
import {
  BOARD_STATUSES,
  CLOSED_STATUSES,
  TASK_PRIORITIES,
  TASK_PRIORITY_MAP,
  TASK_STATUS_MAP,
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

/**
 * How a task link reads on its card: a GitLab merge request as "!1431 · group/project"
 * (`kind: 'gitlab'`), a Jira issue as its key "THMP-123" (`kind: 'jira'`), anything else as its
 * host (`kind: 'link'`). A saved label always wins.
 */
export function linkInfo(url, label) {
  let parsed
  try {
    parsed = new URL(url)
  } catch {
    return { kind: 'link', text: label || url }
  }
  const mr = parsed.pathname.match(/^\/(.+?)\/-\/merge_requests\/(\d+)/)
  if (mr) return { kind: 'gitlab', text: label || `!${mr[2]} · ${mr[1]}` }
  const jira =
    parsed.pathname.match(/\/browse\/([A-Z][A-Z0-9]+-\d+)/) ??
    parsed.search.match(/selectedIssue=([A-Z][A-Z0-9]+-\d+)/)
  if (jira) return { kind: 'jira', text: label || jira[1] }
  return { kind: 'link', text: label || parsed.host.replace(/^www\./, '') }
}

const statusLabel = (v) => TASK_STATUS_MAP[v]?.label ?? v
const priorityLabel = (v) => TASK_PRIORITY_MAP[v]?.label ?? v

/**
 * An automatic activity entry as `{ icon, iconClassName, text }` for the timeline:
 * "Created in THMP", "Status In progress → In review", "Priority Low → High",
 * "Due date set to 26 Sep" / "Due date 20 Sep → 26 Sep" / "Due date cleared",
 * "Renamed from 'Old title'", "Moved from THMP to Personal". Comments aren't described here
 * (they render as Work log cards). "Linked note ‘Sprint 14 retro’" / "Unlinked note ‘…’" read
 * titles from `noteTitleById` (a note that's gone reads "a deleted note").
 */
export function describeActivity(entry, { spaceById, noteTitleById } = {}) {
  const { kind, from_value: from, to_value: to } = entry
  const spaceName = (id) => spaceById?.get(id)?.name ?? 'a deleted space'
  const noteName = (id) => {
    if (!noteTitleById) return 'a note' // titles still loading
    const title = noteTitleById.get(id)
    if (title === undefined) return 'a deleted note'
    return `‘${title || 'Untitled'}’`
  }

  switch (kind) {
    case 'created':
      return { icon: Plus, iconClassName: 'text-faint', text: 'Created' }
    case 'status': {
      const s = TASK_STATUS_MAP[to]
      return {
        icon: s?.icon ?? ArrowRightLeft,
        iconClassName: s ? textClasses(s.color) : 'text-muted-foreground',
        text: `Status ${statusLabel(from)} → ${statusLabel(to)}`,
      }
    }
    case 'priority':
      return {
        icon: SignalHigh,
        iconClassName: 'text-muted-foreground',
        text: `Priority ${priorityLabel(from)} → ${priorityLabel(to)}`,
      }
    case 'due_date':
      return {
        icon: CalendarDays,
        iconClassName: 'text-muted-foreground',
        text: !to
          ? 'Due date cleared'
          : from
            ? `Due date ${formatDateShort(from)} → ${formatDateShort(to)}`
            : `Due date set to ${formatDateShort(to)}`,
      }
    case 'title':
      return {
        icon: Pencil,
        iconClassName: 'text-muted-foreground',
        text: `Renamed from ‘${from}’`,
      }
    case 'space':
      return {
        icon: ArrowRightLeft,
        iconClassName: 'text-muted-foreground',
        text: `Moved from ${spaceName(from)} to ${spaceName(to)}`,
      }
    case 'note_linked':
      return {
        icon: Link2,
        iconClassName: 'text-muted-foreground',
        text: `Linked note ${noteName(to)}`,
      }
    case 'note_unlinked':
      return {
        icon: Unlink,
        iconClassName: 'text-muted-foreground',
        text: `Unlinked note ${noteName(from)}`,
      }
    default:
      return { icon: ArrowRightLeft, iconClassName: 'text-muted-foreground', text: kind }
  }
}

/** "edited" shows when a comment changed more than a second after it was written. */
export function isEdited({ created_at, updated_at }) {
  return new Date(updated_at) - new Date(created_at) > 1000
}

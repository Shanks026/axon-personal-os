import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  isMatch,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { parseISODate, toISODate } from '@/lib/dates'
import { JOURNAL_STRIP_WEEKS } from '@/features/journal/constants'

/** "Journal · Wed 23 Sep 2026": the entry's `notes.title` (linked-notes lists, search). */
export function journalTitle(isoDate) {
  return `Journal · ${format(parseISODate(isoDate), 'EEE d MMM yyyy')}`
}

/**
 * The strip's weeks: `before` weeks before `anchorISO`'s week, that week, then `after` weeks,
 * each an array of 7 'yyyy-MM-dd' dates starting on `weekStartsOn`.
 */
export function buildStripWeeks(
  anchorISO,
  { weekStartsOn = 1, before = JOURNAL_STRIP_WEEKS, after = JOURNAL_STRIP_WEEKS } = {},
) {
  const first = addDays(startOfWeek(parseISODate(anchorISO), { weekStartsOn }), -7 * before)
  return Array.from({ length: before + 1 + after }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => toISODate(addDays(first, w * 7 + d))),
  )
}

/** Index of the week containing `isoDate`, or -1 when it's outside the strip. */
export function weekIndexOf(weeks, isoDate) {
  return weeks.findIndex((week) => week[0] <= isoDate && isoDate <= week[6])
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

// ── Section editing (Phase 2): the template's sections are level-2 headings in a Tiptap doc.

const CONTAINERS = new Set([
  'paragraph',
  'heading',
  'bulletList',
  'orderedList',
  'taskList',
  'listItem',
  'taskItem',
  'blockquote',
])

/** Whether a node holds anything: text, a mention, an image… (an empty bullet doesn't). */
function hasContent(node) {
  if (node.type === 'text') return !!node.text?.trim()
  if (node.type === 'hardBreak') return false
  if (!node.content?.length) return !CONTAINERS.has(node.type)
  return node.content.some(hasContent)
}

const isSectionHeading = (node, title) =>
  node.type === 'heading' &&
  node.attrs?.level === 2 &&
  (node.content ?? [])
    .map((c) => c.text ?? '')
    .join('')
    .trim()
    .toLowerCase() === title.toLowerCase()

/** `[start, end)`: the heading's index and the index of the next level-2 heading (or the end). */
function sectionBounds(blocks, title) {
  const start = blocks.findIndex((n) => isSectionHeading(n, title))
  if (start < 0) return null
  const next = blocks.findIndex((n, i) => i > start && n.type === 'heading' && n.attrs?.level === 2)
  return [start, next < 0 ? blocks.length : next]
}

/**
 * A new doc with `nodes` at the end of a section (before the next level-2 heading). A blank
 * trailing block there (the template's empty bullet) is replaced. A missing section is added
 * at the end, heading first.
 */
export function appendToSection(doc, sectionTitle, nodes) {
  const blocks = doc?.content ?? []
  const bounds = sectionBounds(blocks, sectionTitle)
  if (!bounds) {
    const heading = {
      type: 'heading',
      attrs: { level: 2 },
      content: [{ type: 'text', text: sectionTitle }],
    }
    return { ...doc, type: 'doc', content: [...blocks, heading, ...nodes] }
  }
  const [start, end] = bounds
  const last = end - 1 > start ? blocks[end - 1] : null
  const cut = last && !hasContent(last) ? end - 1 : end
  return { ...doc, content: [...blocks.slice(0, cut), ...nodes, ...blocks.slice(end)] }
}

/**
 * A bullet list of task mention chips for `tasks`, leaving out tasks already mentioned
 * (`existingMentionIds`). `null` when nothing is left to insert.
 */
export function completedTasksToBulletList(tasks, existingMentionIds = []) {
  const existing = new Set(existingMentionIds)
  const fresh = tasks.filter((t) => !existing.has(t.id))
  if (!fresh.length) return null
  return {
    type: 'bulletList',
    content: fresh.map((t) => ({
      type: 'listItem',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'taskMention', attrs: { id: t.id, label: t.title } }],
        },
      ],
    })),
  }
}

/** The mini month button's label: "Sep 2026". */
export function monthLabel(isoDate) {
  return format(parseISODate(isoDate), 'MMM yyyy')
}

/** The mini month's visible grid, as 'yyyy-MM-dd' bounds (outside days included). */
export function monthGridRange(month, weekStartsOn = 1) {
  return {
    from: toISODate(startOfWeek(startOfMonth(month), { weekStartsOn })),
    to: toISODate(endOfWeek(endOfMonth(month), { weekStartsOn })),
  }
}

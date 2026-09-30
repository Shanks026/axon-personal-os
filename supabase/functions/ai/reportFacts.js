import { HttpError } from './http.js'

// Facts for an AI report, read with the caller's JWT (RLS applies: only the user's own rows).
// Everything is plain text lines; the whole block is capped so a busy quarter stays in budget.

const MAX_FACTS = 60_000
const MAX_DESCRIPTION = 300
const MAX_JOURNAL = 1500
const MAX_CREATED_TITLES = 25
const OPEN_STATUSES = ['in_progress', 'in_review', 'blocked', 'on_hold']
const STATUS_LABELS = {
  todo: 'To do',
  in_progress: 'In progress',
  in_review: 'In review',
  blocked: 'Blocked',
  on_hold: 'On hold',
  done: 'Completed',
  cancelled: 'Cancelled',
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

const oneLine = (s, n) =>
  String(s ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, n)

/** 'yyyy-MM-dd' of an instant in `timeZone` (en-CA formats as ISO). */
function localDate(value, timeZone) {
  if (!value) return ''
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone, dateStyle: 'short' }).format(
      new Date(value),
    )
  } catch {
    return String(value).slice(0, 10)
  }
}

/** Checks the request's period and range; returns them normalised. */
export function readPeriod(body) {
  const p = body?.period ?? {}
  const r = body?.range ?? {}
  if (!['quarter', 'month', 'week', 'custom'].includes(p.kind))
    throw new HttpError(400, 'bad_period', 'Unknown report period.')
  if (!ISO_DATE.test(p.start ?? '') || !ISO_DATE.test(p.end ?? '') || p.end < p.start)
    throw new HttpError(400, 'bad_period', 'The report period has invalid dates.')
  const from = new Date(r.from)
  const to = new Date(r.to)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from)
    throw new HttpError(400, 'bad_period', 'The report range is invalid.')
  const days = Math.round((Date.parse(p.end) - Date.parse(p.start)) / 86_400_000) + 1
  if (days > 400) throw new HttpError(400, 'bad_period', 'A report can cover at most a year.')
  const spaceIds = Array.isArray(body.spaceIds) ? body.spaceIds.filter(Boolean).slice(0, 50) : []
  if (!spaceIds.length) throw new HttpError(400, 'bad_scope', 'No spaces to report on.')
  return {
    period: {
      kind: p.kind,
      start: p.start,
      end: p.end,
      label: oneLine(p.label, 80) || `${p.start} to ${p.end}`,
      fiscalYear: Number.isInteger(p.fiscalYear) ? p.fiscalYear : null,
      fiscalQuarter: Number.isInteger(p.fiscalQuarter) ? p.fiscalQuarter : null,
      days,
    },
    range: { from: from.toISOString(), to: to.toISOString() },
    spaceIds,
    spaceId: body.spaceId ?? null,
    timezone: oneLine(body.timezone, 60) || 'UTC',
  }
}

async function must(query) {
  const { data, error } = await query
  if (error) throw new HttpError(500, 'facts_failed', `Couldn't read your work: ${error.message}`)
  return data ?? []
}

const tagNames = (row) => (row.tags ?? []).map((t) => t.tag?.name).filter(Boolean)

/**
 * Reads the period's work in `spaceIds` and returns `{ text, counts, spaceNames }`: `text` is the
 * facts block for the prompt, `counts` a small summary (also sent to the model).
 */
export async function reportFacts(supabase, { period, range, spaceIds, timezone }) {
  const spaces = await must(supabase.from('spaces').select('id, name').in('id', spaceIds))
  const spaceName = new Map(spaces.map((s) => [s.id, s.name]))
  const multi = spaces.length > 1
  const where = (id) => (multi ? ` {space: ${spaceName.get(id) ?? '?'}}` : '')
  const key = (t) => (t.jira_key ? ` [${t.jira_key}]` : '')
  const meta = (t) => {
    const bits = []
    const tags = tagNames(t)
    if (tags.length) bits.push(`tags: ${tags.join(', ')}`)
    if (t.versions?.length) bits.push(`version: ${t.versions.join(', ')}`)
    if (t.priority && t.priority !== 'none') bits.push(`priority: ${t.priority}`)
    return bits.length ? ` (${bits.join('; ')})` : ''
  }

  const [completed, activity, open, created, journal, todosDone] = await Promise.all([
    must(
      supabase
        .from('tasks')
        .select(
          'id, space_id, title, jira_key, versions, priority, completed_at, description_text, tags:task_tags(tag:tags(name))',
        )
        .in('space_id', spaceIds)
        .is('deleted_at', null)
        .eq('status', 'done')
        .gte('completed_at', range.from)
        .lt('completed_at', range.to)
        .order('completed_at', { ascending: true })
        .limit(500),
    ),
    must(
      supabase
        .from('task_activity')
        .select(
          'task_id, from_value, to_value, created_at, task:tasks!inner(title, jira_key, space_id, deleted_at)',
        )
        .eq('kind', 'status')
        .in('task.space_id', spaceIds)
        .is('task.deleted_at', null)
        .gte('created_at', range.from)
        .lt('created_at', range.to)
        .order('created_at', { ascending: true })
        .limit(1000),
    ),
    must(
      supabase
        .from('tasks')
        .select(
          'id, space_id, title, jira_key, versions, priority, status, due_date, tags:task_tags(tag:tags(name))',
        )
        .in('space_id', spaceIds)
        .is('deleted_at', null)
        .in('status', OPEN_STATUSES)
        .lt('created_at', range.to)
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(300),
    ),
    must(
      supabase
        .from('tasks')
        .select('id, space_id, title, jira_key')
        .in('space_id', spaceIds)
        .is('deleted_at', null)
        .gte('created_at', range.from)
        .lt('created_at', range.to)
        .order('created_at', { ascending: true })
        .limit(500),
    ),
    must(
      supabase
        .from('notes')
        .select('space_id, journal_date, content_text')
        .eq('kind', 'journal')
        .in('space_id', spaceIds)
        .is('deleted_at', null)
        .gte('journal_date', period.start)
        .lte('journal_date', period.end)
        .order('journal_date', { ascending: true })
        .limit(400),
    ),
    must(
      supabase
        .from('todos')
        .select('id')
        .in('space_id', spaceIds)
        .is('deleted_at', null)
        .eq('is_done', true)
        .gte('done_at', range.from)
        .lt('done_at', range.to)
        .limit(2000),
    ),
  ])

  const sections = []

  sections.push(
    `COMPLETED TASKS (${completed.length}):`,
    ...(completed.length
      ? completed.map((t) => {
          const desc = oneLine(t.description_text, MAX_DESCRIPTION)
          return `- ${oneLine(t.title, 300)}${key(t)}${meta(t)}, completed ${localDate(t.completed_at, timezone)}${where(t.space_id)}${desc ? `\n  about: ${desc}` : ''}`
        })
      : ['(none)']),
    '',
  )

  const moves = new Map()
  for (const a of activity) {
    const entry = moves.get(a.task_id) ?? { task: a.task, steps: [] }
    entry.steps.push(
      `${STATUS_LABELS[a.from_value] ?? a.from_value ?? '?'} → ${STATUS_LABELS[a.to_value] ?? a.to_value ?? '?'} (${localDate(a.created_at, timezone)})`,
    )
    moves.set(a.task_id, entry)
  }
  sections.push(
    `STATUS CHANGES IN THE PERIOD (${moves.size} tasks):`,
    ...(moves.size
      ? [...moves.values()].map(
          ({ task, steps }) =>
            `- ${oneLine(task.title, 300)}${key(task)}${where(task.space_id)}: ${steps.join('; ')}`,
        )
      : ['(none)']),
    '',
  )

  sections.push(
    `OPEN NOW (in progress, in review, blocked or on hold; created before the period ended) (${open.length}):`,
    ...(open.length
      ? open.map((t) => {
          const overdue = t.due_date && t.due_date <= period.end ? ', OVERDUE at period end' : ''
          const due = t.due_date ? `, due ${t.due_date}${overdue}` : ''
          return `- ${oneLine(t.title, 300)}${key(t)}${meta(t)}: ${STATUS_LABELS[t.status]}${due}${where(t.space_id)}`
        })
      : ['(none)']),
    '',
  )

  sections.push(
    `TASKS CREATED IN THE PERIOD: ${created.length}`,
    ...(created.length && created.length <= MAX_CREATED_TITLES
      ? created.map((t) => `- ${oneLine(t.title, 300)}${key(t)}${where(t.space_id)}`)
      : []),
    `TODOS DONE IN THE PERIOD: ${todosDone.length}`,
    '',
  )

  const journalLines = journal
    .map((j) => ({ ...j, text: String(j.content_text ?? '').trim() }))
    .filter((j) => j.text)
    .map((j) => `### ${j.journal_date}${where(j.space_id)}\n${j.text.slice(0, MAX_JOURNAL)}`)
  sections.push(
    `JOURNAL ENTRIES (${journalLines.length}):`,
    ...(journalLines.length ? journalLines : ['(none)']),
  )

  let text = sections.join('\n')
  if (text.length > MAX_FACTS) text = `${text.slice(0, MAX_FACTS)}\n(… facts cut here for length)`

  return {
    text,
    counts: {
      completed: completed.length,
      moved: moves.size,
      open: open.length,
      created: created.length,
      todosDone: todosDone.length,
      journalDays: journalLines.length,
    },
    spaceNames: spaces.map((s) => s.name),
  }
}

/** Weeks, and custom ranges up to two weeks, are "weekly" jobs; everything else "quarterly". */
export const reportJob = (period) =>
  period.kind === 'week' || (period.kind === 'custom' && period.days <= 14)
    ? 'report_weekly'
    : 'report_quarterly'

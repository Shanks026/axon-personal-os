import { format } from 'date-fns'
import { parseISODate, toISODate, todayISO } from '@/lib/dates'
import { docToText } from '@/lib/richText'
import { formatQuarter, getFiscalQuarter } from '@/lib/fiscal'
import { AI_MODEL_MAP, DEFAULT_MODELS } from '@/features/ai/constants'

/**
 * The `context` sent with `draft_tasks`: today in the profile time zone (so "Friday" resolves
 * correctly), the week start, the current fiscal quarter, the space and its tag and version names.
 */
export function buildDraftContext({
  timezone,
  weekStartsOn,
  fyStartMonth,
  spaceName,
  tags,
  versions,
  now = new Date(),
}) {
  const today = todayISO(timezone, now)
  const day = parseISODate(today)
  const q = getFiscalQuarter(day, fyStartMonth)
  return {
    today,
    weekday: format(day, 'EEEE'),
    timezone,
    weekStartsOn,
    fiscal: {
      label: formatQuarter(q, fyStartMonth),
      start: toISODate(q.start),
      end: toISODate(q.end),
    },
    spaceName,
    tags: (tags ?? []).map((t) => t.name),
    versions: versions ?? [],
  }
}

/** The saved model for a job while it's still allowed, else the default. */
export function modelFor(job, aiSettings) {
  const saved = aiSettings?.models?.[job]
  return AI_MODEL_MAP[saved] ? saved : DEFAULT_MODELS[job]
}

/** "$0.004" · "<$0.001" · "$1.20" */
export function formatCost(usd) {
  const n = Number(usd) || 0
  if (n === 0) return '$0'
  if (n < 0.001) return '<$0.001'
  if (n < 1) return `$${n.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')}`
  return `$${n.toFixed(2)}`
}

const isoDate = /^\d{4}-\d{2}-\d{2}$/
const validDate = (v) => (typeof v === 'string' && isoDate.test(v) && parseISODate(v) ? v : null)

/**
 * A draft (from the Edge Function) → task dialog values. Tags match the space's tags by name,
 * case-insensitively; names that don't exist (the model's `new_tags`, or `tags` it misspelled)
 * go to `newTags` to be created on save. Bad dates are dropped, and a start after the due date
 * loses its start. `toDoc` turns the Markdown description into Tiptap JSON (`markdownToDoc`).
 */
export function draftToTaskValues(draft, { tags = [], toDoc }) {
  const byName = new Map(tags.map((t) => [t.name.toLowerCase(), t]))
  const tagIds = []
  const newTags = []
  for (const name of [...(draft.tags ?? []), ...(draft.new_tags ?? [])]) {
    const found = byName.get(name.toLowerCase())
    if (found) {
      if (!tagIds.includes(found.id)) tagIds.push(found.id)
    } else if (!newTags.some((n) => n.toLowerCase() === name.toLowerCase())) {
      newTags.push(name)
    }
  }
  let start = validDate(draft.start_date)
  const due = validDate(draft.due_date)
  if (start && due && start > due) start = null
  const markdown = draft.description_markdown?.trim() ?? ''
  const description = markdown ? toDoc(markdown) : null
  return {
    title: draft.title,
    description,
    description_text: docToText(description).slice(0, 20_000),
    status: draft.status ?? 'todo',
    priority: draft.priority ?? 'medium',
    start_date: start,
    due_date: due,
    versions: draft.version ? [draft.version] : [],
    tag_ids: tagIds,
    newTags,
    checklist: draft.checklist ?? [],
  }
}

/** Sums a month's `ai_usage` rows: `{ costUsd, requests }`. */
export function summariseUsage(rows) {
  return (rows ?? []).reduce(
    (acc, r) => ({ costUsd: acc.costUsd + Number(r.cost_usd || 0), requests: acc.requests + 1 }),
    { costUsd: 0, requests: 0 },
  )
}

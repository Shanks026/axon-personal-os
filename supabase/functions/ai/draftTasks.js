import { HttpError } from './http.js'
import { structuredCall } from './models.js'

const STATUSES = ['todo', 'in_progress', 'in_review', 'blocked', 'on_hold', 'done', 'cancelled']
const PRIORITIES = ['none', 'low', 'medium', 'high', 'urgent']
const MAX_TEXT = 8000
const MAX_TASKS = 20

const nullableString = { anyOf: [{ type: 'string' }, { type: 'null' }] }
const nullableDate = { anyOf: [{ type: 'string', format: 'date' }, { type: 'null' }] }

const SCHEMA = {
  type: 'object',
  properties: {
    tasks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description_markdown: { type: 'string' },
          status: { type: 'string', enum: STATUSES },
          priority: { type: 'string', enum: PRIORITIES },
          tags: { type: 'array', items: { type: 'string' } },
          new_tags: { type: 'array', items: { type: 'string' } },
          version: nullableString,
          start_date: nullableDate,
          due_date: nullableDate,
          checklist: { type: 'array', items: { type: 'string' } },
        },
        required: [
          'title',
          'description_markdown',
          'status',
          'priority',
          'tags',
          'new_tags',
          'version',
          'start_date',
          'due_date',
          'checklist',
        ],
        additionalProperties: false,
      },
    },
  },
  required: ['tasks'],
  additionalProperties: false,
}

const SYSTEM = `You turn a developer's plain-language description into tasks for Axon, their personal task manager.

Fields:
- title: short and specific, imperative ("Fix RFQ list pagination"), at most 120 characters.
- description_markdown: the useful detail from the text as Markdown (context, acceptance notes, links). Empty string if there is nothing beyond the title. Don't pad it or restate the title.
- status: "todo" unless the text says the work has started (in_progress), is waiting for review (in_review), is blocked, on hold, done or cancelled.
- priority: only what the text implies ("urgent", "asap" → urgent; "important", "high" → high; "low priority", "whenever" → low). Otherwise "medium".
- tags: names from AVAILABLE TAGS, spelled exactly as listed. Tags classify the work (what kind of work it is, and which product area or portal it happens in); learn how this user applies them from TAG EXAMPLES and follow that pattern. A tag's name merely appearing in the text is not a reason to use it: "refactor the vendor listing page in the store management portal" is Store Management work about vendors, not the Vendor portal. When the examples show tags used as categories (for example one kind-of-work tag plus one area tag), pick at most one per category. If unsure, leave a tag out. new_tags: only when the text explicitly asks for a new tag; otherwise an empty list.
- version: a release version only if the text names one (e.g. "v3.9", "3.9.0"). Prefer the exact spelling from KNOWN VERSIONS when one matches. Otherwise null.
- start_date / due_date: yyyy-MM-dd, only when the text gives or implies a date. Resolve relative dates ("Friday", "tomorrow", "end of the month", "next week" = the next week's first day) from TODAY in the given time zone and week start. Never invent dates. start_date must not be after due_date.
- checklist: concrete sub-steps only when the text lists steps or checks; otherwise an empty list.

Create several tasks only when the text describes separate pieces of work; one piece of work with several steps is one task with a checklist. At most ${MAX_TASKS} tasks. Keep the user's own wording and technical terms.`

function contextBlock(context = {}) {
  const lines = [
    `TODAY: ${context.today} (${context.weekday ?? ''}), time zone ${context.timezone}, weeks start on ${context.weekStartsOn === 0 ? 'Sunday' : 'Monday'}.`,
    context.fiscal
      ? `CURRENT FISCAL QUARTER: ${context.fiscal.label} (${context.fiscal.start} to ${context.fiscal.end}).`
      : '',
    `SPACE: ${context.spaceName ?? 'unknown'}`,
    `AVAILABLE TAGS: ${(context.tags ?? []).join(', ') || '(none)'}`,
    `KNOWN VERSIONS: ${(context.versions ?? []).join(', ') || '(none)'}`,
    tagExamples(context.examples),
  ]
  return lines.filter(Boolean).join('\n')
}

const MAX_EXAMPLES = 25

/** "TAG EXAMPLES" lines ("- title → tag, tag"), capped and trimmed: the client's data is untrusted. */
export function tagExamples(examples) {
  const lines = (Array.isArray(examples) ? examples : [])
    .slice(0, MAX_EXAMPLES)
    .map((e) => {
      const title = String(e?.title ?? '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 150)
      const tags = (Array.isArray(e?.tags) ? e.tags : [])
        .map((t) => String(t).trim().slice(0, 40))
        .filter(Boolean)
        .slice(0, 6)
      return title && tags.length ? `- ${title} → ${tags.join(', ')}` : null
    })
    .filter(Boolean)
  return lines.length
    ? `TAG EXAMPLES (the user's recent tasks in this space, with the tags they chose):\n${lines.join('\n')}`
    : ''
}

const isoDate = /^\d{4}-\d{2}-\d{2}$/

/** Server-side checks the schema can't express (lengths, counts, date order). */
function clean(draft) {
  const title = String(draft.title ?? '')
    .trim()
    .slice(0, 300)
  if (!title) return null
  let start = isoDate.test(draft.start_date ?? '') ? draft.start_date : null
  const due = isoDate.test(draft.due_date ?? '') ? draft.due_date : null
  if (start && due && start > due) start = null
  const names = (list) =>
    [...new Set((list ?? []).map((t) => String(t).trim()).filter(Boolean))].slice(0, 10)
  return {
    title,
    description_markdown: String(draft.description_markdown ?? '').slice(0, 20000),
    status: STATUSES.includes(draft.status) ? draft.status : 'todo',
    priority: PRIORITIES.includes(draft.priority) ? draft.priority : 'medium',
    tags: names(draft.tags),
    new_tags: names(draft.new_tags).map((t) => t.slice(0, 40)),
    version: draft.version ? String(draft.version).trim().slice(0, 40) || null : null,
    start_date: start,
    due_date: due,
    checklist: (draft.checklist ?? [])
      .map((c) => String(c).trim().slice(0, 300))
      .filter(Boolean)
      .slice(0, 30),
  }
}

export async function draftTasks({ text, model, context }) {
  const input = String(text ?? '').trim()
  if (!input) throw new HttpError(400, 'empty', 'Describe at least one task.')
  if (input.length > MAX_TEXT) {
    throw new HttpError(400, 'too_long', `Keep the description under ${MAX_TEXT} characters.`)
  }
  const { data, usage } = await structuredCall({
    model,
    system: SYSTEM,
    user: `${contextBlock(context)}\n\nDESCRIPTION:\n${input}`,
    schema: SCHEMA,
  })
  const tasks = (data.tasks ?? []).map(clean).filter(Boolean).slice(0, MAX_TASKS)
  return { tasks, usage }
}

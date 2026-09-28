import { HttpError } from './http.js'
import { structuredCall } from './models.js'
import { tagExamples } from './draftTasks.js'

const MAX_TEXT = 8000

const SCHEMA = {
  type: 'object',
  properties: { tags: { type: 'array', items: { type: 'string' } } },
  required: ['tags'],
  additionalProperties: false,
}

const SYSTEM = `You pick tags for one task in Axon, a developer's personal task manager, from the tags that already exist.

Tags classify the work (what kind of work it is, and which product area or portal it happens in). Learn how this user applies them from TAG EXAMPLES and follow that pattern. A tag's name merely appearing in the text is not a reason to use it: "refactor the vendor listing page in the store management portal" is Store Management work about vendors, not the Vendor portal. When the examples show tags used as categories (for example one kind-of-work tag plus one area tag), pick at most one per category. Only return names from AVAILABLE TAGS, spelled exactly as listed. If unsure, leave a tag out; an empty list is fine.`

/** Tag names for one task (title + description), chosen from `context.tags` only. */
export async function suggestTags({ title, description, model, context }) {
  const text = `${String(title ?? '').trim()}\n\n${String(description ?? '').trim()}`.trim()
  if (!text) throw new HttpError(400, 'empty', 'The task needs a title first.')
  const available = (context?.tags ?? []).map(String)
  if (!available.length) return { tags: [], usage: null }

  const { data, usage } = await structuredCall({
    model,
    system: SYSTEM,
    user: [
      `AVAILABLE TAGS: ${available.join(', ')}`,
      tagExamples(context?.examples),
      `TASK:\n${text.slice(0, MAX_TEXT)}`,
    ]
      .filter(Boolean)
      .join('\n\n'),
    schema: SCHEMA,
  })
  const byLower = new Map(available.map((t) => [t.toLowerCase(), t]))
  const tags = [
    ...new Set(
      (data.tags ?? []).map((t) => byLower.get(String(t).trim().toLowerCase())).filter(Boolean),
    ),
  ]
  return { tags, usage }
}

import { HttpError } from './http.js'
import { structuredCall } from './models.js'

const MAX_DESCRIPTION = 8000
const MAX_COMMENTS = 6000
const MAX_ITEMS = 20

const SCHEMA = {
  type: 'object',
  properties: { items: { type: 'array', items: { type: 'string' } } },
  required: ['items'],
  additionalProperties: false,
}

const SYSTEM = `You write a checklist for one task in Axon, a developer's personal task manager.

Return concrete, checkable steps a developer would tick off while doing this task: implementation steps, the acceptance criteria as verifiable checks, and follow-ups the comments ask for. Each item is short and starts with a verb ("Add a regression test for page 2"). Use the task's own wording and technical terms. Don't repeat anything in EXISTING ITEMS, don't pad with generic steps ("Test the code", "Deploy"), and skip comment chatter that isn't work. At most ${MAX_ITEMS} items; fewer is better when the task is small. An empty list is fine if there's nothing concrete.`

const clip = (s, n) =>
  String(s ?? '')
    .trim()
    .slice(0, n)

/**
 * Checklist items for a task from its title, description and (Jira) comments, leaving out what's
 * already on its checklist. Comments arrive newest first as `{ author, created, text }`.
 */
export async function checklist({ title, description, comments, existing, model }) {
  const t = clip(title, 300)
  if (!t) throw new HttpError(400, 'empty', 'The task needs a title first.')
  let commentText = ''
  for (const c of Array.isArray(comments) ? comments : []) {
    const line = `- ${clip(c?.author, 80) || 'Someone'} (${clip(c?.created, 10)}): ${clip(c?.text, 2000).replace(/\s+/g, ' ')}`
    if (commentText.length + line.length > MAX_COMMENTS) break
    commentText += `${line}\n`
  }
  const already = (Array.isArray(existing) ? existing : []).map((e) => clip(e, 300)).filter(Boolean)

  const { data, usage } = await structuredCall({
    model,
    system: SYSTEM,
    user: [
      `TITLE: ${t}`,
      `DESCRIPTION:\n${clip(description, MAX_DESCRIPTION) || '(none)'}`,
      commentText ? `COMMENTS (newest first):\n${commentText}` : '',
      `EXISTING ITEMS:\n${already.length ? already.map((e) => `- ${e}`).join('\n') : '(none)'}`,
    ]
      .filter(Boolean)
      .join('\n\n'),
    schema: SCHEMA,
  })

  const seen = new Set(already.map((e) => e.toLowerCase()))
  const items = []
  for (const raw of data.items ?? []) {
    const item = clip(raw, 300)
    if (!item || seen.has(item.toLowerCase())) continue
    seen.add(item.toLowerCase())
    items.push(item)
    if (items.length === MAX_ITEMS) break
  }
  return { items, usage }
}

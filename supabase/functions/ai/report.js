import { HttpError } from './http.js'
import { structuredCall } from './models.js'
import { readPeriod, reportFacts, reportJob } from './reportFacts.js'

const SCHEMA = {
  type: 'object',
  properties: { markdown: { type: 'string' } },
  required: ['markdown'],
  additionalProperties: false,
}

const NEXT = { quarter: 'Next quarter focus', week: 'Next week focus' }

const system = (
  period,
) => `You write a work report for a frontend developer, from facts exported from Axon, their personal task manager. The reader is a manager or lead.

Write Markdown with exactly these sections, in this order:
## Summary
3–5 sentences: what was delivered, what is in flight, anything at risk.
## Highlights
The most significant completed work (at most 6 bullets), each with why it matters when the facts say so.
## Completed
Every completed task, grouped under ### headings by area or portal (from the tags), then by version where versions exist. One bullet per task.
## In progress
Open work: in progress and in review, with due dates when given.
## Blocked or carried over
Blocked or on-hold work and anything overdue at the period end, with what is known about why.
## ${NEXT[period.kind] ?? 'Next focus'}
What comes next, based only on the open work and the journal.

Rules:
- Use only the facts given. Never invent work, numbers, dates, reasons or Jira keys.
- Cite the Jira key in brackets after an item when the facts give one, e.g. "Fixed RFQ pagination [MP-43512]".
- Use the journal for context (reasons, blockers, decisions), not as extra deliverables.
- When a section has nothing, write one plain line saying so ("Nothing blocked this week.").
- Plain, specific, professional English; no filler, no emoji, no title heading (the app shows the title).
- When items name a {space}, mention the space where it helps the reader.`

/**
 * Generates a report for the request's period and saves it: a new `reports` row, or (with
 * `reportId`) the existing one's content. The model and settings are resolved by the caller.
 * Returns `{ report, usage }`.
 */
export async function generateReport(supabase, body, { resolve }) {
  const input = readPeriod(body)
  const { period } = input
  const model = resolve(reportJob(period))

  let existing = null
  if (body.reportId) {
    const { data } = await supabase
      .from('reports')
      .select('id, title, deleted_at')
      .eq('id', body.reportId)
      .maybeSingle()
    if (!data || data.deleted_at) throw new HttpError(404, 'not_found', 'That report is gone.')
    existing = data
  }

  const facts = await reportFacts(supabase, input)
  const scope = input.spaceId ? (facts.spaceNames[0] ?? 'Space') : 'All spaces'
  const { data, usage } = await structuredCall({
    model,
    system: system(period),
    user: [
      `PERIOD: ${period.label} (${period.start} to ${period.end}, ${period.days} days)`,
      `SCOPE: ${scope}${input.spaceId ? '' : ` (${facts.spaceNames.join(', ')})`}`,
      `COUNTS: ${JSON.stringify(facts.counts)}`,
      '',
      facts.text,
    ].join('\n'),
    schema: SCHEMA,
    maxTokens: 32000,
    timeoutMs: 140_000,
  })

  const markdown = String(data?.markdown ?? '').trim()
  if (!markdown) throw new HttpError(502, 'bad_output', 'The model returned an empty report.')

  const generated = {
    content: null,
    content_text: markdown,
    ai_model: model,
    generated_at: new Date().toISOString(),
  }
  const row = existing
    ? supabase.from('reports').update(generated).eq('id', existing.id)
    : supabase.from('reports').insert({
        ...generated,
        space_id: input.spaceId,
        title: `${period.label} report · ${scope}`.slice(0, 200),
        period_kind: period.kind,
        period_start: period.start,
        period_end: period.end,
        fiscal_year: period.fiscalYear,
        fiscal_quarter: period.fiscalQuarter,
      })
  const { data: report, error } = await row.select('*').single()
  if (error) throw new HttpError(500, 'save_failed', `Couldn't save the report: ${error.message}`)
  return { report, model, usage, job: reportJob(period) }
}

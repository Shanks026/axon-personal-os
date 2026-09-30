import { describe, expect, it } from 'vitest'
// The Edge Function's helpers are plain JS; http.js reads Deno.env when it loads, so stub Deno.
globalThis.Deno ??= { env: { get: () => undefined } }
const { readPeriod, reportFacts, reportJob } = await import('/supabase/functions/ai/reportFacts.js')

/** A PostgREST-ish builder: every filter is recorded, and awaiting it resolves to `rows`. */
function fakeSupabase(tables) {
  const calls = []
  return {
    calls,
    from(table) {
      const call = { table, filters: [] }
      calls.push(call)
      const builder = {
        then: (resolve) => resolve({ data: tables[table] ?? [], error: null }),
      }
      for (const m of ['select', 'in', 'is', 'eq', 'gte', 'lt', 'lte', 'order', 'limit']) {
        builder[m] = (...args) => {
          call.filters.push([m, ...args])
          return builder
        }
      }
      return builder
    },
  }
}

const body = {
  spaceIds: ['s1'],
  spaceId: 's1',
  timezone: 'Asia/Kolkata',
  period: { kind: 'week', start: '2026-09-21', end: '2026-09-27', label: 'Week of 21 Sep 2026' },
  range: { from: '2026-09-20T18:30:00.000Z', to: '2026-09-27T18:30:00.000Z' },
}

describe('readPeriod', () => {
  it('normalises a valid request', () => {
    const input = readPeriod(body)
    expect(input.period).toMatchObject({ kind: 'week', days: 7, label: 'Week of 21 Sep 2026' })
    expect(input.spaceIds).toEqual(['s1'])
  })

  it('rejects bad kinds, reversed dates, bad ranges and empty scopes', () => {
    expect(() => readPeriod({ ...body, period: { ...body.period, kind: 'year' } })).toThrow()
    expect(() => readPeriod({ ...body, period: { ...body.period, start: '2026-09-28' } })).toThrow()
    expect(() => readPeriod({ ...body, range: { from: 'x', to: 'y' } })).toThrow()
    expect(() => readPeriod({ ...body, spaceIds: [] })).toThrow()
  })
})

describe('reportJob (function)', () => {
  it('matches the client rule', () => {
    expect(reportJob({ kind: 'week', days: 7 })).toBe('report_weekly')
    expect(reportJob({ kind: 'custom', days: 14 })).toBe('report_weekly')
    expect(reportJob({ kind: 'custom', days: 15 })).toBe('report_quarterly')
    expect(reportJob({ kind: 'quarter', days: 92 })).toBe('report_quarterly')
  })
})

describe('reportFacts', () => {
  it('reads each source in scope and writes the facts block', async () => {
    const supabase = fakeSupabase({
      spaces: [{ id: 's1', name: 'THMP' }],
      tasks: [
        {
          id: 't1',
          space_id: 's1',
          title: 'Fix RFQ pagination',
          jira_key: 'MP-43512',
          versions: ['v3.9'],
          priority: 'high',
          status: 'in_review',
          due_date: '2026-09-25',
          completed_at: '2026-09-23T10:00:00Z',
          description_text: 'Page 2 repeats rows',
          tags: [{ tag: { name: 'Buyer' } }],
        },
      ],
      task_activity: [
        {
          task_id: 't1',
          from_value: 'in_progress',
          to_value: 'in_review',
          created_at: '2026-09-22T05:00:00Z',
          task: { title: 'Fix RFQ pagination', jira_key: 'MP-43512', space_id: 's1' },
        },
      ],
      notes: [{ space_id: 's1', journal_date: '2026-09-22', content_text: 'Blocked on QA env' }],
      todos: [{ id: 'd1' }, { id: 'd2' }],
    })
    const facts = await reportFacts(supabase, readPeriod(body))

    expect(facts.text).toContain(
      '- Fix RFQ pagination [MP-43512] (tags: Buyer; version: v3.9; priority: high), completed 2026-09-23',
    )
    expect(facts.text).toContain('In progress → In review (2026-09-22)')
    expect(facts.text).toContain('In review, due 2026-09-25, OVERDUE at period end')
    expect(facts.text).toContain('TODOS DONE IN THE PERIOD: 2')
    expect(facts.text).toContain('### 2026-09-22\nBlocked on QA env')
    expect(facts.text).not.toContain('{space:') // one space: no per-item space names
    expect(facts.counts).toMatchObject({ completed: 1, moved: 1, todosDone: 2, journalDays: 1 })

    // Every read is scoped to the requested spaces and skips deleted rows.
    const scoped = supabase.calls.filter((c) => c.table !== 'spaces' && c.table !== 'task_activity')
    for (const c of scoped) {
      expect(c.filters).toContainEqual(['in', 'space_id', ['s1']])
      expect(c.filters).toContainEqual(['is', 'deleted_at', null])
    }
    const activity = supabase.calls.find((c) => c.table === 'task_activity')
    expect(activity.filters).toContainEqual(['in', 'task.space_id', ['s1']])
    const completed = supabase.calls.find(
      (c) => c.table === 'tasks' && c.filters.some((f) => f[0] === 'eq' && f[2] === 'done'),
    )
    expect(completed.filters).toContainEqual(['gte', 'completed_at', body.range.from])
    expect(completed.filters).toContainEqual(['lt', 'completed_at', body.range.to])
  })
})

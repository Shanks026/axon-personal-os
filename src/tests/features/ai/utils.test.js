import { describe, expect, it } from 'vitest'
import {
  availableModels,
  buildDraftContext,
  draftToTaskValues,
  formatCost,
  modelFor,
  summariseUsage,
  tagExamples,
} from '@/features/ai/utils'

const tags = [
  { id: 't-bug', name: 'Bug' },
  { id: 't-buyer', name: 'Buyer' },
]
const toDoc = (md) => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: md }] }],
})
const draft = (over = {}) => ({
  title: 'Fix RFQ pagination',
  description_markdown: 'Page 2 repeats rows.',
  status: 'todo',
  priority: 'high',
  tags: [],
  new_tags: [],
  version: null,
  start_date: null,
  due_date: null,
  checklist: [],
  ...over,
})

describe('buildDraftContext', () => {
  it('resolves today, the weekday and the fiscal quarter in the profile time zone', () => {
    // 2026-09-25 20:00 UTC is already Saturday 26 September in Kolkata.
    const ctx = buildDraftContext({
      timezone: 'Asia/Kolkata',
      weekStartsOn: 1,
      fyStartMonth: 4,
      spaceName: 'THMP',
      tags,
      versions: ['v3.9.0'],
      now: new Date('2026-09-25T20:00:00Z'),
    })
    expect(ctx.today).toBe('2026-09-26')
    expect(ctx.weekday).toBe('Saturday')
    expect(ctx.fiscal).toEqual({ label: 'Q2 FY 2026–27', start: '2026-07-01', end: '2026-09-30' })
    expect(ctx.tags).toEqual(['Bug', 'Buyer'])
    expect(ctx.versions).toEqual(['v3.9.0'])
    expect(ctx.spaceName).toBe('THMP')
  })
})

describe('draftToTaskValues', () => {
  it('maps the fields and converts the description', () => {
    const v = draftToTaskValues(draft({ version: 'v3.9.0', checklist: ['Add a test'] }), {
      tags,
      toDoc,
    })
    expect(v.title).toBe('Fix RFQ pagination')
    expect(v.priority).toBe('high')
    expect(v.description.type).toBe('doc')
    expect(v.description_text).toBe('Page 2 repeats rows.')
    expect(v.versions).toEqual(['v3.9.0'])
    expect(v.checklist).toEqual(['Add a test'])
  })

  it('matches tags case-insensitively and collects unknown names once', () => {
    const v = draftToTaskValues(
      draft({ tags: ['bug', 'Frontend'], new_tags: ['frontend', 'RCA', 'Bug'] }),
      { tags, toDoc },
    )
    expect(v.tag_ids).toEqual(['t-bug'])
    expect(v.newTags).toEqual(['Frontend', 'RCA'])
  })

  it('drops invalid dates and a start after the due date', () => {
    expect(draftToTaskValues(draft({ due_date: '2026-02-30' }), { tags, toDoc }).due_date).toBe(
      null,
    )
    const v = draftToTaskValues(draft({ start_date: '2026-10-05', due_date: '2026-10-02' }), {
      tags,
      toDoc,
    })
    expect(v.start_date).toBeNull()
    expect(v.due_date).toBe('2026-10-02')
  })

  it('leaves an empty description as null', () => {
    const v = draftToTaskValues(draft({ description_markdown: '  ' }), { tags, toDoc })
    expect(v.description).toBeNull()
    expect(v.description_text).toBe('')
  })
})

describe('modelFor', () => {
  const geminiOnly = new Set(['gemini-3.8-flash', 'gemini-3.5-flash-lite'])

  it('uses a saved allowed model, else the Gemini default', () => {
    expect(modelFor('draft_tasks', { models: { draft_tasks: 'claude-opus-5-5' } })).toBe(
      'claude-opus-5-5',
    )
    expect(modelFor('draft_tasks', { models: { draft_tasks: 'gpt-4' } })).toBe('gemini-3.8-flash')
    expect(modelFor('draft_tasks', {})).toBe('gemini-3.8-flash')
    expect(modelFor('report_quarterly', undefined)).toBe('gemini-3.8-flash')
  })

  it('skips a saved model whose provider has no key', () => {
    const saved = { models: { draft_tasks: 'claude-sonnet-5' } }
    expect(modelFor('draft_tasks', saved, geminiOnly)).toBe('gemini-3.8-flash')
    expect(
      modelFor('draft_tasks', { models: { draft_tasks: 'gemini-3.5-flash-lite' } }, geminiOnly),
    ).toBe('gemini-3.5-flash-lite')
  })

  it('falls back to any usable model when the default has no key', () => {
    expect(modelFor('draft_tasks', {}, new Set(['claude-haiku-4-5']))).toBe('claude-haiku-4-5')
  })
})

describe('availableModels', () => {
  it('collects the usable ids, or null while status loads', () => {
    expect(availableModels(undefined)).toBeNull()
    const set = availableModels({
      models: [
        { id: 'gemini-3.8-flash', available: true },
        { id: 'claude-sonnet-5', available: false },
      ],
    })
    expect([...set]).toEqual(['gemini-3.8-flash'])
  })
})

describe('formatCost', () => {
  it('formats small and large amounts', () => {
    expect(formatCost(0)).toBe('$0')
    expect(formatCost(0.0004)).toBe('<$0.001')
    expect(formatCost(0.004)).toBe('$0.004')
    expect(formatCost(0.0125)).toBe('$0.013')
    expect(formatCost(0.1)).toBe('$0.1')
    expect(formatCost(1.2)).toBe('$1.20')
  })
})

describe('summariseUsage', () => {
  it('sums cost and counts requests', () => {
    expect(summariseUsage([{ cost_usd: '0.004' }, { cost_usd: 0.0125 }])).toEqual({
      costUsd: 0.0165,
      requests: 2,
    })
    expect(summariseUsage(undefined)).toEqual({ costUsd: 0, requests: 0 })
  })
})

describe('tagExamples', () => {
  it('turns recent tagged tasks into title → tag names, dropping unknown tags', () => {
    const tagsList = [
      { id: 'a', name: 'Improvement' },
      { id: 'b', name: 'Store Management' },
    ]
    expect(
      tagExamples(
        [
          { title: 'Refactor listing', tag_ids: ['a', 'b'] },
          { title: 'Old tag only', tag_ids: ['gone'] },
        ],
        tagsList,
      ),
    ).toEqual([{ title: 'Refactor listing', tags: ['Improvement', 'Store Management'] }])
    expect(tagExamples(undefined, tagsList)).toEqual([])
  })
})

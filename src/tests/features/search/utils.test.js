import { describe, expect, it } from 'vitest'
import { TYPE_FILTERS } from '@/features/search/constants'
import {
  groupResults,
  highlightTitle,
  matchesQuery,
  nextTypeFilter,
  parseSnippet,
} from '@/features/search/utils'

describe('parseSnippet', () => {
  it('splits on the private-use match markers', () => {
    expect(parseSnippet('the policy page and policy')).toEqual([
      { text: 'the ', match: false },
      { text: 'policy', match: true },
      { text: ' page and ', match: false },
      { text: 'policy', match: true },
    ])
  })

  it('treats HTML as plain text and handles empty input', () => {
    expect(parseSnippet('<b>x</b>')).toEqual([{ text: '<b>x</b>', match: false }])
    expect(parseSnippet(null)).toEqual([])
  })
})

describe('highlightTitle', () => {
  it('marks every case-insensitive occurrence', () => {
    expect(highlightTitle('Policy and policy', 'POL')).toEqual([
      { text: 'Pol', match: true },
      { text: 'icy and ', match: false },
      { text: 'pol', match: true },
      { text: 'icy', match: false },
    ])
  })

  it('returns the plain title without a query, and nothing without a title', () => {
    expect(highlightTitle('Hello', '  ')).toEqual([{ text: 'Hello', match: false }])
    expect(highlightTitle('', 'x')).toEqual([])
  })
})

describe('matchesQuery', () => {
  it('needs every word, in the label or its keywords', () => {
    expect(matchesQuery('New task', 'new ta')).toBe(true)
    expect(matchesQuery('New task', 'create', 'create add')).toBe(true)
    expect(matchesQuery('New task', 'new note')).toBe(false)
    expect(matchesQuery('Anything', '')).toBe(true)
  })
})

describe('groupResults', () => {
  it('groups in the fixed order and drops empty groups', () => {
    const rows = [
      { entity_type: 'report', id: 'r1' },
      { entity_type: 'task', id: 't1' },
      { entity_type: 'task', id: 't2' },
      { entity_type: 'journal', id: 'j1' },
    ]
    expect(groupResults(rows).map((g) => [g.type, g.label, g.items.length])).toEqual([
      ['task', 'Tasks', 2],
      ['journal', 'Journal', 1],
      ['report', 'Reports', 1],
    ])
    expect(groupResults(undefined)).toEqual([])
  })
})

describe('nextTypeFilter', () => {
  it('cycles forward and back through the filters, All included', () => {
    expect(nextTypeFilter(TYPE_FILTERS, null)).toBe('task')
    expect(nextTypeFilter(TYPE_FILTERS, 'report')).toBeNull()
    expect(nextTypeFilter(TYPE_FILTERS, null, -1)).toBe('report')
  })
})

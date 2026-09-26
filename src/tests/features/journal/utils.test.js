import { describe, expect, it } from 'vitest'
import { JOURNAL_SECTIONS, JOURNAL_TEMPLATE } from '@/features/journal/constants'
import {
  buildDoneItems,
  buildStripDays,
  journalTitle,
  parseJournalDateParam,
  shiftStrip,
  toDateSet,
} from '@/features/journal/utils'

describe('journalTitle', () => {
  it('formats the weekday and date', () => {
    expect(journalTitle('2026-09-23')).toBe('Journal · Wed 23 Sep 2026')
  })
})

describe('buildStripDays', () => {
  it('starts at the week start before the anchor’s week (Monday weeks)', () => {
    const days = buildStripDays('2026-09-23', { weekStartsOn: 1 })
    expect(days).toHaveLength(14)
    expect(days[0]).toBe('2026-09-14') // Mon
    expect(days[13]).toBe('2026-09-27') // Sun
    expect(days.indexOf('2026-09-23')).toBeGreaterThanOrEqual(7) // anchor in week two
  })

  it('respects Sunday weeks', () => {
    const days = buildStripDays('2026-09-23', { weekStartsOn: 0 })
    expect(days[0]).toBe('2026-09-13') // Sun
    expect(days[13]).toBe('2026-09-26')
  })

  it('keeps an anchor on the week start in week two', () => {
    expect(buildStripDays('2026-09-21', { weekStartsOn: 1 })[7]).toBe('2026-09-21')
  })

  it('crosses month and year boundaries', () => {
    const days = buildStripDays('2027-01-01', { weekStartsOn: 1 })
    expect(days[0]).toBe('2026-12-21')
    expect(days).toContain('2027-01-01')
  })

  it('takes a custom count', () => {
    expect(buildStripDays('2026-09-23', { weekStartsOn: 1, count: 7 })).toHaveLength(7)
  })
})

describe('shiftStrip', () => {
  it('moves the anchor by two weeks', () => {
    expect(shiftStrip('2026-09-23', 1)).toBe('2026-10-07')
    expect(shiftStrip('2026-09-23', -1)).toBe('2026-09-09')
  })
})

describe('parseJournalDateParam', () => {
  it('accepts real dates', () => {
    expect(parseJournalDateParam('2026-09-22')).toBe('2026-09-22')
    expect(parseJournalDateParam('2028-02-29')).toBe('2028-02-29')
  })

  it('rejects malformed or impossible dates', () => {
    expect(parseJournalDateParam('2026-02-30')).toBeNull()
    expect(parseJournalDateParam('2027-02-29')).toBeNull()
    expect(parseJournalDateParam('2026-13-01')).toBeNull()
    expect(parseJournalDateParam('2026-9-2')).toBeNull()
    expect(parseJournalDateParam('yesterday')).toBeNull()
    expect(parseJournalDateParam(undefined)).toBeNull()
  })
})

describe('toDateSet', () => {
  it('collects the entry dates across spaces', () => {
    const set = toDateSet([
      { space_id: 'a', journal_date: '2026-09-22' },
      { space_id: 'b', journal_date: '2026-09-22' },
      { space_id: 'a', journal_date: '2026-09-23' },
    ])
    expect([...set].sort()).toEqual(['2026-09-22', '2026-09-23'])
    expect(toDateSet(undefined).size).toBe(0)
  })
})

describe('buildDoneItems', () => {
  const task = (id) => ({ id, space_id: 's', title: `Task ${id}` })

  it('keeps each task once, at its latest change, and merges todos newest first', () => {
    const changes = [
      { created_at: '2026-09-23T14:05:00+00:00', to_value: 'done', task: task('t1') },
      { created_at: '2026-09-23T11:20:00+00:00', to_value: 'in_review', task: task('t2') },
      { created_at: '2026-09-23T09:00:00+00:00', to_value: 'in_progress', task: task('t1') },
    ]
    const todos = [{ id: 'd1', space_id: 's', title: 'Todo', done_at: '2026-09-23T12:00:00+00:00' }]
    const items = buildDoneItems(changes, todos)
    expect(items.map((i) => i.key)).toEqual(['task:t1', 'todo:d1', 'task:t2'])
    expect(items[0].status).toBe('done')
  })

  it('handles missing data', () => {
    expect(buildDoneItems(undefined, undefined)).toEqual([])
  })
})

describe('JOURNAL_TEMPLATE', () => {
  it('has a level-2 heading per section, in order', () => {
    const headings = JOURNAL_TEMPLATE.content
      .filter((n) => n.type === 'heading')
      .map((n) => n.content[0].text)
    expect(headings).toEqual(JOURNAL_SECTIONS)
    expect(JOURNAL_TEMPLATE.content.at(-1)).toEqual({ type: 'paragraph' })
  })
})

import { describe, expect, it } from 'vitest'
import { JOURNAL_SECTIONS, JOURNAL_TEMPLATE } from '@/features/journal/constants'
import {
  appendToSection,
  buildDoneItems,
  completedTasksToBulletList,
  monthGridRange,
  monthLabel,
  buildStripWeeks,
  journalTitle,
  parseJournalDateParam,
  toDateSet,
  weekIndexOf,
} from '@/features/journal/utils'

describe('journalTitle', () => {
  it('formats the weekday and date', () => {
    expect(journalTitle('2026-09-23')).toBe('Journal · Wed 23 Sep 2026')
  })
})

describe('buildStripWeeks', () => {
  it('spans the given weeks around the anchor’s week (Monday weeks)', () => {
    const weeks = buildStripWeeks('2026-09-23', { weekStartsOn: 1, before: 2, after: 1 })
    expect(weeks).toHaveLength(4)
    expect(weeks.every((w) => w.length === 7)).toBe(true)
    expect(weeks[2]).toEqual([
      '2026-09-21',
      '2026-09-22',
      '2026-09-23',
      '2026-09-24',
      '2026-09-25',
      '2026-09-26',
      '2026-09-27',
    ])
    expect(weeks[0][0]).toBe('2026-09-07')
    expect(weeks[3][6]).toBe('2026-10-04')
  })

  it('respects Sunday weeks', () => {
    const weeks = buildStripWeeks('2026-09-23', { weekStartsOn: 0, before: 0, after: 0 })
    expect(weeks[0][0]).toBe('2026-09-20')
    expect(weeks[0][6]).toBe('2026-09-26')
  })

  it('crosses year boundaries', () => {
    const weeks = buildStripWeeks('2027-01-01', { weekStartsOn: 1, before: 0, after: 0 })
    expect(weeks[0][0]).toBe('2026-12-28')
    expect(weeks[0]).toContain('2027-01-01')
  })

  it('defaults to 26 weeks either side', () => {
    expect(buildStripWeeks('2026-09-23')).toHaveLength(53)
  })
})

describe('weekIndexOf', () => {
  const weeks = buildStripWeeks('2026-09-23', { weekStartsOn: 1, before: 1, after: 1 })

  it('finds the week holding a date, or -1 outside the strip', () => {
    expect(weekIndexOf(weeks, '2026-09-14')).toBe(0)
    expect(weekIndexOf(weeks, '2026-09-27')).toBe(1)
    expect(weekIndexOf(weeks, '2026-10-04')).toBe(2)
    expect(weekIndexOf(weeks, '2026-10-05')).toBe(-1)
    expect(weekIndexOf(weeks, '2026-09-13')).toBe(-1)
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
    expect(parseJournalDateParam('last-week')).toBeNull()
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

const h2 = (text) => ({ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text }] })
const p = (text) => ({ type: 'paragraph', content: text ? [{ type: 'text', text }] : undefined })
const list = (...texts) => ({
  type: 'bulletList',
  content: texts.map((t) => ({ type: 'listItem', content: [p(t)] })),
})
const titles = (doc) => doc.content.map((n) => n.content?.[0]?.text ?? n.type)

describe('appendToSection', () => {
  const inserted = list('Shipped it')

  it('replaces the template’s empty bullet', () => {
    const doc = appendToSection(JOURNAL_TEMPLATE, 'Today', [inserted])
    expect(doc.content[1]).toBe(inserted)
    expect(doc.content).toHaveLength(JOURNAL_TEMPLATE.content.length)
    expect(doc.content[2]).toEqual(h2('Blockers'))
  })

  it('appends after written content, before the next section', () => {
    const doc = { type: 'doc', content: [h2('Today'), list('Wrote tests'), h2('Notes'), p('x')] }
    const out = appendToSection(doc, 'Today', [inserted])
    expect(out.content.map((n) => n.type)).toEqual([
      'heading',
      'bulletList',
      'bulletList',
      'heading',
      'paragraph',
    ])
    expect(out.content[2]).toBe(inserted)
    expect(doc.content).toHaveLength(4) // input untouched
  })

  it('works on the last section and matches headings case-insensitively', () => {
    const doc = { type: 'doc', content: [h2('notes'), p('Some text')] }
    const out = appendToSection(doc, 'Notes', [inserted])
    expect(out.content.at(-1)).toBe(inserted)
  })

  it('adds a missing section at the end', () => {
    const doc = { type: 'doc', content: [p('Free text')] }
    const out = appendToSection(doc, 'Today', [inserted])
    expect(titles(out)).toEqual(['Free text', 'Today', 'bulletList'])
  })

  it('keeps a heading with no content after it', () => {
    const doc = { type: 'doc', content: [h2('Today'), h2('Blockers')] }
    expect(appendToSection(doc, 'Today', [inserted]).content[1]).toBe(inserted)
  })
})

describe('completedTasksToBulletList', () => {
  const tasks = [
    { id: 't1', title: 'Rebase MR' },
    { id: 't2', title: 'RFQ pagination' },
  ]

  it('builds mention chips for each task', () => {
    const out = completedTasksToBulletList(tasks)
    expect(out.type).toBe('bulletList')
    expect(out.content[1].content[0].content[0]).toEqual({
      type: 'taskMention',
      attrs: { id: 't2', label: 'RFQ pagination' },
    })
  })

  it('skips tasks already mentioned, and returns null when none are left', () => {
    expect(completedTasksToBulletList(tasks, ['t1']).content).toHaveLength(1)
    expect(completedTasksToBulletList(tasks, ['t1', 't2'])).toBeNull()
    expect(completedTasksToBulletList([])).toBeNull()
  })
})

describe('mini month helpers', () => {
  it('labels the month', () => {
    expect(monthLabel('2026-09-23')).toBe('Sep 2026')
  })

  it('covers the whole visible grid, outside days included', () => {
    expect(monthGridRange(new Date(2026, 8, 15), 1)).toEqual({
      from: '2026-08-31',
      to: '2026-10-04',
    })
    expect(monthGridRange(new Date(2026, 8, 15), 0)).toEqual({
      from: '2026-08-30',
      to: '2026-10-03',
    })
  })
})

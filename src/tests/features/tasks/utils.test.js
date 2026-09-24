import { describe, expect, it } from 'vitest'
import { taskSchema } from '@/features/tasks/schemas'
import {
  boardStatuses,
  filterTasks,
  groupTasksByStatus,
  linkHost,
  planBoardMove,
  tabCounts,
  textToDoc,
  weekEndISO,
} from '@/features/tasks/utils'

const t = (id, status, position = 1000) => ({ id, status, position })

describe('weekEndISO', () => {
  // Wed 23 Sep 2026
  it('ends on Sunday for a Monday week start', () => {
    expect(weekEndISO('2026-09-23', 1)).toBe('2026-09-27')
  })
  it('ends on Saturday for a Sunday week start', () => {
    expect(weekEndISO('2026-09-23', 0)).toBe('2026-09-26')
  })
  it('handles the last day of the week itself', () => {
    expect(weekEndISO('2026-09-27', 1)).toBe('2026-09-27')
  })
})

describe('groupTasksByStatus', () => {
  it('groups in the status order and sorts by position', () => {
    const groups = groupTasksByStatus([t('a', 'done'), t('b', 'todo', 2000), t('c', 'todo', 1000)])
    expect(groups.map((g) => g.status)).toEqual([
      'todo',
      'in_progress',
      'in_review',
      'blocked',
      'done',
      'cancelled',
    ])
    expect(groups[0].tasks.map((x) => x.id)).toEqual(['c', 'b'])
    expect(groups[4].tasks.map((x) => x.id)).toEqual(['a'])
  })
})

describe('tabs', () => {
  const tasks = [
    t('1', 'todo'),
    t('2', 'in_progress'),
    t('3', 'in_review'),
    t('4', 'done'),
    t('5', 'blocked'),
  ]

  it('filters by tab and status', () => {
    expect(filterTasks(tasks, { tab: 'in_progress' }).map((x) => x.id)).toEqual(['2', '3'])
    expect(filterTasks(tasks, { tab: 'completed' }).map((x) => x.id)).toEqual(['4'])
    expect(filterTasks(tasks, { tab: 'all', status: ['blocked'] }).map((x) => x.id)).toEqual(['5'])
  })

  it('counts every tab', () => {
    expect(tabCounts(tasks)).toEqual({ all: 5, in_progress: 2, completed: 1 })
  })
})

describe('textToDoc', () => {
  it('makes one paragraph per line and drops trailing whitespace', () => {
    expect(textToDoc('a\n\nb\n  ')).toEqual({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'a' }] },
        { type: 'paragraph' },
        { type: 'paragraph', content: [{ type: 'text', text: 'b' }] },
      ],
    })
    expect(textToDoc('   ')).toBeNull()
  })
})

describe('linkHost', () => {
  it('shows the host without www', () => {
    expect(linkHost('https://www.gitlab.com/thmp/buyer/-/merge_requests/1431')).toBe('gitlab.com')
    expect(linkHost('not a url')).toBe('not a url')
  })
})

describe('taskSchema', () => {
  const base = {
    space_id: '6f1c2b58-2f0c-4a8e-9a1a-3c2b1d0e9f11',
    title: 'Fix RFQ pagination',
    description_text: '',
    status: 'todo',
    priority: 'none',
    start_date: null,
    due_date: null,
    external_url: '',
  }

  it('accepts a minimal task and turns an empty link into null', () => {
    const r = taskSchema.parse(base)
    expect(r.external_url).toBeNull()
  })

  it('rejects a due date before the start date on the due field', () => {
    const r = taskSchema.safeParse({ ...base, start_date: '2026-09-30', due_date: '2026-09-01' })
    expect(r.success).toBe(false)
    expect(r.error.issues[0].path).toEqual(['due_date'])
  })

  it('rejects a bad link and an empty title', () => {
    expect(taskSchema.safeParse({ ...base, external_url: 'nope' }).success).toBe(false)
    expect(taskSchema.safeParse({ ...base, title: '  ' }).success).toBe(false)
  })
})

describe('boardStatuses', () => {
  it('shows five columns and never Cancelled', () => {
    expect(boardStatuses()).toEqual(['todo', 'in_progress', 'in_review', 'blocked', 'done'])
    expect(boardStatuses({ status: ['cancelled'] })).toEqual([])
  })

  it('narrows columns by tab and status filter', () => {
    expect(boardStatuses({ tab: 'in_progress' })).toEqual(['in_progress', 'in_review'])
    expect(boardStatuses({ tab: 'completed' })).toEqual(['done'])
    expect(boardStatuses({ status: ['blocked', 'todo'] })).toEqual(['todo', 'blocked'])
    expect(boardStatuses({ tab: 'in_progress', status: ['todo'] })).toEqual([])
  })
})

describe('planBoardMove', () => {
  it('places the card between its new neighbours', () => {
    const column = [t('a', 'todo', 1000), t('x', 'todo', 9000), t('b', 'todo', 2000)]
    expect(planBoardMove(column, 'x')).toEqual({ position: 1500, rebalance: false })
  })

  it('handles the top, the bottom and an empty column', () => {
    expect(planBoardMove([t('x', 'todo', 5), t('a', 'todo', 1000)], 'x').position).toBe(0)
    expect(planBoardMove([t('a', 'todo', 1000), t('x', 'todo', 5)], 'x').position).toBe(2000)
    expect(planBoardMove([t('x', 'todo', 5)], 'x')).toEqual({ position: 1000, rebalance: false })
  })

  it('asks for a rebalance when neighbours are closer than 1e-9', () => {
    const column = [t('a', 'todo', 1), t('x', 'todo', 0), t('b', 'todo', 1 + 1e-10)]
    expect(planBoardMove(column, 'x').rebalance).toBe(true)
  })

  it('asks for a rebalance when neighbours share a position', () => {
    const column = [t('a', 'todo', 0), t('x', 'todo', 0), t('b', 'todo', 0)]
    expect(planBoardMove(column, 'x')).toEqual({ position: 0, rebalance: true })
  })
})

import { describe, expect, it } from 'vitest'
import { taskLinkUrlSchema, taskSchema } from '@/features/tasks/schemas'
import {
  boardStatuses,
  describeActivity,
  filterTasks,
  isEdited,
  linkHost,
  linkInfo,
  planBoardMove,
  sortTasks,
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

describe('tabs', () => {
  const tasks = [
    t('1', 'todo'),
    t('2', 'in_progress'),
    t('3', 'in_review'),
    t('4', 'done'),
    t('5', 'blocked'),
  ]

  it('filters by a status tab and the status filter', () => {
    expect(filterTasks(tasks, { tab: 'in_progress' }).map((x) => x.id)).toEqual(['2'])
    expect(filterTasks(tasks, { tab: 'done' }).map((x) => x.id)).toEqual(['4'])
    expect(filterTasks(tasks, { tab: 'all', status: ['blocked'] }).map((x) => x.id)).toEqual(['5'])
  })

  it('counts All and every status', () => {
    expect(tabCounts(tasks)).toEqual({
      all: 5,
      todo: 1,
      in_progress: 1,
      in_review: 1,
      blocked: 1,
      on_hold: 0,
      done: 1,
      cancelled: 0,
    })
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
    versions: [],
  }

  it('accepts a minimal task', () => {
    expect(taskSchema.safeParse(base).success).toBe(true)
  })

  it('rejects a due date before the start date on the due field', () => {
    const r = taskSchema.safeParse({ ...base, start_date: '2026-09-30', due_date: '2026-09-01' })
    expect(r.success).toBe(false)
    expect(r.error.issues[0].path).toEqual(['due_date'])
  })

  it('accepts several versions and rejects ones that would break the array filter', () => {
    expect(taskSchema.safeParse({ ...base, versions: ['v3.9.0', 'v3.10.0'] }).success).toBe(true)
    expect(taskSchema.safeParse({ ...base, versions: ['v3,9'] }).success).toBe(false)
    expect(taskSchema.safeParse({ ...base, versions: Array(11).fill('v1') }).success).toBe(false)
  })

  it('rejects an empty title', () => {
    expect(taskSchema.safeParse({ ...base, title: '  ' }).success).toBe(false)
  })
})

describe('taskLinkUrlSchema', () => {
  it('accepts a full URL and rejects a bad one', () => {
    expect(
      taskLinkUrlSchema.safeParse('https://gitlab.com/thmp/buyer/-/merge_requests/1431').success,
    ).toBe(true)
    expect(taskLinkUrlSchema.safeParse('nope').success).toBe(false)
  })
})

describe('boardStatuses', () => {
  it('shows six columns and never Cancelled', () => {
    expect(boardStatuses()).toEqual([
      'todo',
      'in_progress',
      'in_review',
      'blocked',
      'on_hold',
      'done',
    ])
    expect(boardStatuses({ status: ['cancelled'] })).toEqual([])
  })

  it('narrows columns by tab and status filter', () => {
    expect(boardStatuses({ tab: 'in_review' })).toEqual(['in_review'])
    expect(boardStatuses({ tab: 'done' })).toEqual(['done'])
    expect(boardStatuses({ tab: 'cancelled' })).toEqual([])
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

describe('sortTasks', () => {
  const task = (id, extra) => ({
    id,
    title: id,
    status: 'todo',
    priority: 'none',
    due_date: null,
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
    position: Number(id.slice(1)) * 1000,
    ...extra,
  })
  const tasks = [
    task('t1', {
      priority: 'low',
      due_date: '2026-10-10',
      status: 'done',
      created_at: '2026-09-03T00:00:00Z',
    }),
    task('t2', { priority: 'urgent', status: 'blocked', created_at: '2026-09-01T00:00:00Z' }),
    task('t3', {
      priority: 'medium',
      due_date: '2026-10-01',
      status: 'todo',
      created_at: '2026-09-02T00:00:00Z',
    }),
  ]
  const ids = (sort) => sortTasks(tasks, sort).map((t) => t.id)

  it('keeps the manual (given) order without a known sort', () => {
    expect(ids('')).toEqual(['t1', 't2', 't3'])
    expect(ids('nope')).toEqual(['t1', 't2', 't3'])
  })

  it('sorts by created, priority and status, both directions', () => {
    expect(ids('-created')).toEqual(['t1', 't3', 't2'])
    expect(ids('-priority')).toEqual(['t2', 't3', 't1'])
    expect(ids('status')).toEqual(['t3', 't2', 't1']) // todo → blocked → done
  })

  it('puts tasks without a due date last in both directions', () => {
    expect(ids('due')).toEqual(['t3', 't1', 't2'])
    expect(ids('-due')).toEqual(['t1', 't3', 't2'])
  })

  it('falls back to position on ties, and never mutates the input', () => {
    const same = [task('t2'), task('t1')]
    expect(sortTasks(same, 'priority').map((t) => t.id)).toEqual(['t1', 't2'])
    expect(same.map((t) => t.id)).toEqual(['t2', 't1'])
  })
})

describe('describeActivity', () => {
  const spaceById = new Map([
    ['s1', { name: 'THMP' }],
    ['s2', { name: 'Personal' }],
  ])
  const text = (entry) => describeActivity(entry, { spaceById }).text

  it('describes every automatic kind as a sentence', () => {
    expect(text({ kind: 'created', to_value: 'todo' })).toBe('Created')
    expect(text({ kind: 'status', from_value: 'in_progress', to_value: 'in_review' })).toBe(
      'Status In progress → In review',
    )
    expect(text({ kind: 'priority', from_value: 'low', to_value: 'high' })).toBe(
      'Priority Low → High',
    )
    expect(text({ kind: 'title', from_value: 'Old title', to_value: 'New' })).toBe(
      'Renamed from ‘Old title’',
    )
    expect(text({ kind: 'space', from_value: 's1', to_value: 's2' })).toBe(
      'Moved from THMP to Personal',
    )
  })

  it('covers the three due-date cases', () => {
    expect(text({ kind: 'due_date', from_value: null, to_value: '2026-09-26' })).toBe(
      'Due date set to 26 Sep',
    )
    expect(text({ kind: 'due_date', from_value: '2026-09-20', to_value: '2026-09-26' })).toBe(
      'Due date 20 Sep → 26 Sep',
    )
    expect(text({ kind: 'due_date', from_value: '2026-09-20', to_value: null })).toBe(
      'Due date cleared',
    )
  })

  it('reads an unknown space as deleted, and gives every kind an icon', () => {
    expect(text({ kind: 'space', from_value: 'gone', to_value: 's1' })).toBe(
      'Moved from a deleted space to THMP',
    )
    for (const kind of ['created', 'status', 'priority', 'due_date', 'title', 'space']) {
      expect(describeActivity({ kind, to_value: 'todo' }, { spaceById }).icon).toBeTruthy()
    }
  })
})

describe('describeActivity: note links', () => {
  const noteTitleById = new Map([['n1', 'Sprint 14 retro'], ['n2', '']])
  const text = (entry) => describeActivity(entry, { noteTitleById }).text

  it('names the linked or unlinked note, or says it was deleted', () => {
    expect(text({ kind: 'note_linked', to_value: 'n1' })).toBe('Linked note ‘Sprint 14 retro’')
    expect(text({ kind: 'note_unlinked', from_value: 'n1' })).toBe('Unlinked note ‘Sprint 14 retro’')
    expect(text({ kind: 'note_linked', to_value: 'n2' })).toBe('Linked note ‘Untitled’')
    expect(text({ kind: 'note_linked', to_value: 'gone' })).toBe('Linked note a deleted note')
    // Before the titles have loaded.
    expect(describeActivity({ kind: 'note_linked', to_value: 'n1' }).text).toBe('Linked note a note')
  })
})

describe('isEdited', () => {
  it('is true only when changed more than a second after writing', () => {
    const at = '2026-09-25T10:00:00.000Z'
    expect(isEdited({ created_at: at, updated_at: at })).toBe(false)
    expect(isEdited({ created_at: at, updated_at: '2026-09-25T10:00:00.900Z' })).toBe(false)
    expect(isEdited({ created_at: at, updated_at: '2026-09-25T10:05:00.000Z' })).toBe(true)
  })
})

describe('linkInfo', () => {
  it('reads GitLab merge requests as !id · project', () => {
    expect(linkInfo('https://gitlab.com/thmp/buyer-web/-/merge_requests/1431')).toEqual({
      kind: 'gitlab',
      text: '!1431 · thmp/buyer-web',
    })
  })

  it('reads Jira issues by key', () => {
    expect(linkInfo('https://thbs.atlassian.net/browse/THMP-123')).toEqual({
      kind: 'jira',
      text: 'THMP-123',
    })
    expect(
      linkInfo(
        'https://thbs.atlassian.net/jira/software/c/projects/THMP/boards/1?selectedIssue=THMP-9',
      ).text,
    ).toBe('THMP-9')
  })

  it('falls back to the host, and a saved label wins', () => {
    expect(linkInfo('https://www.figma.com/file/abc')).toEqual({ kind: 'link', text: 'figma.com' })
    expect(linkInfo('https://gitlab.com/a/b/-/merge_requests/1', 'My MR').text).toBe('My MR')
    expect(linkInfo('not a url')).toEqual({ kind: 'link', text: 'not a url' })
  })
})

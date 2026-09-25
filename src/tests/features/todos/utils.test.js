import { describe, expect, it } from 'vitest'
import { groupTodos, toProgressMap } from '@/features/todos/utils'

const todo = (id, extra = {}) => ({ id, position: 1000, is_done: false, due_date: null, ...extra })

describe('groupTodos', () => {
  const today = '2026-09-23'

  it('buckets by due_date against today, string-compared at the midnight boundary', () => {
    const todos = [
      todo('overdue', { due_date: '2026-09-22' }),
      todo('today', { due_date: '2026-09-23' }),
      todo('upcoming', { due_date: '2026-09-24' }),
      todo('someday', { due_date: null }),
    ]
    const groups = groupTodos(todos, today)
    expect(groups.overdue.map((t) => t.id)).toEqual(['overdue'])
    expect(groups.today.map((t) => t.id)).toEqual(['today'])
    expect(groups.upcoming.map((t) => t.id)).toEqual(['upcoming'])
    expect(groups.someday.map((t) => t.id)).toEqual(['someday'])
    expect(groups.done).toEqual([])
  })

  it('a done todo lands in done regardless of its due date', () => {
    const todos = [
      todo('a', { due_date: '2026-09-01', is_done: true, done_at: '2026-09-23T10:00:00Z' }),
    ]
    const groups = groupTodos(todos, today)
    expect(groups.overdue).toEqual([])
    expect(groups.done.map((t) => t.id)).toEqual(['a'])
  })

  it('sorts open groups by position and done newest-first by done_at', () => {
    const todos = [
      todo('a', { due_date: null, position: 2000 }),
      todo('b', { due_date: null, position: 1000 }),
      todo('older', { is_done: true, done_at: '2026-09-20T10:00:00Z' }),
      todo('newer', { is_done: true, done_at: '2026-09-22T10:00:00Z' }),
    ]
    const groups = groupTodos(todos, today)
    expect(groups.someday.map((t) => t.id)).toEqual(['b', 'a'])
    expect(groups.done.map((t) => t.id)).toEqual(['newer', 'older'])
  })
})

describe('toProgressMap', () => {
  it('counts done and total per task', () => {
    const rows = [
      { id: 'd1', task_id: 't1', is_done: true },
      { id: 'd2', task_id: 't1', is_done: false },
      { id: 'd3', task_id: 't2', is_done: false },
    ]
    const map = toProgressMap(rows)
    expect(map.get('t1')).toEqual({ done: 1, total: 2 })
    expect(map.get('t2')).toEqual({ done: 0, total: 1 })
    expect(map.has('t3')).toBe(false)
  })

  it('returns an empty map for no rows', () => {
    expect(toProgressMap([]).size).toBe(0)
  })
})

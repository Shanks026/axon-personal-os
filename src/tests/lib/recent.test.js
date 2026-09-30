import { afterEach, describe, expect, it, vi } from 'vitest'
import { pushRecent, readRecent, removeRecent } from '@/lib/recent'

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

const task = (id, title = id) => ({ entity_type: 'task', id, space_id: 's1', title })

describe('recent', () => {
  it('keeps the newest 8, deduped on type and id', () => {
    for (let i = 1; i <= 10; i++) pushRecent(task(`t${i}`))
    pushRecent(task('t5', 'renamed'))
    const list = readRecent()
    expect(list).toHaveLength(8)
    expect(list[0]).toMatchObject({ id: 't5', title: 'renamed' })
    expect(list.filter((e) => e.id === 't5')).toHaveLength(1)
    expect(list.map((e) => e.id)).not.toContain('t1')
  })

  it('treats the same id of another type as a different entry, and removes one', () => {
    pushRecent(task('x'))
    pushRecent({ entity_type: 'note', id: 'x', space_id: 's1', title: 'n' })
    expect(readRecent()).toHaveLength(2)
    expect(removeRecent('task', 'x').map((e) => e.entity_type)).toEqual(['note'])
  })

  it('survives blocked or corrupt storage', () => {
    localStorage.setItem('axon:recent', '{not json')
    expect(readRecent()).toEqual([])
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(() => pushRecent(task('y'))).not.toThrow()
    expect(readRecent()).toEqual([])
  })
})

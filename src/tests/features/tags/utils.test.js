import { describe, expect, it } from 'vitest'
import { nextTagColor, tagUsage } from '@/features/tags/utils'
import { TAG_COLORS } from '@/features/tags/constants'

const tag = (color) => ({ color })

describe('nextTagColor', () => {
  it('picks the first unused hue', () => {
    expect(nextTagColor([])).toBe(TAG_COLORS[0])
    expect(nextTagColor([tag(TAG_COLORS[0])])).toBe(TAG_COLORS[1])
    expect(nextTagColor([tag(TAG_COLORS[1]), tag(TAG_COLORS[0])])).toBe(TAG_COLORS[2])
  })

  it('cycles once every hue is taken', () => {
    const all = TAG_COLORS.map(tag)
    expect(nextTagColor(all)).toBe(TAG_COLORS[all.length % TAG_COLORS.length])
  })
})

describe('tagUsage', () => {
  it('combines task and note counts', () => {
    expect(tagUsage({ count: 12, note_count: 3 })).toBe('12 tasks · 3 notes')
    expect(tagUsage({ count: 1, note_count: 0 })).toBe('1 task')
    expect(tagUsage({ count: 0, note_count: 1 })).toBe('1 note')
  })

  it('says Unused when nothing carries the tag', () => {
    expect(tagUsage({ count: 0, note_count: 0 })).toBe('Unused')
    expect(tagUsage({})).toBe('Unused')
  })
})

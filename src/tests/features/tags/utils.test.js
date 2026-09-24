import { describe, expect, it } from 'vitest'
import { nextTagColor } from '@/features/tags/utils'
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

import { describe, expect, it } from 'vitest'
import { needsRebalance, positionAfterLast, positionBetween } from '@/lib/position'

describe('position', () => {
  it('places between neighbours and at edges', () => {
    expect(positionBetween(null, null)).toBe(1000)
    expect(positionBetween(null, 1000)).toBe(0)
    expect(positionBetween(1000, null)).toBe(2000)
    expect(positionBetween(1000, 2000)).toBe(1500)
  })

  it('appends after the largest position', () => {
    expect(positionAfterLast([])).toBe(1000)
    expect(positionAfterLast(undefined)).toBe(1000)
    expect(positionAfterLast([3000, 1000, 2000])).toBe(4000)
  })

  it('detects when neighbours can no longer be split', () => {
    expect(needsRebalance(1, 1 + 1e-10)).toBe(true)
    expect(needsRebalance(1, 1.5)).toBe(false)
  })
})

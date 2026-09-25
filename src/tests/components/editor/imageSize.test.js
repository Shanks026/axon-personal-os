import { describe, expect, it } from 'vitest'
import { clampImageWidth, displayWidth, MIN_IMAGE_WIDTH } from '@/components/editor/imageSize'

describe('clampImageWidth', () => {
  it('keeps the width between the minimum and the column', () => {
    expect(clampImageWidth(300.4, 680)).toBe(300)
    expect(clampImageWidth(10, 680)).toBe(MIN_IMAGE_WIDTH)
    expect(clampImageWidth(900, 680)).toBe(680)
  })

  it('has no upper bound when the column width is unknown', () => {
    expect(clampImageWidth(2000, undefined)).toBe(2000)
    expect(clampImageWidth(2000, 0)).toBe(2000)
  })
})

describe('displayWidth', () => {
  it('prefers the resized width, then the natural width', () => {
    expect(displayWidth({ displayWidth: 320, width: 1200 })).toBe(320)
    expect(displayWidth({ displayWidth: null, width: 1200 })).toBe(1200)
    expect(displayWidth({ displayWidth: null, width: null })).toBeNull()
  })
})

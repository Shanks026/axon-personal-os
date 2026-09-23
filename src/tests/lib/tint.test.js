import { describe, expect, it } from 'vitest'
import { hueVar, tintStyle } from '@/lib/tint'

describe('tint', () => {
  it('maps hue keys to CSS variables', () => {
    expect(tintStyle('blue')).toEqual({ '--tint': 'var(--hue-blue)' })
    expect(hueVar('teal')).toBe('var(--hue-teal)')
  })

  it('passes raw colour vars through and falls back to slate', () => {
    expect(tintStyle('var(--warn)')).toEqual({ '--tint': 'var(--warn)' })
    expect(tintStyle(undefined)).toEqual({ '--tint': 'var(--hue-slate)' })
    expect(hueVar('nope')).toBe('var(--hue-slate)')
  })
})

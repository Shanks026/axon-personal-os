import { describe, expect, it } from 'vitest'
import { shortcutKeys, shortcutLabel } from '@/lib/platform'

describe('shortcutKeys', () => {
  it('uses ⌘ on Mac', () => {
    expect(shortcutKeys('mod+k', true)).toEqual(['⌘', 'K'])
    expect(shortcutKeys('mod+enter', true)).toEqual(['⌘', '↵'])
    expect(shortcutKeys('mod+shift+l', true)).toEqual(['⌘', '⇧', 'L'])
  })

  it('uses the ⌃ control symbol elsewhere, never the word', () => {
    expect(shortcutKeys('mod+k', false)).toEqual(['⌃', 'K'])
    expect(shortcutKeys('mod+enter', false)).toEqual(['⌃', '↵'])
    expect(shortcutKeys('esc', false)).toEqual(['Esc'])
  })
})

describe('shortcutLabel', () => {
  it('spells keys out for screen readers', () => {
    expect(shortcutLabel('mod+k', false)).toBe('Control K')
    expect(shortcutLabel('mod+k', true)).toBe('Command K')
  })
})

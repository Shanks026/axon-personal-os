import { describe, expect, it } from 'vitest'
import {
  isOverridden,
  SHORTCUT_GROUPS,
  SHORTCUTS,
  shortcutById,
  shortcutKeyList,
  shortcutsByGroup,
} from '@/lib/shortcuts'

describe('shortcut registry', () => {
  it('has unique ids and known groups', () => {
    const ids = SHORTCUTS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const s of SHORTCUTS) expect(SHORTCUT_GROUPS).toContain(s.group)
  })

  it('never binds one key twice within a scope', () => {
    const seen = new Map()
    for (const s of SHORTCUTS) {
      for (const key of shortcutKeyList(s)) {
        const slot = `${s.scope}:${key}`
        expect(seen.get(slot), `${slot} is bound by ${seen.get(slot)} and ${s.id}`).toBeUndefined()
        seen.set(slot, s.id)
      }
    }
  })

  it('writes sequences as exactly two steps', () => {
    for (const key of SHORTCUTS.flatMap(shortcutKeyList).filter((k) => k.includes('>'))) {
      expect(key.split('>')).toHaveLength(2)
    }
  })

  it('throws on an unknown id', () => {
    expect(() => shortcutById('nope')).toThrow(/Unknown shortcut/)
  })

  it('lets an active page scope override a global key, and nothing else', () => {
    const newEvent = shortcutById('create.event')
    expect(isOverridden(newEvent, ['global'])).toBe(false)
    expect(isOverridden(newEvent, ['global', 'list'])).toBe(true) // list.edit is `e`
    expect(isOverridden(shortcutById('create.note'), ['global', 'calendar'])).toBe(true)
    expect(isOverridden(shortcutById('create.task'), ['global', 'calendar', 'list'])).toBe(false)
    expect(isOverridden(shortcutById('list.edit'), ['global', 'list'])).toBe(false)
  })

  it('groups the help in order, leaving hidden entries out', () => {
    const groups = shortcutsByGroup()
    expect(groups[0].group).toBe('General')
    expect(groups.flatMap((g) => g.items).some((s) => s.hidden)).toBe(false)
  })
})

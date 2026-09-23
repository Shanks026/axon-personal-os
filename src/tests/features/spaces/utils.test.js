import { describe, expect, it } from 'vitest'
import { spaceSchema } from '@/features/spaces/schemas'
import {
  reorderPosition,
  sectionFromPath,
  slugify,
  splitSpaces,
  uniqueSlug,
} from '@/features/spaces/utils'

describe('slugify', () => {
  it('turns names into URL-safe slugs', () => {
    expect(slugify('THMP')).toBe('thmp')
    expect(slugify('Side projects')).toBe('side-projects')
    expect(slugify('  Life / Admin!!  ')).toBe('life-admin')
    expect(slugify('Café Crème')).toBe('cafe-creme')
  })

  it('never returns the reserved slug or an empty one', () => {
    expect(slugify('Global')).toBe('global-1')
    expect(slugify('!!!')).toBe('space')
    expect(slugify('')).toBe('space')
  })

  it('caps length at 48 without a trailing dash', () => {
    const s = slugify('a'.repeat(47) + ' bcd')
    expect(s.length).toBeLessThanOrEqual(48)
    expect(s.endsWith('-')).toBe(false)
  })
})

describe('uniqueSlug', () => {
  it('returns the base when free', () => {
    expect(uniqueSlug('thmp', ['personal'])).toBe('thmp')
  })

  it('appends the next free number', () => {
    expect(uniqueSlug('thmp', ['thmp'])).toBe('thmp-2')
    expect(uniqueSlug('thmp', ['thmp', 'thmp-2', 'thmp-3'])).toBe('thmp-4')
    expect(uniqueSlug('global', [])).toBe('global-2')
  })

  it('keeps suffixed slugs within 48 characters', () => {
    const base = 'x'.repeat(48)
    expect(uniqueSlug(base, [base]).length).toBeLessThanOrEqual(48)
  })
})

describe('splitSpaces', () => {
  it('separates archived spaces, newest archived first', () => {
    const { active, archived } = splitSpaces([
      { id: 'a', archived_at: null },
      { id: 'b', archived_at: '2026-09-01T00:00:00Z' },
      { id: 'c', archived_at: '2026-09-20T00:00:00Z' },
    ])
    expect(active.map((s) => s.id)).toEqual(['a'])
    expect(archived.map((s) => s.id)).toEqual(['c', 'b'])
  })
})

describe('spaceSchema', () => {
  const valid = {
    name: 'THMP',
    slug: 'thmp',
    description: '',
    color: 'blue',
    icon: '💼',
  }

  it('accepts a valid space', () => {
    expect(spaceSchema.safeParse(valid).success).toBe(true)
  })

  it.each([
    ['empty name', { name: '  ' }],
    ['reserved slug', { slug: 'global' }],
    ['bad slug', { slug: 'Bad Slug' }],
    ['double dash', { slug: 'a--b' }],
    ['unknown colour', { color: 'chartreuse' }],
    ['a word instead of an emoji', { icon: 'unicorn' }],
    ['no emoji', { icon: '' }],
  ])('rejects %s', (_label, patch) => {
    expect(spaceSchema.safeParse({ ...valid, ...patch }).success).toBe(false)
  })
})

describe('reorderPosition', () => {
  const list = [
    { id: 'a', position: 1000 },
    { id: 'b', position: 2000 },
    { id: 'c', position: 3000 },
  ]

  it('moves a card between two neighbours', () => {
    expect(reorderPosition(list, 'c', 'b')).toBe(1500) // c lands between a and b
    expect(reorderPosition(list, 'a', 'b')).toBe(2500) // a lands between b and c
  })

  it('moves a card to either end', () => {
    expect(reorderPosition(list, 'c', 'a')).toBe(0)
    expect(reorderPosition(list, 'a', 'c')).toBe(4000)
  })

  it('returns null when nothing moved', () => {
    expect(reorderPosition(list, 'a', 'a')).toBeNull()
    expect(reorderPosition(list, 'a', null)).toBeNull()
    expect(reorderPosition(list, 'x', 'a')).toBeNull()
  })
})

describe('sectionFromPath', () => {
  it('keeps the section and drops detail segments', () => {
    expect(sectionFromPath('/s/thmp/tasks')).toBe('tasks')
    expect(sectionFromPath('/s/thmp/tasks/abc')).toBe('tasks')
    expect(sectionFromPath('/s/global/journal/2026-09-23')).toBe('journal')
  })

  it('falls back to the dashboard', () => {
    expect(sectionFromPath('/s/thmp')).toBe('dashboard')
    expect(sectionFromPath('/spaces')).toBe('dashboard')
    expect(sectionFromPath('/s/thmp/todos')).toBe('dashboard')
  })
})

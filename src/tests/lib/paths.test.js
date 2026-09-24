import { describe, expect, it } from 'vitest'
import { GLOBAL_SLUG, paths } from '@/lib/paths'

describe('paths', () => {
  it('builds top-level routes', () => {
    expect(paths.home()).toBe('/')
    expect(paths.login()).toBe('/login')
    expect(paths.spaces()).toBe('/spaces')
    expect(paths.settings()).toBe('/settings')
    expect(paths.settings('preferences')).toBe('/settings/preferences')
  })

  it('builds space-scoped routes', () => {
    const p = paths.space('thmp')
    expect(p.root()).toBe('/s/thmp')
    expect(p.dashboard()).toBe('/s/thmp/dashboard')
    expect(p.tasks()).toBe('/s/thmp/tasks')
    expect(p.task('abc')).toBe('/s/thmp/tasks/abc')
    expect(p.note('n1')).toBe('/s/thmp/notes/n1')
    expect(p.journal()).toBe('/s/thmp/journal')
    expect(p.journal('2026-09-23')).toBe('/s/thmp/journal/2026-09-23')
    expect(p.report('r1')).toBe('/s/thmp/reports/r1')
    expect(p.trash()).toBe('/s/thmp/trash')
  })

  it('serialises query params and drops empty values', () => {
    const p = paths.space('thmp')
    expect(p.tasks({ view: 'board', q: '' })).toBe('/s/thmp/tasks?view=board')
    expect(p.calendar({ view: 'week', date: '2026-09-23' })).toBe(
      '/s/thmp/calendar?view=week&date=2026-09-23',
    )
  })

  it('builds the todos page URL', () => {
    expect(paths.space('thmp').todos()).toBe('/s/thmp/todos')
    expect(paths.space('thmp').todos({ highlight: 't1' })).toBe('/s/thmp/todos?highlight=t1')
  })

  it('uses the reserved global slug', () => {
    expect(GLOBAL_SLUG).toBe('global')
    expect(paths.space(GLOBAL_SLUG).notes()).toBe('/s/global/notes')
  })
})

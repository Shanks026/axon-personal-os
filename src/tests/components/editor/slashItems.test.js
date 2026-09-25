import { describe, expect, it } from 'vitest'
import { filterSlashItems, SLASH_ITEMS } from '@/components/editor/extensions/slashItems'

const ids = (items) => items.map((i) => i.id)

describe('filterSlashItems', () => {
  it('returns every item, in the design order, for an empty query', () => {
    expect(ids(filterSlashItems(''))).toEqual(ids(SLASH_ITEMS))
    expect(ids(SLASH_ITEMS).slice(0, 8)).toEqual([
      'heading-1',
      'heading-2',
      'bullet-list',
      'checklist',
      'quote',
      'code-block',
      'table',
      'divider',
    ])
  })

  it('matches titles case-insensitively', () => {
    expect(ids(filterSlashItems('HEAD'))).toEqual(['heading-1', 'heading-2', 'heading-3'])
    expect(ids(filterSlashItems('quote'))).toEqual(['quote'])
  })

  it('matches keywords by prefix', () => {
    expect(ids(filterSlashItems('todo'))).toEqual(['checklist'])
    expect(ids(filterSlashItems('hr'))).toEqual(['divider'])
    expect(ids(filterSlashItems('h2'))).toEqual(['heading-2'])
  })

  it('returns nothing when no item matches', () => {
    expect(filterSlashItems('zzz')).toEqual([])
  })
})

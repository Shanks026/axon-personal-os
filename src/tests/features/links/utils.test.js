import { describe, expect, it } from 'vitest'
import { collectTaskMentionIds, sameIds } from '@/features/links/utils'

const mention = (id) => ({ type: 'taskMention', attrs: { id, label: id } })
const p = (...content) => ({ type: 'paragraph', content })

describe('collectTaskMentionIds', () => {
  it('finds mentions anywhere, unique and sorted', () => {
    const doc = {
      type: 'doc',
      content: [
        p({ type: 'text', text: 'See ' }, mention('t2'), mention('t1')),
        { type: 'bulletList', content: [{ type: 'listItem', content: [p(mention('t2'))] }] },
      ],
    }
    expect(collectTaskMentionIds(doc)).toEqual(['t1', 't2'])
  })

  it('returns nothing for an empty or missing doc', () => {
    expect(collectTaskMentionIds(null)).toEqual([])
    expect(collectTaskMentionIds({ type: 'doc', content: [p()] })).toEqual([])
  })
})

describe('sameIds', () => {
  it('compares sorted id lists', () => {
    expect(sameIds(['a', 'b'], ['a', 'b'])).toBe(true)
    expect(sameIds(['a'], ['a', 'b'])).toBe(false)
    expect(sameIds(['a', 'c'], ['a', 'b'])).toBe(false)
    expect(sameIds([], [])).toBe(true)
  })
})

import { describe, expect, it } from 'vitest'
import { isDocEmpty } from '@/lib/richText'

describe('isDocEmpty', () => {
  it('is empty with no doc, no blocks, or only empty paragraphs', () => {
    expect(isDocEmpty(null)).toBe(true)
    expect(isDocEmpty({ type: 'doc', content: [] })).toBe(true)
    expect(
      isDocEmpty({ type: 'doc', content: [{ type: 'paragraph' }, { type: 'paragraph' }] }),
    ).toBe(true)
  })

  it('counts text, and blocks without text of their own, as content', () => {
    const p = { type: 'paragraph', content: [{ type: 'text', text: 'hi' }] }
    expect(isDocEmpty({ type: 'doc', content: [p] })).toBe(false)
    expect(isDocEmpty({ type: 'doc', content: [{ type: 'horizontalRule' }] })).toBe(false)
  })
})

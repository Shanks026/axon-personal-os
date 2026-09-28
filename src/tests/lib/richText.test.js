import { describe, expect, it } from 'vitest'
import { docToText, isDocEmpty } from '@/lib/richText'

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

describe('docToText', () => {
  const text = (t) => ({ type: 'text', text: t })
  it('puts each block on its own line, with mention labels', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [text('Steps')] },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [text('Check filters')] }],
            },
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [
                    text('See '),
                    { type: 'taskMention', attrs: { id: 'x', label: 'RFQ bug' } },
                  ],
                },
              ],
            },
          ],
        },
        { type: 'paragraph' },
        { type: 'paragraph', content: [text('Done.')] },
      ],
    }
    expect(docToText(doc)).toBe('Steps\nCheck filters\nSee RFQ bug\nDone.')
  })

  it('is empty for no doc', () => {
    expect(docToText(null)).toBe('')
  })
})

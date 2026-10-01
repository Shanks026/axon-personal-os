import { describe, expect, it } from 'vitest'
import { captureSchema } from '@/features/inbox/schemas'
import { captureToNote, captureToTask, itemKind, splitCapture } from '@/features/inbox/utils'

describe('splitCapture', () => {
  it('takes the first non-empty line as the title and the rest as the body', () => {
    expect(splitCapture('\n  Ask Priya about the checkout API  \nline two\n\nline four\n')).toEqual(
      {
        title: 'Ask Priya about the checkout API',
        body: 'line two\n\nline four',
      },
    )
  })

  it('handles one line, blank text and long titles', () => {
    expect(splitCapture('Book dentist')).toEqual({ title: 'Book dentist', body: '' })
    expect(splitCapture('   \n ')).toEqual({ title: '', body: '' })
    expect(splitCapture('x'.repeat(400)).title).toHaveLength(300)
  })
})

describe('captureToNote and captureToTask', () => {
  it('turns the rest into paragraphs (blank lines kept as empty ones)', () => {
    const note = captureToNote('Title\nfirst\n\nthird')
    expect(note.title).toBe('Title')
    expect(note.content_text).toBe('first\n\nthird')
    expect(note.content.content).toEqual([
      { type: 'paragraph', content: [{ type: 'text', text: 'first' }] },
      { type: 'paragraph' },
      { type: 'paragraph', content: [{ type: 'text', text: 'third' }] },
    ])
    expect(captureToTask('Only a title')).toEqual({
      title: 'Only a title',
      description: null,
      description_text: '',
    })
  })
})

describe('itemKind', () => {
  it('reads a link, a question or an idea', () => {
    expect(itemKind('Read https://example.com/article later')).toBe('bookmark')
    expect(itemKind('? what does the PO want for v3.9')).toBe('question')
    expect(itemKind('Should the filter reset on page change?\nmore detail')).toBe('question')
    expect(itemKind('Refactor the vendor listing')).toBe('idea')
  })
})

describe('captureSchema', () => {
  it('needs non-blank text within 5000 characters and a known type', () => {
    expect(captureSchema.safeParse({ body: '  ', type: 'inbox' }).success).toBe(false)
    expect(captureSchema.safeParse({ body: 'x'.repeat(5001), type: 'inbox' }).success).toBe(false)
    expect(captureSchema.safeParse({ body: 'ok', type: 'event' }).success).toBe(false)
    expect(captureSchema.safeParse({ body: ' ok ', type: 'todo' })).toMatchObject({
      success: true,
      data: { body: 'ok', type: 'todo' },
    })
  })
})

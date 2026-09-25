import { describe, expect, it } from 'vitest'
import { countWords, isNoteEmpty, sanitizeSearch, splitPinned } from '@/features/notes/utils'

const doc = (...content) => ({ type: 'doc', content })

describe('isNoteEmpty', () => {
  it('is empty with no title, no text and only empty paragraphs', () => {
    expect(isNoteEmpty({ title: '', content_text: '', content: null })).toBe(true)
    expect(isNoteEmpty({ title: '  ', content_text: '\n', content: doc({ type: 'paragraph' }) })).toBe(
      true,
    )
  })

  it('keeps a note with only a title, or only content', () => {
    expect(isNoteEmpty({ title: 'Plan', content_text: '' })).toBe(false)
    expect(isNoteEmpty({ title: '', content_text: 'body' })).toBe(false)
  })

  it('keeps a note whose only blocks carry no text (a divider, a table)', () => {
    expect(
      isNoteEmpty({ title: '', content_text: '', content: doc({ type: 'horizontalRule' }) }),
    ).toBe(false)
  })
})

describe('sanitizeSearch', () => {
  it('strips the characters that break a PostgREST or() filter', () => {
    expect(sanitizeSearch('a,b(c)"d\'e*f\\g')).toBe('a b c d e f g')
  })

  it('trims and collapses whitespace', () => {
    expect(sanitizeSearch('  sprint   42 ')).toBe('sprint 42')
    expect(sanitizeSearch('')).toBe('')
    expect(sanitizeSearch(undefined)).toBe('')
  })

  it('keeps ordinary punctuation', () => {
    expect(sanitizeSearch('v3.10 RCA: buyer-portal')).toBe('v3.10 RCA: buyer-portal')
  })
})

describe('countWords', () => {
  it('counts whitespace-separated words', () => {
    expect(countWords('Two-week sprint,\n22 Sep')).toBe(4)
    expect(countWords('   ')).toBe(0)
    expect(countWords(null)).toBe(0)
  })
})

describe('splitPinned', () => {
  it('splits pinned from the rest, keeping order', () => {
    const notes = [{ id: 1 }, { id: 2, pinned_at: 'x' }, { id: 3 }, { id: 4, pinned_at: 'y' }]
    const { pinned, rest } = splitPinned(notes)
    expect(pinned.map((n) => n.id)).toEqual([2, 4])
    expect(rest.map((n) => n.id)).toEqual([1, 3])
  })
})

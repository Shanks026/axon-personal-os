import { isDocEmpty } from '@/lib/richText'

/**
 * True when a note has nothing worth keeping: no title, no text, no tags or versions, and no
 * blocks that carry no text of their own (a table, a divider). Used to discard a brand-new note
 * the user left blank.
 */
export function isNoteEmpty({ title, content_text, content, tag_ids, versions }) {
  if (title?.trim() || content_text?.trim()) return false
  if (tag_ids?.length || versions?.length) return false
  return isDocEmpty(content)
}

/**
 * Makes a search string safe inside a PostgREST `or=(…)` filter: drops the characters that
 * delimit it (`,` `(` `)` quotes, `*` wildcards, backslashes) and collapses whitespace.
 */
export function sanitizeSearch(q) {
  return (q ?? '')
    .replace(/[,()"'*\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Word count for the editor rail. */
export function countWords(text) {
  return (text ?? '').split(/\s+/).filter(Boolean).length
}

/** Pinned notes first (their own section), then the rest; both keep the incoming order. */
export function splitPinned(notes) {
  const pinned = []
  const rest = []
  for (const note of notes) (note.pinned_at ? pinned : rest).push(note)
  return { pinned, rest }
}

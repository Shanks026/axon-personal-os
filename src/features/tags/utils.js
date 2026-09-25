import { TAG_COLORS } from '@/features/tags/constants'

/** The first hue no existing tag uses yet, cycling once every colour is taken. */
export function nextTagColor(tags) {
  const used = new Set(tags.map((t) => t.color))
  return TAG_COLORS.find((c) => !used.has(c)) ?? TAG_COLORS[tags.length % TAG_COLORS.length]
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

/** "12 tasks · 3 notes", "1 note", or "Unused" (Manage tags rows and the delete confirm). */
export function tagUsage({ count = 0, note_count = 0 }) {
  const parts = []
  if (count) parts.push(plural(count, 'task'))
  if (note_count) parts.push(plural(note_count, 'note'))
  return parts.length ? parts.join(' · ') : 'Unused'
}

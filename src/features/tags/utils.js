import { TAG_COLORS } from '@/features/tags/constants'

/** The first hue no existing tag uses yet, cycling once every colour is taken. */
export function nextTagColor(tags) {
  const used = new Set(tags.map((t) => t.color))
  return TAG_COLORS.find((c) => !used.has(c)) ?? TAG_COLORS[tags.length % TAG_COLORS.length]
}

import { RESULT_GROUPS } from '@/features/search/constants'

// search_all marks matches in snippets with private-use characters, never HTML.
const START = ''
const STOP = ''

/** A snippet → `[{ text, match }]` segments. */
export function parseSnippet(snippet) {
  if (!snippet) return []
  const out = []
  let match = false
  let text = ''
  for (const ch of snippet) {
    if (ch === START || ch === STOP) {
      if (text) out.push({ text, match })
      text = ''
      match = ch === START
    } else text += ch
  }
  if (text) out.push({ text, match })
  return out
}

/** A title with each case-insensitive occurrence of `q` marked, in the same segment shape. */
export function highlightTitle(title, q) {
  const text = String(title ?? '')
  const needle = String(q ?? '')
    .trim()
    .toLowerCase()
  if (!text) return []
  if (!needle) return [{ text, match: false }]
  const lower = text.toLowerCase()
  const out = []
  let at = 0
  for (let i = lower.indexOf(needle); i !== -1; i = lower.indexOf(needle, at)) {
    if (i > at) out.push({ text: text.slice(at, i), match: false })
    out.push({ text: text.slice(i, i + needle.length), match: true })
    at = i + needle.length
  }
  if (at < text.length) out.push({ text: text.slice(at), match: false })
  return out
}

/** Whether a static palette item matches: every word of `q` is in its label or keywords. */
export function matchesQuery(label, q, keywords = '') {
  const words = String(q ?? '')
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
  if (!words.length) return true
  const hay = `${label} ${keywords}`.toLowerCase()
  return words.every((w) => hay.includes(w))
}

/** Rows → `[{ type, label, items }]` in `RESULT_GROUPS` order, leaving out empty groups. */
export function groupResults(rows) {
  const byType = new Map()
  for (const row of rows ?? []) {
    if (!byType.has(row.entity_type)) byType.set(row.entity_type, [])
    byType.get(row.entity_type).push(row)
  }
  return RESULT_GROUPS.filter((g) => byType.has(g.type)).map((g) => ({
    ...g,
    items: byType.get(g.type),
  }))
}

/** The next type filter for Tab (`step` -1 for Shift+Tab), cycling through `filters`. */
export function nextTypeFilter(filters, current, step = 1) {
  const i = filters.findIndex((f) => f.type === current)
  return filters[(i + step + filters.length) % filters.length].type
}

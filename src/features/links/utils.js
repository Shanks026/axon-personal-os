/** Unique, sorted task ids of every `taskMention` node in a Tiptap doc (what the note mentions). */
export function collectTaskMentionIds(doc) {
  const ids = new Set()
  const walk = (node) => {
    if (!node) return
    if (node.type === 'taskMention' && node.attrs?.id) ids.add(node.attrs.id)
    node.content?.forEach(walk)
  }
  walk(doc)
  return [...ids].sort()
}

/** Two sorted id lists hold the same ids. */
export function sameIds(a, b) {
  return a.length === b.length && a.every((id, i) => id === b[i])
}

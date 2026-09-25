/**
 * True when a Tiptap doc holds nothing: no blocks, or only empty paragraphs. A doc whose blocks
 * carry no text of their own (a divider, an empty table) still counts as content.
 */
export function isDocEmpty(doc) {
  const blocks = doc?.content ?? []
  return blocks.every((node) => node.type === 'paragraph' && !node.content?.length)
}

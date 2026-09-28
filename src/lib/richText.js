/**
 * True when a Tiptap doc holds nothing: no blocks, or only empty paragraphs. A doc whose blocks
 * carry no text of their own (a divider, an empty table) still counts as content.
 */
export function isDocEmpty(doc) {
  const blocks = doc?.content ?? []
  return blocks.every((node) => node.type === 'paragraph' && !node.content?.length)
}

const BLOCKS = new Set([
  'paragraph',
  'heading',
  'codeBlock',
  'blockquote',
  'listItem',
  'taskItem',
  'tableRow',
  'horizontalRule',
])

/**
 * A Tiptap doc's plain text, one line per block (like the editor's `getText({ blockSeparator:
 * '\n' })`): the `*_text` column written beside a doc that didn't come from a live editor.
 * Mention chips contribute their label.
 */
export function docToText(doc) {
  const lines = []
  let line = ''
  const flush = () => {
    if (line.trim()) lines.push(line.trim())
    line = ''
  }
  const walk = (node) => {
    if (!node) return
    if (node.type === 'text') line += node.text ?? ''
    else if (node.type === 'hardBreak') line += '\n'
    else if (node.type === 'taskMention') line += node.attrs?.label ?? ''
    const isBlock = BLOCKS.has(node.type)
    if (isBlock) flush()
    node.content?.forEach(walk)
    if (isBlock) flush()
  }
  walk(doc)
  flush()
  return lines.join('\n')
}

import { MarkdownManager } from '@tiptap/markdown'
import { buildExtensions } from '@/components/editor/extensions/buildExtensions'

let manager = null
const getManager = () =>
  (manager ??= new MarkdownManager({ extensions: buildExtensions({ placeholder: '' }) }))

/**
 * Tiptap JSON → Markdown with the official `@tiptap/markdown` serializer, using the editor's own
 * extension list (so headings, lists, checklists, tables, code fences, links and highlights all
 * round-trip). No live editor is needed, so it works from saved content too.
 */
export function docToMarkdown(doc) {
  return doc ? getManager().serialize(doc).trim() : ''
}

/**
 * Markdown → Tiptap JSON with the same extensions (AI drafts, Feature 17). Blank input gives
 * `null`, the editor's "no description".
 */
export function markdownToDoc(markdown) {
  const text = markdown?.trim()
  return text ? getManager().parse(text) : null
}

/** A note as Markdown: the title as `# Title` (when set), then the body. */
export function noteToMarkdown({ title, content }) {
  const body = docToMarkdown(content)
  const heading = title?.trim() ? `# ${title.trim()}` : ''
  return [heading, body].filter(Boolean).join('\n\n')
}

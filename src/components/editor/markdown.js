import { MarkdownManager } from '@tiptap/markdown'
import { buildExtensions } from '@/components/editor/extensions/buildExtensions'

let manager = null

/**
 * Tiptap JSON → Markdown with the official `@tiptap/markdown` serializer, using the editor's own
 * extension list (so headings, lists, checklists, tables, code fences, links and highlights all
 * round-trip). No live editor is needed, so it works from saved content too.
 */
export function docToMarkdown(doc) {
  manager ??= new MarkdownManager({ extensions: buildExtensions({ placeholder: '' }) })
  return doc ? manager.serialize(doc).trim() : ''
}

/** A note as Markdown: the title as `# Title` (when set), then the body. */
export function noteToMarkdown({ title, content }) {
  const body = docToMarkdown(content)
  const heading = title?.trim() ? `# ${title.trim()}` : ''
  return [heading, body].filter(Boolean).join('\n\n')
}

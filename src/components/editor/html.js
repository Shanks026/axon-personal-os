import { generateJSON } from '@tiptap/core'
import { buildExtensions } from '@/components/editor/extensions/buildExtensions'

let extensions = null

/**
 * HTML → Tiptap JSON with the editor's own extensions (Jira's rendered descriptions, Feature 17).
 * The schema keeps only what the editor supports: unknown elements become paragraphs or plain
 * text, and scripts, styles and event handlers never survive. Blank input gives `null`.
 */
export function htmlToDoc(html) {
  if (!html?.trim()) return null
  extensions ??= buildExtensions({ placeholder: '' })
  return generateJSON(html, extensions)
}

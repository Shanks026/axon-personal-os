import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { CodeBlockView } from '@/components/editor/CodeBlockView'
import { lowlight } from '@/components/editor/codeLanguages'

/**
 * Syntax-highlighted code blocks (replaces StarterKit's `codeBlock`; same node name, so existing
 * blocks keep working). Highlight colours live in `editor.css` (`.hljs-*`).
 */
export const CodeBlockHighlighted = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView)
  },
}).configure({ lowlight, defaultLanguage: null })

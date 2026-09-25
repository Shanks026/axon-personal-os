import { NodeViewContent, NodeViewWrapper } from '@tiptap/react'
import { CODE_LANGUAGES, PLAIN_TEXT } from '@/components/editor/codeLanguages'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

/**
 * Code block node view: the highlighted `<pre>` plus a language picker in its top-right corner
 * (outside the editable content). Choosing "Plain text" clears the `language` attribute.
 */
export function CodeBlockView({ node, updateAttributes, editor }) {
  const language = node.attrs.language || PLAIN_TEXT
  return (
    <NodeViewWrapper className="group/code relative">
      {editor.isEditable && (
        <div
          contentEditable={false}
          className="absolute top-1.5 right-1.5 z-10 opacity-0 transition-opacity group-hover/code:opacity-100 focus-within:opacity-100 has-data-[state=open]:opacity-100"
        >
          <Select
            value={language}
            onValueChange={(v) => updateAttributes({ language: v === PLAIN_TEXT ? null : v })}
          >
            <SelectTrigger
              size="sm"
              aria-label="Code language"
              className="h-7 border-none bg-background/80 font-sans text-xs text-muted-foreground shadow-none"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end" className="max-h-72">
              {CODE_LANGUAGES.map((l) => (
                <SelectItem key={l.value} value={l.value} className="text-sm">
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <pre>
        <NodeViewContent as="code" />
      </pre>
    </NodeViewWrapper>
  )
}

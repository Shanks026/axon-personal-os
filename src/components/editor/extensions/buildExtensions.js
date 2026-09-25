import Highlight from '@tiptap/extension-highlight'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table'
import { Placeholder } from '@tiptap/extensions'
import StarterKit from '@tiptap/starter-kit'
import { CodeBlockHighlighted } from '@/components/editor/extensions/CodeBlockHighlighted'
import { KeyboardShortcuts } from '@/components/editor/extensions/KeyboardShortcuts'
import { SlashCommand } from '@/components/editor/extensions/SlashCommand'

/**
 * The editor's extension list. StarterKit (v3) already bundles Link, Underline, ListKeymap and
 * TrailingNode; its plain `codeBlock` is swapped for the highlighted one (same node name).
 * `features` is a plain config object so the editor never imports feature code:
 * - `slash`: the `/` block menu.
 * - `codeHighlight` (default on): lowlight code blocks with a language picker.
 * Feature 07 adds `taskMentions`.
 */
export function buildExtensions({ placeholder, features = {} }) {
  const highlight = features.codeHighlight !== false
  const extensions = [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
      ...(highlight && { codeBlock: false }),
    }),
    Placeholder.configure({ placeholder }),
    Highlight,
    TaskList,
    TaskItem.configure({ nested: true }),
    Table.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,
    KeyboardShortcuts, // Mod-s save (via editor storage) and Mod-k link
  ]
  if (highlight) extensions.push(CodeBlockHighlighted)
  if (features.slash) extensions.push(SlashCommand)
  return extensions
}

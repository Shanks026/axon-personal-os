import Highlight from '@tiptap/extension-highlight'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table'
import { Placeholder } from '@tiptap/extensions'
import StarterKit from '@tiptap/starter-kit'
import { SlashCommand } from '@/components/editor/extensions/SlashCommand'

/**
 * The editor's extension list. StarterKit (v3) already bundles Link, Underline, ListKeymap and
 * TrailingNode. `features` is a plain config object so the editor never imports feature code:
 * `slash` turns on the `/` menu (Feature 07 adds `taskMentions`).
 */
export function buildExtensions({ placeholder, features = {} }) {
  const extensions = [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
    }),
    Placeholder.configure({ placeholder }),
    Highlight,
    TaskList,
    TaskItem.configure({ nested: true }),
    Table.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,
  ]
  if (features.slash) extensions.push(SlashCommand)
  return extensions
}

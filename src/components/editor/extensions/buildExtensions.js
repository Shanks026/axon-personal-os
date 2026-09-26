import Highlight from '@tiptap/extension-highlight'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table'
import { Placeholder } from '@tiptap/extensions'
import StarterKit from '@tiptap/starter-kit'
import { CodeBlockHighlighted } from '@/components/editor/extensions/CodeBlockHighlighted'
import { HeadingTones } from '@/components/editor/extensions/HeadingTones'
import { ImageBlock } from '@/components/editor/extensions/ImageBlock'
import { ImageUpload } from '@/components/editor/extensions/ImageUpload'
import { KeyboardShortcuts } from '@/components/editor/extensions/KeyboardShortcuts'
import { SlashCommand } from '@/components/editor/extensions/SlashCommand'
import { TaskMention } from '@/components/editor/extensions/TaskMention'

/**
 * The editor's extension list. StarterKit (v3) already bundles Link, Underline, ListKeymap and
 * TrailingNode; its plain `codeBlock` is swapped for the highlighted one (same node name).
 * `features` is a plain config object so the editor never imports feature code:
 * - `slash`: the `/` block menu.
 * - `codeHighlight` (default on): lowlight code blocks with a language picker.
 * - `compact`: the task dialog's description (H2–H3 only, no H1 or Table in the `/` menu,
 *   Mod-Enter left to the dialog's submit).
 * - `images` (Feature 15): upload and URL handlers. Image nodes always render (existing images
 *   show anywhere); paste, drop and "/ Image" need the handlers (set via `setImageHandlers`).
 * - `taskMentions` (Feature 07): `{ search, create, NodeView }` for `[[` mentions and "Make task".
 *   The node itself is always registered, so docs with mentions open (as chips) anywhere.
 * - `headingTones` (Feature 09): `{ [headingText]: tone }`, adds `data-tone` to matching headings
 *   (the journal's red Blockers).
 */
export function buildExtensions({ placeholder, features = {} }) {
  const highlight = features.codeHighlight !== false
  const extensions = [
    StarterKit.configure({
      heading: { levels: features.compact ? [2, 3] : [1, 2, 3] },
      link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
      dropcursor: { color: 'var(--ring)', width: 2 },
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
    ImageBlock,
    TaskMention.configure({ config: features.taskMentions ?? null }),
    ImageUpload.configure({ handlers: features.images ?? null }),
    // Mod-s save (via editor storage), Mod-k link, and Mod-Enter for dialogs.
    KeyboardShortcuts.configure({ swallowModEnter: !!features.compact }),
  ]
  if (highlight) extensions.push(CodeBlockHighlighted)
  if (features.headingTones)
    extensions.push(HeadingTones.configure({ tones: features.headingTones }))
  if (features.slash) {
    extensions.push(
      SlashCommand.configure({
        exclude: [
          ...(features.compact ? ['heading-1', 'table'] : []),
          ...(features.images ? [] : ['image']),
          ...(features.taskMentions ? [] : ['link-task']),
        ],
      }),
    )
  }
  return extensions
}

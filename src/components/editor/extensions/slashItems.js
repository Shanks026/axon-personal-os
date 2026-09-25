import { pickImageFiles } from '@/components/editor/extensions/ImageUpload'
import {
  Code,
  Heading1,
  Heading2,
  Heading3,
  SquareCheckBig,
  ImageIcon,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Pilcrow,
  Table,
  TextQuote,
} from 'lucide-react'

/**
 * Blocks offered by the `/` menu (design 07b order: the common blocks first, each with its
 * markdown shortcut as a hint; Text, H3 and numbered list last). `command` receives the editor
 * and the range of the typed "/query", which it replaces.
 */
export const SLASH_ITEMS = [
  {
    id: 'heading-1',
    title: 'Heading 1',
    hint: '#',
    keywords: ['h1', 'title', 'big'],
    icon: Heading1,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run(),
  },
  {
    id: 'heading-2',
    title: 'Heading 2',
    hint: '##',
    keywords: ['h2', 'subtitle'],
    icon: Heading2,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run(),
  },
  {
    id: 'bullet-list',
    title: 'Bulleted list',
    hint: '-',
    keywords: ['ul', 'unordered', 'bullet'],
    icon: List,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    id: 'checklist',
    title: 'Checklist',
    hint: '[]',
    keywords: ['todo', 'task', 'checkbox'],
    icon: ListChecks,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleTaskList().run(),
  },
  {
    id: 'quote',
    title: 'Quote',
    hint: '>',
    keywords: ['blockquote', 'citation'],
    icon: TextQuote,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    id: 'code-block',
    title: 'Code block',
    hint: '```',
    keywords: ['code', 'snippet', 'pre'],
    icon: Code,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
  {
    id: 'table',
    title: 'Table',
    hint: '',
    keywords: ['grid', 'rows', 'columns'],
    icon: Table,
    command: ({ editor, range }) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run(),
  },
  {
    id: 'divider',
    title: 'Divider',
    hint: '---',
    keywords: ['hr', 'rule', 'separator', 'line'],
    icon: Minus,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
  {
    id: 'link-task',
    title: 'Link task',
    hint: '@',
    keywords: ['mention', 'task', 'link', 'reference'],
    icon: SquareCheckBig,
    // Leaves "@" behind, which opens the task search (TaskMention).
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).insertContent('@').run(),
  },
  {
    id: 'image',
    title: 'Image',
    hint: '',
    keywords: ['picture', 'screenshot', 'photo', 'upload'],
    icon: ImageIcon,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run()
      pickImageFiles(editor)
    },
  },
  {
    id: 'text',
    title: 'Text',
    hint: '',
    keywords: ['paragraph', 'plain', 'p'],
    icon: Pilcrow,
    command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setParagraph().run(),
  },
  {
    id: 'heading-3',
    title: 'Heading 3',
    hint: '###',
    keywords: ['h3'],
    icon: Heading3,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run(),
  },
  {
    id: 'numbered-list',
    title: 'Numbered list',
    hint: '1.',
    keywords: ['ol', 'ordered', 'number'],
    icon: ListOrdered,
    command: ({ editor, range }) =>
      editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
]

/** Case-insensitive match on the title and keywords; an empty query returns every item. */
export function filterSlashItems(query, items = SLASH_ITEMS) {
  const q = (query ?? '').trim().toLowerCase()
  if (!q) return items
  return items.filter(
    (item) => item.title.toLowerCase().includes(q) || item.keywords.some((k) => k.startsWith(q)),
  )
}

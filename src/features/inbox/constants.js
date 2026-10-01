import {
  Bookmark,
  CircleHelp,
  FileText,
  Inbox,
  Lightbulb,
  ListChecks,
  SquareCheckBig,
} from 'lucide-react'

/** Quick capture's destinations (the design delta: no Event; Tab cycles them). */
export const CAPTURE_TYPES = [
  { value: 'inbox', label: 'Inbox', icon: Inbox, submit: 'Save to inbox' },
  { value: 'task', label: 'Task', icon: SquareCheckBig, submit: 'Create task' },
  { value: 'todo', label: 'Todo', icon: ListChecks, submit: 'Create todo' },
  { value: 'note', label: 'Note', icon: FileText, submit: 'Create note' },
]

/** An inbox item's kind, derived from its text (`itemKind`), never stored. */
export const ITEM_KINDS = {
  bookmark: { label: 'Link', icon: Bookmark },
  question: { label: 'Question', icon: CircleHelp },
  idea: { label: 'Idea', icon: Lightbulb },
}

export const SOURCE_LABELS = { quick_capture: 'Quick capture', email: 'Email', api: 'API' }

export const MAX_CAPTURE = 5000

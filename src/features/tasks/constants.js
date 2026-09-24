import {
  Circle,
  CircleAlert,
  CircleCheck,
  CircleDot,
  CircleEllipsis,
  CircleX,
  Minus,
  SignalHigh,
  SignalLow,
  SignalMedium,
  TriangleAlert,
} from 'lucide-react'

// Values mirror the tasks table check constraints exactly. Visuals: design-system.md.
// `tone` is a CSS colour for the tint recipe (pills) and the icon colour.
export const TASK_STATUSES = [
  {
    value: 'todo',
    label: 'To do',
    icon: Circle,
    tone: 'var(--space-accent)',
    iconTone: 'var(--muted-foreground)',
  },
  { value: 'in_progress', label: 'In progress', icon: CircleDot, tone: 'var(--warn)' },
  { value: 'in_review', label: 'In review', icon: CircleEllipsis, tone: 'var(--review)' },
  { value: 'blocked', label: 'Blocked', icon: CircleAlert, tone: 'var(--destructive)' },
  { value: 'done', label: 'Completed', icon: CircleCheck, tone: 'var(--ok)' },
  {
    value: 'cancelled',
    label: 'Cancelled',
    icon: CircleX,
    tone: 'var(--muted-foreground)',
    iconTone: 'var(--faint)',
  },
]
export const TASK_STATUS_MAP = Object.fromEntries(TASK_STATUSES.map((s) => [s.value, s]))
export const CLOSED_STATUSES = ['done', 'cancelled']

/** Board columns (design delta 04/05): Cancelled is never shown on the board. */
export const BOARD_STATUSES = ['todo', 'in_progress', 'in_review', 'blocked', 'done']

export const TASK_PRIORITIES = [
  { value: 'none', label: 'None', icon: Minus, tone: 'var(--faint)', rank: 0 },
  { value: 'low', label: 'Low', icon: SignalLow, tone: 'var(--faint)', rank: 1 },
  { value: 'medium', label: 'Medium', icon: SignalMedium, tone: 'var(--hue-teal)', rank: 2 },
  { value: 'high', label: 'High', icon: SignalHigh, tone: 'var(--warn)', rank: 3 },
  { value: 'urgent', label: 'Urgent', icon: TriangleAlert, tone: 'var(--destructive)', rank: 4 },
]
export const TASK_PRIORITY_MAP = Object.fromEntries(TASK_PRIORITIES.map((p) => [p.value, p]))

export const DUE_FILTERS = [
  { value: 'overdue', label: 'Overdue' },
  { value: 'today', label: 'Due today' },
  { value: 'week', label: 'This week' },
  { value: 'none', label: 'No due date' },
]

/** Tabs of the Tasks page. Todos have their own page (Feature 05). */
export const TASK_TABS = [
  { value: 'all', label: 'All', match: () => true },
  {
    value: 'in_progress',
    label: 'In progress',
    match: (t) => t.status === 'in_progress' || t.status === 'in_review',
  },
  { value: 'completed', label: 'Completed', match: (t) => t.status === 'done' },
]

export const TASK_VIEWS = ['grid', 'board', 'list']

/** Closed tasks older than this are hidden unless the Completed tab or a status filter asks. */
export const DONE_WINDOW_DAYS = 30

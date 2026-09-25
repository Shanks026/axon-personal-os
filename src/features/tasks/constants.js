import {
  Circle,
  CircleAlert,
  CircleCheck,
  CircleDot,
  CircleEllipsis,
  CirclePause,
  CircleX,
} from 'lucide-react'
import { Dot } from '@/components/shared/Dot'

// Values mirror the tasks table check constraints exactly. Visuals: design-system.md.
// `color` is a Tailwind colour-scale key (lib/tint.js), the user's own scheme (2026-09-25).
export const TASK_STATUSES = [
  { value: 'todo', label: 'To do', icon: Circle, color: 'slate' },
  { value: 'in_progress', label: 'In progress', icon: CircleDot, color: 'blue' },
  { value: 'in_review', label: 'In review', icon: CircleEllipsis, color: 'violet' },
  { value: 'blocked', label: 'Blocked', icon: CircleAlert, color: 'pink' },
  { value: 'on_hold', label: 'On hold', icon: CirclePause, color: 'amber' },
  { value: 'done', label: 'Completed', icon: CircleCheck, color: 'emerald' },
  { value: 'cancelled', label: 'Cancelled', icon: CircleX, color: 'red' },
]
export const TASK_STATUS_MAP = Object.fromEntries(TASK_STATUSES.map((s) => [s.value, s]))
export const CLOSED_STATUSES = ['done', 'cancelled']

/** Board columns (design delta 04/05): Cancelled is never shown on the board. */
export const BOARD_STATUSES = ['todo', 'in_progress', 'in_review', 'blocked', 'on_hold', 'done']

// Priority is a plain coloured dot, not a signal-bars icon (the user's request, 2026-09-25).
export const TASK_PRIORITIES = [
  { value: 'none', label: 'None', icon: Dot, color: 'slate', rank: 0 },
  { value: 'low', label: 'Low', icon: Dot, color: 'slate', rank: 1 },
  { value: 'medium', label: 'Medium', icon: Dot, color: 'teal', rank: 2 },
  { value: 'high', label: 'High', icon: Dot, color: 'amber', rank: 3 },
  { value: 'urgent', label: 'Urgent', icon: Dot, color: 'red', rank: 4 },
]
export const TASK_PRIORITY_MAP = Object.fromEntries(TASK_PRIORITIES.map((p) => [p.value, p]))

export const DUE_FILTERS = [
  { value: 'overdue', label: 'Overdue' },
  { value: 'today', label: 'Due today' },
  { value: 'week', label: 'This week' },
  { value: 'none', label: 'No due date' },
]

/** Tabs of the Tasks page: All, then one per status (the user's request, 2026-09-25). */
export const TASK_TABS = [
  { value: 'all', label: 'All', match: () => true },
  ...TASK_STATUSES.map((s) => ({
    value: s.value,
    label: s.label,
    match: (t) => t.status === s.value,
  })),
]

export const TASK_VIEWS = ['grid', 'board', 'table']

/** Closed tasks older than this are hidden unless the Completed tab or a status filter asks. */
export const DONE_WINDOW_DAYS = 30

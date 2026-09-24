import {
  CalendarDays,
  ChartNoAxesColumn,
  FileText,
  Inbox,
  ListChecks,
  LayoutDashboard,
  NotebookPen,
  SquareCheckBig,
} from 'lucide-react'

/** Primary sidebar sections (design delta 03). Tasks and Todos are separate pages (G1, reversed). */
export const NAV_ITEMS = [
  { section: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { section: 'inbox', label: 'Inbox', icon: Inbox },
  { section: 'tasks', label: 'Tasks', icon: SquareCheckBig },
  { section: 'todos', label: 'Todos', icon: ListChecks },
  { section: 'notes', label: 'Notes', icon: FileText },
  { section: 'journal', label: 'Journal', icon: NotebookPen },
  { section: 'calendar', label: 'Calendar', icon: CalendarDays },
  { section: 'reports', label: 'Reports', icon: ChartNoAxesColumn },
]

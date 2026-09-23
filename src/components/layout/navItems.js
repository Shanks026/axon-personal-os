import {
  CalendarDays,
  ChartNoAxesColumn,
  FileText,
  Inbox,
  LayoutDashboard,
  NotebookPen,
  SquareCheckBig,
} from 'lucide-react'

/** Primary sidebar sections (design delta 03): Tasks & Todos is one module (G1). */
export const NAV_ITEMS = [
  { section: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { section: 'inbox', label: 'Inbox', icon: Inbox },
  { section: 'tasks', label: 'Tasks & Todos', icon: SquareCheckBig },
  { section: 'notes', label: 'Notes', icon: FileText },
  { section: 'journal', label: 'Journal', icon: NotebookPen },
  { section: 'calendar', label: 'Calendar', icon: CalendarDays },
  { section: 'reports', label: 'Reports', icon: ChartNoAxesColumn },
]

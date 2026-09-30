import {
  CalendarDays,
  ChartNoAxesColumn,
  FileText,
  ListChecks,
  NotebookPen,
  SquareCheckBig,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const ICONS = {
  task: SquareCheckBig,
  note: FileText,
  journal: NotebookPen,
  todo: ListChecks,
  event: CalendarDays,
  report: ChartNoAxesColumn,
}

/** The icon for an entity type (the sidebar's section icons): task, note, journal, todo, event, report. */
export function EntityIcon({ type, className }) {
  const Icon = ICONS[type] ?? FileText
  return <Icon className={cn('size-4 shrink-0 text-muted-foreground', className)} aria-hidden />
}

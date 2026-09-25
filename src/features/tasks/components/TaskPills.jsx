import { DotPill, TintPill } from '@/components/shared/TintPill'
import { textClasses } from '@/lib/tint'
import { cn } from '@/lib/utils'
import { TASK_PRIORITY_MAP, TASK_STATUS_MAP } from '@/features/tasks/constants'

/** Filled status pill (design: cards and board). Pass onClick/asButton to make it a menu trigger. */
export function TaskStatusPill({ status, ...props }) {
  const s = TASK_STATUS_MAP[status] ?? TASK_STATUS_MAP.todo
  return (
    <TintPill color={s.color} {...props}>
      {s.label}
    </TintPill>
  )
}

/** Outlined priority pill. Renders nothing for "none" unless `showNone`. */
export function TaskPriorityPill({ priority, showNone = false, ...props }) {
  if (priority === 'none' && !showNone) return null
  const p = TASK_PRIORITY_MAP[priority] ?? TASK_PRIORITY_MAP.none
  return (
    <DotPill color={p.color} {...props}>
      {p.label}
    </DotPill>
  )
}

/** Status icon for dense rows (design: row status icons). */
export function TaskStatusIcon({ status, className }) {
  const s = TASK_STATUS_MAP[status] ?? TASK_STATUS_MAP.todo
  const Icon = s.icon
  return (
    <Icon className={cn('size-3.75 shrink-0', textClasses(s.color), className)} aria-hidden />
  )
}

/** Priority icon (a coloured dot) for dense rows. */
export function TaskPriorityIcon({ priority, className }) {
  const p = TASK_PRIORITY_MAP[priority] ?? TASK_PRIORITY_MAP.none
  const Icon = p.icon
  return <Icon color={p.color} className={cn('size-2.5 shrink-0', className)} />
}

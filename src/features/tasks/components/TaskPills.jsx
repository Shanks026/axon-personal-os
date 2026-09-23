import { DotPill, TintPill } from '@/components/shared/TintPill'
import { cn } from '@/lib/utils'
import { TASK_PRIORITY_MAP, TASK_STATUS_MAP } from '@/features/tasks/constants'

/** Filled status pill (design: cards and board). Pass onClick/asButton to make it a menu trigger. */
export function TaskStatusPill({ status, ...props }) {
  const s = TASK_STATUS_MAP[status] ?? TASK_STATUS_MAP.todo
  return (
    <TintPill tone={s.tone} {...props}>
      {s.label}
    </TintPill>
  )
}

/** Outlined priority pill. Renders nothing for "none" unless `showNone`. */
export function TaskPriorityPill({ priority, showNone = false, ...props }) {
  if (priority === 'none' && !showNone) return null
  const p = TASK_PRIORITY_MAP[priority] ?? TASK_PRIORITY_MAP.none
  return (
    <DotPill tone={p.tone} {...props}>
      {p.label}
    </DotPill>
  )
}

/** Status icon for dense rows (design: row status icons). */
export function TaskStatusIcon({ status, className }) {
  const s = TASK_STATUS_MAP[status] ?? TASK_STATUS_MAP.todo
  const Icon = s.icon
  return (
    <Icon
      className={cn('size-3.75 shrink-0', className)}
      style={{ color: s.iconTone ?? s.tone }}
      aria-hidden
    />
  )
}

/** Priority icon for dense rows. */
export function TaskPriorityIcon({ priority, className }) {
  const p = TASK_PRIORITY_MAP[priority] ?? TASK_PRIORITY_MAP.none
  const Icon = p.icon
  return (
    <Icon className={cn('size-3.75 shrink-0', className)} style={{ color: p.tone }} aria-hidden />
  )
}

import { FileText, SquareCheckBig } from 'lucide-react'
import { Link } from 'react-router'
import { paths } from '@/lib/paths'
import { MENTION_CLASSES, MENTION_LABEL_CLASSES, textClasses } from '@/lib/tint'
import { cn } from '@/lib/utils'
import { useSpace } from '@/context/SpaceContext'
import { EntityPreviewCard } from '@/components/shared/EntityPreviewCard'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { TASK_STATUS_MAP } from '@/features/tasks/constants'

/**
 * An inline chip linking to a task or a note (design: Entity chip): 24px, a status icon for a
 * task or a file icon for a note, then the label. It goes to the entity's own space URL (links can
 * cross spaces). With `preview`, hovering shows `EntityPreviewCard` (the chip itself is a normal
 * link, so keyboards and screen readers lose nothing). A `deleted` target renders muted and
 * struck through, and isn't a link. `tone`: `plain` (no fill, the status icon: linked lists) or
 * `blue` (inline mentions: blue text with a dotted underline, no fill, one common task icon, no
 * status; the hover card has the details). Never the space accent (the user's request, 2026-09-26).
 * @param {{ kind: 'task' | 'note', id: string, spaceId: string, label: string, status?: string, deleted?: boolean, preview?: boolean, tone?: 'plain' | 'blue', className?: string }} props
 */
export function EntityLink({
  kind,
  id,
  spaceId,
  label,
  status,
  deleted = false,
  preview = true,
  tone = 'plain',
  className,
}) {
  const { spaceById } = useSpace()
  const mention = tone === 'blue'
  const s = kind === 'task' && !mention ? (TASK_STATUS_MAP[status] ?? TASK_STATUS_MAP.todo) : null
  const Icon = mention && kind === 'task' ? SquareCheckBig : s ? s.icon : FileText
  const chip = cn(
    'inline-flex h-6 max-w-full min-w-0 items-center gap-1.5 rounded-md px-2 align-middle text-sm leading-none',
    mention ? MENTION_CLASSES : 'px-1',
    className,
  )
  const body = (
    <>
      <Icon
        className={cn(
          'size-3.5 shrink-0',
          mention ? 'text-current' : s ? textClasses(s.color) : 'text-muted-foreground',
        )}
        aria-hidden
      />
      <span className={cn('truncate', mention && MENTION_LABEL_CLASSES)}>
        {label || (kind === 'note' ? 'Untitled' : 'Task')}
      </span>
    </>
  )

  const space = spaceById.get(spaceId)
  if (deleted || !space) {
    return (
      <span className={cn(chip, 'text-faint line-through')} title={`Deleted ${kind}`}>
        {body}
      </span>
    )
  }

  const to = kind === 'task' ? paths.space(space.slug).task(id) : paths.space(space.slug).note(id)
  const link = (
    <Link
      to={to}
      className={cn(
        chip,
        'outline-none focus-visible:ring-2 focus-visible:ring-ring',
        !mention && 'hover:underline',
      )}
    >
      {body}
    </Link>
  )
  if (!preview) return link

  return (
    <HoverCard openDelay={250} closeDelay={100}>
      <HoverCardTrigger asChild>{link}</HoverCardTrigger>
      <HoverCardContent align="start" className="w-88 p-0">
        <EntityPreviewCard kind={kind} id={id} />
      </HoverCardContent>
    </HoverCard>
  )
}

import { formatRelative } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { DueLabel } from '@/components/shared/DueLabel'
import { SpaceIcon } from '@/components/shared/SpaceIcon'
import { TagPillGroup } from '@/components/shared/TagPill'
import { PriorityMenu, StatusMenu, TaskActionsMenu } from '@/features/tasks/components/TaskMenus'
import { TaskLinksButton } from '@/features/tasks/components/TaskLinksButton'
import { TaskPriorityPill, TaskStatusPill } from '@/features/tasks/components/TaskPills'
import { VersionBadgeGroup } from '@/features/tasks/components/VersionBadge'
import { isClosed } from '@/features/tasks/utils'
import { ChecklistProgressBadge } from '@/features/todos/components/ChecklistProgressBadge'

/**
 * Grid card (design 04a/G2): status + priority pills, MR chip and menu on top; a 2-line title
 * (full title on hover); a 2-line description; a meta row (checklist progress); then, pinned to
 * the bottom, up to 3 tags (+n) and a dashed footer with "Updated 2d ago" and the due label. `showSpace` (Global) adds the space's
 * emoji. The card body opens `onEdit`.
 */
export function TaskCard({ task, space, showSpace, tags, progress, onEdit, onSetField, onDelete }) {
  const closed = isClosed(task)
  return (
    <article
      className={cn(
        'group relative flex h-full min-h-44 flex-col rounded-xl border bg-card px-5 py-4.5 transition duration-(--dur-fast) ease-(--ease-standard) hover:-translate-y-px hover:border-border-strong hover:shadow-xs',
        task.status === 'cancelled' && 'opacity-70',
      )}
    >
      <button
        type="button"
        onClick={() => onEdit(task)}
        className="absolute inset-0 z-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Edit ${task.title}`}
        title={task.title}
      />

      <div className="pointer-events-none relative flex h-6.5 items-center gap-1.5">
        <StatusMenu value={task.status} onChange={(v) => onSetField(task, 'status', v)}>
          <TaskStatusPill
            status={task.status}
            asButton
            className="pointer-events-auto"
            aria-label="Change status"
          />
        </StatusMenu>
        {task.priority !== 'none' && (
          <PriorityMenu value={task.priority} onChange={(v) => onSetField(task, 'priority', v)}>
            <TaskPriorityPill
              priority={task.priority}
              asButton
              className="pointer-events-auto"
              aria-label="Change priority"
            />
          </PriorityMenu>
        )}
        <div className="flex-1" />
        <span className="pointer-events-auto">
          <TaskLinksButton links={task.links} />
        </span>
        <span className="pointer-events-auto">
          <TaskActionsMenu
            task={task}
            onEdit={() => onEdit(task)}
            onDelete={() => onDelete(task)}
          />
        </span>
      </div>

      <div className="pointer-events-none relative mt-3.5 flex items-start gap-2">
        <h3
          className={cn(
            'line-clamp-2 min-w-0 flex-1 text-base leading-snug font-semibold tracking-tight text-pretty',
            closed && 'text-muted-foreground line-through decoration-faint',
          )}
        >
          {task.title}
        </h3>
        <VersionBadgeGroup versions={task.versions} className="mt-0.5" />
      </div>
      {task.description_text && (
        <p className="pointer-events-none relative mt-1.5 line-clamp-2 leading-relaxed text-muted-foreground">
          {task.description_text}
        </p>
      )}
      {/* Meta row: checklist progress now; linked-notes count joins it in Feature 07. */}
      {progress?.total > 0 && (
        <div className="pointer-events-none relative mt-2.5 flex items-center gap-3">
          <ChecklistProgressBadge progress={progress} />
        </div>
      )}
      <div className="flex-1" />
      {/* Tags sit on the footer, so a short or missing description just leaves space above. */}
      {tags?.length > 0 && (
        <TagPillGroup tags={tags} max={3} className="pointer-events-none relative mt-3" />
      )}

      <footer className="pointer-events-none relative mt-3 flex items-center gap-2 border-t border-dashed border-border-strong pt-3.5">
        {showSpace && (
          <span className="flex" title={space?.name}>
            <SpaceIcon icon={space?.icon} size="sm" />
            <span className="sr-only">{space?.name}</span>
          </span>
        )}
        <span className="text-xs whitespace-nowrap text-muted-foreground">
          Updated {formatRelative(task.updated_at)}
        </span>
        <div className="flex-1" />
        <DueLabel
          date={task.due_date}
          completedAt={task.completed_at}
          closed={closed}
          className="font-sans"
        />
      </footer>
    </article>
  )
}

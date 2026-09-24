import { GitPullRequestArrow } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DueLabel } from '@/components/shared/DueLabel'
import { SpaceIcon } from '@/components/shared/SpaceIcon'
import { TagPillGroup } from '@/components/shared/TagPill'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { PriorityMenu, StatusMenu, TaskActionsMenu } from '@/features/tasks/components/TaskMenus'
import { TaskPriorityPill, TaskStatusPill } from '@/features/tasks/components/TaskPills'
import { isClosed, linkHost } from '@/features/tasks/utils'

/**
 * Grid card (design 04a/G2): status + priority pills, MR chip and menu on top; title; a 2-line
 * description; tags; a dashed footer with the space and the due label. The card body opens
 * `onEdit`.
 */
export function TaskCard({ task, space, tags, onEdit, onSetField, onDelete }) {
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
        {task.external_url && (
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href={task.external_url}
                target="_blank"
                rel="noopener noreferrer"
                className="pointer-events-auto flex size-6.5 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:text-foreground"
                aria-label={`Open link (${linkHost(task.external_url)})`}
              >
                <GitPullRequestArrow className="size-3.25" />
              </a>
            </TooltipTrigger>
            <TooltipContent>{linkHost(task.external_url)}</TooltipContent>
          </Tooltip>
        )}
        <span className="pointer-events-auto">
          <TaskActionsMenu
            task={task}
            onEdit={() => onEdit(task)}
            onDelete={() => onDelete(task)}
          />
        </span>
      </div>

      <h3
        className={cn(
          'pointer-events-none relative mt-3.5 text-base leading-snug font-semibold tracking-tight text-pretty',
          closed && 'text-muted-foreground line-through decoration-faint',
        )}
      >
        {task.title}
      </h3>
      {task.description_text && (
        <p className="pointer-events-none relative mt-1.5 line-clamp-2 leading-relaxed text-muted-foreground">
          {task.description_text}
        </p>
      )}
      {tags?.length > 0 && (
        <TagPillGroup tags={tags} className="pointer-events-none relative mt-2.5 flex-wrap" />
      )}
      <div className="flex-1" />

      <footer className="pointer-events-none relative mt-4 flex items-center gap-2 border-t border-dashed border-border-strong pt-3.5">
        <SpaceIcon icon={space?.icon} size="sm" />
        <span className="truncate font-medium">{space?.name}</span>
        <div className="flex-1" />
        <DueLabel date={task.due_date} completedAt={task.completed_at} closed={closed} />
      </footer>
    </article>
  )
}

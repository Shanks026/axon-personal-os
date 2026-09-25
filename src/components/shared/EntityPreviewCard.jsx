import { formatRelative } from '@/lib/dates'
import { textClasses } from '@/lib/tint'
import { cn } from '@/lib/utils'
import { useSpace } from '@/context/SpaceContext'
import { DueLabel } from '@/components/shared/DueLabel'
import { SpaceIcon } from '@/components/shared/SpaceIcon'
import { Skeleton } from '@/components/ui/skeleton'
import { useNote } from '@/features/notes/api'
import { useTaskSummary } from '@/features/tasks/api'
import { TASK_PRIORITY_MAP, TASK_STATUS_MAP } from '@/features/tasks/constants'

function TaskPreview({ id }) {
  const { spaceById } = useSpace()
  const { data: task, isLoading } = useTaskSummary(id)
  if (isLoading) return <PreviewSkeleton />
  if (!task) return <p className="text-muted-foreground">This task is gone.</p>
  const status = TASK_STATUS_MAP[task.status]
  const space = spaceById.get(task.space_id)
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <status.icon className={cn('size-3.5', textClasses(status.color))} aria-hidden />
        {status.label}
        {task.priority !== 'none' && (
          <>
            <span className="text-faint">·</span>
            {TASK_PRIORITY_MAP[task.priority].label}
          </>
        )}
        <span className="flex-1" />
        <DueLabel
          date={task.due_date}
          completedAt={task.completed_at}
          closed={task.status === 'done' || task.status === 'cancelled'}
          showEmpty={false}
        />
      </div>
      <p className="leading-snug font-semibold">{task.title}</p>
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <SpaceIcon icon={space?.icon} size="xs" />
        {space?.name}
      </span>
    </div>
  )
}

function NotePreview({ id }) {
  const { data: note, isLoading } = useNote(id)
  if (isLoading) return <PreviewSkeleton />
  if (!note) return <p className="text-muted-foreground">This note is gone.</p>
  return (
    <div className="flex flex-col gap-1.5">
      <p className="leading-snug font-semibold">{note.title || 'Untitled'}</p>
      {note.content_text && (
        <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">
          {note.content_text}
        </p>
      )}
      <span className="text-xs text-faint">Updated {formatRelative(note.updated_at)}</span>
    </div>
  )
}

function PreviewSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-hidden>
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  )
}

/**
 * The hover card body for an `EntityLink` (design: Entity chip): a task's status · priority ·
 * due, its title and space; or a note's title, a 3-line excerpt and when it was updated. It only
 * mounts while the card is open, so nothing is fetched until someone hovers.
 */
export function EntityPreviewCard({ kind, id }) {
  return kind === 'task' ? <TaskPreview id={id} /> : <NotePreview id={id} />
}

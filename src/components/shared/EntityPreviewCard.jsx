import { useMemo } from 'react'
import { formatRelative } from '@/lib/dates'
import { useSpace } from '@/context/SpaceContext'
import { DueLabel } from '@/components/shared/DueLabel'
import { SpaceIcon } from '@/components/shared/SpaceIcon'
import { TagPillGroup } from '@/components/shared/TagPill'
import { VersionBadgeGroup } from '@/components/shared/VersionBadge'
import { Skeleton } from '@/components/ui/skeleton'
import { useNote } from '@/features/notes/api'
import { useTags } from '@/features/tags/api'
import { useTaskSummary } from '@/features/tasks/api'
import { TaskPriorityPill, TaskStatusPill } from '@/features/tasks/components/TaskPills'

/**
 * A task laid out like its grid card (the user's request, 2026-09-26): status and priority pills
 * with versions on the right, a 2-line title, a 2-line description, tags, then a dashed footer
 * with "Updated …" and the due label (the space emoji first, in Global only). Read-only.
 */
function TaskPreview({ id }) {
  const { spaceById, isGlobal } = useSpace()
  const { data: task, isLoading } = useTaskSummary(id)
  const spaceIds = useMemo(() => (task ? [task.space_id] : []), [task])
  const { data: tags = [] } = useTags({ spaceIds })
  if (isLoading) return <PreviewSkeleton />
  if (!task) return <p className="p-4 text-muted-foreground">This task is gone.</p>
  const space = spaceById.get(task.space_id)
  const taskTags = task.tag_ids.map((tid) => tags.find((t) => t.id === tid)).filter(Boolean)
  const closed = task.status === 'done' || task.status === 'cancelled'

  return (
    <div className="flex flex-col px-4.5 py-4">
      <div className="flex items-center gap-1.5">
        <TaskStatusPill status={task.status} />
        <TaskPriorityPill priority={task.priority} />
        <div className="flex-1" />
        <VersionBadgeGroup versions={task.versions} />
      </div>
      <p className="mt-3 line-clamp-2 text-base leading-snug font-semibold tracking-tight">
        {task.title}
      </p>
      {task.description_text && (
        <p className="mt-1.5 line-clamp-2 leading-relaxed text-muted-foreground">
          {task.description_text}
        </p>
      )}
      {taskTags.length > 0 && <TagPillGroup tags={taskTags} max={3} className="mt-3" />}
      <footer className="mt-3 flex items-center gap-2 border-t border-dashed border-border-strong pt-3">
        {/* The space emoji only in Global, as on the task card. */}
        {isGlobal && (
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
    </div>
  )
}

function NotePreview({ id }) {
  const { data: note, isLoading } = useNote(id)
  if (isLoading) return <PreviewSkeleton />
  if (!note) return <p className="p-4 text-muted-foreground">This note is gone.</p>
  return (
    <div className="flex flex-col gap-1.5 px-4.5 py-4">
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
    <div className="flex flex-col gap-2 p-4" aria-hidden>
      <Skeleton className="h-5 w-24 rounded-full" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  )
}

/**
 * The hover card body for an `EntityLink`: a task as a mini task card, or a note's title, a
 * 3-line excerpt and when it was updated. It only mounts while the card is open, so nothing is
 * fetched until someone hovers.
 */
export function EntityPreviewCard({ kind, id }) {
  return kind === 'task' ? <TaskPreview id={id} /> : <NotePreview id={id} />
}

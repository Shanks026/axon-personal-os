import { useState } from 'react'
import { Link2, Plus, X } from 'lucide-react'
import { DueLabel } from '@/components/shared/DueLabel'
import { EntityLink } from '@/components/shared/EntityLink'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useLinkNoteTask, useTasksForNote, useUnlinkNoteTask } from '@/features/links/api'
import { TaskPickerDialog } from '@/features/links/components/TaskPickerDialog'
import { useCreateTask } from '@/features/tasks/api'

/**
 * "Linked tasks" at the top of the note editor's Details rail (design 07b): each task as a chip
 * (status icon, title, hover preview) with its due label and an unlink ✕, then "Link task" (a
 * search picker, any space) and a "New task…" field that creates the task in the note's space
 * and links it.
 */
export function LinkedTasksSection({ note }) {
  const { data: links = [], isLoading } = useTasksForNote(note.id)
  const link = useLinkNoteTask()
  const unlink = useUnlinkNoteTask()
  const createTask = useCreateTask()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [title, setTitle] = useState('')

  const create = async () => {
    const t = title.trim()
    if (!t || createTask.isPending) return
    const task = await createTask.mutateAsync({ space_id: note.space_id, title: t })
    link.mutate({ noteId: note.id, taskId: task.id })
    setTitle('')
  }

  return (
    <section aria-labelledby="linked-tasks" className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <h3 id="linked-tasks" className="font-medium">
          Linked tasks
        </h3>
        {links.length > 0 && (
          <span className="font-mono text-xs text-faint tabular-nums">{links.length}</span>
        )}
      </div>

      {isLoading ? (
        <Skeleton className="h-6 w-3/4" aria-hidden />
      ) : links.length === 0 ? (
        <p className="text-muted-foreground">Not linked to any task.</p>
      ) : (
        links.map(({ task }) => (
          <div key={task.id} className="group flex min-h-8 items-center gap-1.5">
            <EntityLink
              kind="task"
              id={task.id}
              spaceId={task.space_id}
              label={task.title}
              status={task.status}
              className="min-w-0 flex-1 justify-start"
            />
            <DueLabel
              date={task.due_date}
              completedAt={task.completed_at}
              closed={task.status === 'done' || task.status === 'cancelled'}
              showEmpty={false}
            />
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => unlink.mutate({ noteId: note.id, taskId: task.id })}
              aria-label={`Unlink ${task.title}`}
              className="text-faint opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
            >
              <X />
            </Button>
          </div>
        ))
      )}

      <Button
        variant="ghost"
        size="sm"
        className="-mx-2 justify-start text-muted-foreground"
        onClick={() => setPickerOpen(true)}
      >
        <Link2 />
        Link task
      </Button>
      <div className="flex h-8 items-center gap-2">
        <Plus className="size-3.5 shrink-0 text-faint" aria-hidden />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              create()
            }
          }}
          maxLength={300}
          placeholder="New task…"
          aria-label="New linked task"
          className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-faint"
        />
      </div>

      <TaskPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        excludeIds={links.map((l) => l.task.id)}
        onPick={(task) => link.mutate({ noteId: note.id, taskId: task.id })}
      />
    </section>
  )
}

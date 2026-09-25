import { useState } from 'react'
import { Link2, Plus } from 'lucide-react'
import { DueLabel } from '@/components/shared/DueLabel'
import { EntityLink } from '@/components/shared/EntityLink'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useLinkNoteTask, useTasksForNote, useUnlinkNoteTask } from '@/features/links/api'
import { TaskPickerDialog } from '@/features/links/components/TaskPickerDialog'
import { UnlinkButton } from '@/features/links/components/UnlinkButton'
import { TaskDialog } from '@/features/tasks/components/TaskDialog'

/**
 * "Linked tasks" at the top of the note editor's Details rail (design 07b): each task as a chip
 * (status icon, title, hover preview) with its due label and an unlink ✕, then "Link task" (a
 * search picker, any space) and "New task", which opens the full task dialog (status,
 * priority, dates, tags, description…) in the note's space and links whatever it saves.
 */
export function LinkedTasksSection({ note }) {
  const { data: links = [], isLoading } = useTasksForNote(note.id)
  const link = useLinkNoteTask()
  const unlink = useUnlinkNoteTask()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

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
        links.map(({ task, source }) => (
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
            <UnlinkButton
              source={source}
              label={task.title}
              onUnlink={() => unlink.mutate({ noteId: note.id, taskId: task.id })}
            />
          </div>
        ))
      )}

      <div className="-mx-2 flex flex-col">
        <Button
          variant="ghost"
          size="sm"
          className="justify-start text-muted-foreground"
          onClick={() => setPickerOpen(true)}
        >
          <Link2 />
          Link task
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="justify-start text-muted-foreground"
          onClick={() => setDialogOpen(true)}
        >
          <Plus />
          New task
        </Button>
      </div>

      {/* The full task dialog, fixed to the note's space; each saved task (Create more too) is linked. */}
      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialValues={{ space_id: note.space_id }}
        onSuccess={(task) => link.mutate({ noteId: note.id, taskId: task.id })}
      />
      <TaskPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        excludeIds={links.map((l) => l.task.id)}
        onPick={(task) => link.mutate({ noteId: note.id, taskId: task.id })}
      />
    </section>
  )
}

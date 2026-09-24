import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { SortableBoardCard } from '@/features/tasks/components/BoardCard'
import { TaskStatusPill } from '@/features/tasks/components/TaskPills'
import { TASK_STATUS_MAP } from '@/features/tasks/constants'

/**
 * One board column (design 04c): a 270px muted well with the status pill, a count and `+`, the
 * sortable cards, and "+ Add task". `onAdd()` returns true when the column should show its
 * inline quick-add (in a space); in Global the board opens the dialog instead.
 */
export function BoardColumn({ status, tasks, highlighted, cardProps, onAdd, onQuickAdd, footer }) {
  const { setNodeRef } = useDroppable({ id: status })
  const [adding, setAdding] = useState(false)
  const label = TASK_STATUS_MAP[status].label
  const add = () => {
    if (onAdd()) setAdding(true)
  }

  return (
    <section
      ref={setNodeRef}
      aria-label={`${label} column`}
      className={cn(
        'flex w-67.5 shrink-0 flex-col gap-2.5 rounded-2xl border bg-muted p-2.5 transition-colors duration-(--dur-fast)',
        highlighted ? 'border-space' : 'border-transparent',
      )}
    >
      <header className="flex h-7.5 items-center gap-2 px-1">
        <TaskStatusPill status={status} />
        <span className="text-faint tabular-nums">{tasks.length}</span>
        <div className="flex-1" />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-faint"
              onClick={add}
              aria-label={`Add task to ${label}`}
            >
              <Plus />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Add task</TooltipContent>
        </Tooltip>
      </header>

      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        {tasks.map((task) => (
          <SortableBoardCard key={task.id} task={task} {...cardProps(task)} />
        ))}
      </SortableContext>

      {footer}

      {adding ? (
        <ColumnQuickAdd label={label} onSubmit={onQuickAdd} onClose={() => setAdding(false)} />
      ) : (
        <button
          type="button"
          onClick={add}
          className="flex h-8.5 items-center gap-2 rounded-lg px-2 text-faint transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus className="size-3.5" aria-hidden />
          Add task
        </button>
      )}
    </section>
  )
}

/** Inline quick-add: Enter creates and stays open for the next one; Esc (or blurring empty) closes. */
function ColumnQuickAdd({ label, onSubmit, onClose }) {
  const [title, setTitle] = useState('')
  return (
    <input
      autoFocus
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose()
        if (e.key === 'Enter' && title.trim()) {
          onSubmit(title.trim())
          setTitle('')
        }
      }}
      onBlur={() => !title.trim() && onClose()}
      maxLength={300}
      placeholder="Task title, then Enter"
      aria-label={`New task in ${label}`}
      className="h-10 rounded-xl border bg-card px-3 outline-none placeholder:text-faint focus:border-ring focus:ring-3 focus:ring-ring/50"
    />
  )
}

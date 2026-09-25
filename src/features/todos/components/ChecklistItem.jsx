import { useState } from 'react'
import { GripVertical, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useDeleteTodo, useRestoreTodo, useToggleTodo, useUpdateTodo } from '@/features/todos/api'
import { AnimatedCheckbox } from '@/features/todos/components/AnimatedCheckbox'

/**
 * A compact checklist row (design: Task Detail.dc.html): a 34px row with a handle, a small
 * checkbox, an inline-editable title and a delete button. No due chip, task chip or space badge
 * — those belong to the full `TodoItem` on the Todos page.
 */
export function ChecklistItem({ todo, dragHandleProps }) {
  const toggle = useToggleTodo()
  const update = useUpdateTodo()
  const del = useDeleteTodo()
  const restore = useRestoreTodo()
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(todo.title)

  const saveTitle = () => {
    const trimmed = title.trim()
    if (trimmed && trimmed !== todo.title) update.mutate({ id: todo.id, patch: { title: trimmed } })
    else setTitle(todo.title)
    setEditing(false)
  }

  const remove = () =>
    del.mutate(todo.id, {
      onSuccess: () =>
        toast('Todo deleted', {
          description: todo.title,
          action: { label: 'Undo', onClick: () => restore.mutate(todo.id) },
        }),
    })

  return (
    <div className="group flex h-8.5 items-center gap-2.5 rounded-md px-1">
      <button
        type="button"
        aria-label="Reorder"
        className="shrink-0 cursor-grab touch-none text-faint opacity-0 outline-none group-hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring"
        {...dragHandleProps}
      >
        <GripVertical className="size-3.5" aria-hidden />
      </button>

      <AnimatedCheckbox
        checked={todo.is_done}
        onCheckedChange={(v) => toggle.mutate({ id: todo.id, is_done: v })}
        label={todo.is_done ? `Mark "${todo.title}" not done` : `Mark "${todo.title}" done`}
        size="sm"
      />

      {editing ? (
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
            if (e.key === 'Escape') {
              setTitle(todo.title)
              setEditing(false)
            }
          }}
          aria-label="Todo title"
          maxLength={500}
          className="min-w-0 flex-1 rounded-sm bg-transparent outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={cn(
            'min-w-0 flex-1 truncate text-left outline-none focus-visible:ring-2 focus-visible:ring-ring',
            todo.is_done && 'text-faint line-through decoration-faint',
          )}
        >
          {todo.title}
        </button>
      )}

      <Button
        variant="ghost"
        size="icon-xs"
        className="shrink-0 text-faint opacity-0 group-hover:opacity-100"
        onClick={remove}
        aria-label={`Delete ${todo.title}`}
      >
        <Trash2 />
      </Button>
    </div>
  )
}

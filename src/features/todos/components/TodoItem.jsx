import { useState } from 'react'
import { Ellipsis, GripVertical, Pencil, Trash2 } from 'lucide-react'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useSpace } from '@/context/SpaceContext'
import { flashPulse } from '@/components/motion/presets'
import { SpaceBadge } from '@/components/shared/SpaceBadge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useDeleteTodo, useRestoreTodo, useToggleTodo, useUpdateTodo } from '@/features/todos/api'
import { AnimatedCheckbox } from '@/features/todos/components/AnimatedCheckbox'
import { TaskChip } from '@/features/todos/components/TaskChip'
import { TodoDueChip } from '@/features/todos/components/TodoDueChip'

/**
 * A todo row (design: Todos.dc.html). The root carries `id="todo-<id>"` so `useHighlightTodo`
 * can scroll to and flash it. `dragHandleProps` come from `useSortable` in `SortableTodoList`.
 */
export function TodoItem({ todo, showSpace, onEdit, flash, dragHandleProps }) {
  const { spaceById } = useSpace()
  const toggle = useToggleTodo()
  const update = useUpdateTodo()
  const del = useDeleteTodo()
  const restore = useRestoreTodo()
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(todo.title)

  const space = spaceById.get(todo.space_id)

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
    <div id={`todo-${todo.id}`} className="group relative flex min-h-10 items-center gap-3 px-1">
      {flash && (
        <motion.div
          variants={flashPulse}
          initial="initial"
          animate="animate"
          className="pointer-events-none absolute inset-0 rounded-md bg-space-soft"
          aria-hidden
        />
      )}

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

      {todo.task_id && <TaskChip task={todo.task} spaceSlug={space?.slug} />}
      {showSpace && <SpaceBadge space={space} />}
      {!todo.is_done && (
        <TodoDueChip
          date={todo.due_date}
          onChange={(due_date) => update.mutate({ id: todo.id, patch: { due_date } })}
        />
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            className="shrink-0 text-faint opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100"
            aria-label={`${todo.title} options`}
          >
            <Ellipsis className="rotate-90" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem onSelect={() => onEdit(todo)}>
            <Pencil />
            Edit…
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={remove}>
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

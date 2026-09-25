import { useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ErrorState } from '@/components/shared/ErrorState'
import { Skeleton } from '@/components/ui/skeleton'
import { useCreateTodo, useTodos } from '@/features/todos/api'
import { ChecklistItem } from '@/features/todos/components/ChecklistItem'
import { ChecklistProgressBadge } from '@/features/todos/components/ChecklistProgressBadge'
import { SortableTodoList } from '@/features/todos/components/SortableTodoList'

/**
 * A task's checklist (design: Task Detail.dc.html), mounted in `TaskDialog` (edit mode) and, from
 * Feature 07, the task detail page. Changes save immediately; they don't depend on the task
 * form's own submit.
 */
export function TodoChecklist({ taskId, spaceId, showTitle = true, className }) {
  const { data, isLoading, error, refetch } = useTodos({ taskId })
  const create = useCreateTodo()
  const inputRef = useRef(null)
  const [title, setTitle] = useState('')
  const items = data ?? []
  const done = items.filter((t) => t.is_done).length

  const submit = () => {
    const trimmed = title.trim()
    if (!trimmed) return
    create.mutate({ task_id: taskId, space_id: spaceId, title: trimmed })
    setTitle('')
    inputRef.current?.focus()
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {showTitle && (
        <div className="flex h-5 items-center gap-2">
          <span className="text-sm font-medium">Checklist</span>
          {items.length > 0 && <ChecklistProgressBadge progress={{ done, total: items.length }} />}
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col gap-1.5" aria-hidden>
          {[70, 55, 40].map((w, i) => (
            <div key={i} className="flex h-8.5 items-center gap-2.5 px-1">
              <Skeleton className="size-3.75 rounded-sm" />
              <Skeleton className="h-3" style={{ width: `${w}%` }} />
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} title="Couldn’t load the checklist" />
      ) : (
        <SortableTodoList
          todos={items}
          renderItem={(todo, dragHandleProps) => (
            <ChecklistItem todo={todo} dragHandleProps={dragHandleProps} />
          )}
        />
      )}

      <div className="flex h-8.5 items-center gap-2.5 rounded-md px-1 text-faint">
        <Plus className="ml-6 size-3.5 shrink-0" aria-hidden />
        <input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder={items.length === 0 ? 'Break this task into steps' : 'Add item'}
          aria-label="Add checklist item"
          maxLength={500}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-faint"
        />
      </div>
    </div>
  )
}

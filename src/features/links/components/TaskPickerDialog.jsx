import { useState } from 'react'
import { useDebounce } from 'use-debounce'
import { textClasses } from '@/lib/tint'
import { cn } from '@/lib/utils'
import { useSpace } from '@/context/SpaceContext'
import { SpaceBadge } from '@/components/shared/SpaceBadge'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Skeleton } from '@/components/ui/skeleton'
import { useTaskSearch } from '@/features/tasks/api'
import { TASK_STATUS_MAP } from '@/features/tasks/constants'

/**
 * Pick a task to link (any active space). Title search as you type (debounced); open tasks come
 * first, then the most recently updated. `excludeIds` (already linked) are left out.
 */
export function TaskPickerDialog({ open, onOpenChange, excludeIds = [], onPick }) {
  const { activeSpaces, spaceById } = useSpace()
  const [query, setQuery] = useState('')
  const [q] = useDebounce(query, 200)
  const { data = [], isLoading } = useTaskSearch(
    { spaceIds: activeSpaces.map((s) => s.id), q },
    { enabled: open },
  )
  const tasks = data.filter((t) => !excludeIds.includes(t.id))

  return (
    <CommandDialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) setQuery('')
      }}
      title="Link a task"
      description="Search your tasks and pick one to link to this note."
    >
      <Command shouldFilter={false}>
        <CommandInput placeholder="Search tasks…" value={query} onValueChange={setQuery} />
        <CommandList>
          {isLoading ? (
            <div className="flex flex-col gap-2 p-3" aria-hidden>
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : (
            <>
              <CommandEmpty>No tasks found.</CommandEmpty>
              <CommandGroup>
                {tasks.map((task) => {
                  const s = TASK_STATUS_MAP[task.status] ?? TASK_STATUS_MAP.todo
                  return (
                    <CommandItem
                      key={task.id}
                      value={task.id}
                      onSelect={() => {
                        onPick(task)
                        onOpenChange(false)
                        setQuery('')
                      }}
                    >
                      <s.icon className={cn(textClasses(s.color))} aria-label={s.label} />
                      <span className="min-w-0 flex-1 truncate">{task.title}</span>
                      <SpaceBadge space={spaceById.get(task.space_id)} />
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}

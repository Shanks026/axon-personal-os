import { useCallback, useMemo, useState } from 'react'
import { CheckSquare, Plus } from 'lucide-react'
import { toISODate } from '@/lib/dates'
import { useSpace } from '@/context/SpaceContext'
import { usePageHeader } from '@/components/layout/PageHeaderContext'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useTodos } from '@/features/todos/api'
import { AddTodoInput } from '@/features/todos/components/AddTodoInput'
import { TodoDialog } from '@/features/todos/components/TodoDialog'
import { TodoGroup } from '@/features/todos/components/TodoGroup'
import { TodoListSkeleton } from '@/features/todos/components/TodoListSkeleton'
import { TODO_GROUPS } from '@/features/todos/constants'
import { useHighlightTodo } from '@/features/todos/hooks/useHighlightTodo'
import { useTodoFilters } from '@/features/todos/hooks/useTodoFilters'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { groupTodos } from '@/features/todos/utils'

const OPEN_GROUPS = TODO_GROUPS.filter((g) => g.key !== 'done')
const DONE_GROUP = TODO_GROUPS.find((g) => g.key === 'done')

/** Todos (design: Todos.dc.html). Task checklists mount the same components in Feature 05 Phase 2. */
export default function TodosPage() {
  const { space, isGlobal, scopeSpaceIds } = useSpace()
  const { filters, setFilter, clearHighlight } = useTodoFilters()
  const [doneCollapsed, setDoneCollapsed] = useLocalStorage('axon:todos:doneCollapsed', true)
  const [dialog, setDialog] = useState({ open: false, todo: null })

  const { data, isLoading, error, refetch } = useTodos({
    spaceIds: scopeSpaceIds,
    includeDone: true,
    checklist: filters.checklist,
  })
  const todos = useMemo(() => data ?? [], [data])
  const groups = useMemo(() => groupTodos(todos, toISODate(new Date())), [todos])
  const openCount = todos.length - groups.done.length

  const expandDone = useCallback(() => setDoneCollapsed(false), [setDoneCollapsed])
  const flashId = useHighlightTodo({
    todos,
    isLoading,
    highlightId: filters.highlight,
    expandDone,
    clearHighlight,
  })

  const openCreate = () => setDialog({ open: true, todo: null })
  const openEdit = (todo) => setDialog({ open: true, todo })

  usePageHeader({ title: 'Todos' })

  return (
    <div className="flex w-full flex-col px-4 pt-8 pb-12 md:px-9">
      <div className="mx-auto w-full max-w-170">
        <div className="flex flex-wrap items-start gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-3xl font-semibold tracking-tight">Todos</h2>
            <p className="mt-1.5 text-muted-foreground">
              Small things that don’t need a status. {openCount} open.
            </p>
          </div>
          <label className="hidden items-center gap-2 self-center text-xs text-muted-foreground sm:flex">
            <Switch
              checked={filters.checklist === 'all'}
              onCheckedChange={(v) => setFilter('checklist', v ? 'all' : 'hide')}
              size="sm"
            />
            Show task checklist items
          </label>
          <Button variant="outline" className="h-9" onClick={openCreate}>
            <Plus />
            New todo
          </Button>
        </div>

        <div className="mt-6">
          <AddTodoInput spaceId={space?.id} />
        </div>

        <div className="mt-2">
          {isLoading ? (
            <TodoListSkeleton />
          ) : error ? (
            <ErrorState
              error={error}
              onRetry={refetch}
              title="Couldn’t load todos"
              className="mt-5"
            />
          ) : todos.length === 0 ? (
            <EmptyState
              icon={CheckSquare}
              title="Nothing to do"
              description="Add a todo above. Press Enter to save."
              className="mt-5"
            />
          ) : (
            <>
              {OPEN_GROUPS.map((group) => (
                <TodoGroup
                  key={group.key}
                  group={group}
                  todos={groups[group.key]}
                  showSpace={isGlobal}
                  onEdit={openEdit}
                  flashId={flashId}
                />
              ))}
              <TodoGroup
                group={DONE_GROUP}
                todos={groups.done}
                showSpace={isGlobal}
                onEdit={openEdit}
                flashId={flashId}
                collapsed={doneCollapsed}
                onToggleCollapsed={() => setDoneCollapsed((c) => !c)}
              />
            </>
          )}
        </div>
      </div>

      <TodoDialog
        open={dialog.open}
        todo={dialog.todo}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
      />
    </div>
  )
}

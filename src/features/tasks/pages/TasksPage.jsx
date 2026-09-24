import { useMemo, useState } from 'react'
import { ListTodo, Plus, SearchX } from 'lucide-react'
import { toISODate } from '@/lib/dates'
import { useSpace } from '@/context/SpaceContext'
import { usePageHeader } from '@/components/layout/PageHeaderContext'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { HeaderAlert } from '@/components/shared/HeaderAlert'
import { Button } from '@/components/ui/button'
import { usePreferences } from '@/features/settings/api'
import { useTasks } from '@/features/tasks/api'
import { TaskBoard } from '@/features/tasks/components/TaskBoard'
import { TaskDialog } from '@/features/tasks/components/TaskDialog'
import { TasksSkeleton } from '@/features/tasks/components/TasksSkeleton'
import { TaskTabs } from '@/features/tasks/components/TaskTabs'
import { TaskToolbar } from '@/features/tasks/components/TaskToolbar'
import { TaskGrid, TaskList } from '@/features/tasks/components/TaskViews'
import { useTaskActions } from '@/features/tasks/hooks/useTaskActions'
import { useTaskFilters } from '@/features/tasks/hooks/useTaskFilters'
import { BOARD_STATUSES } from '@/features/tasks/constants'
import { boardStatuses, filterTasks, isClosed, tabCounts, weekEndISO } from '@/features/tasks/utils'

/** Tasks (design 04a–04e). Todos have their own page (Feature 05). */
export default function TasksPage() {
  const { space, isGlobal, activeSpaces, scopeSpaceIds } = useSpace()
  const { weekStartsOn } = usePreferences()
  const { filters, setFilter, clear, hasFilters } = useTaskFilters()
  const actions = useTaskActions()
  const [dialog, setDialog] = useState({ open: false, task: null, initialValues: null })

  const today = toISODate(new Date())
  const allClosed =
    filters.tab === 'completed' || filters.status.some((s) => s === 'done' || s === 'cancelled')
  const { data, isLoading, error, refetch } = useTasks({
    spaceIds: scopeSpaceIds,
    priority: filters.priority,
    due: filters.due,
    q: filters.q,
    today,
    weekEnd: weekEndISO(today, weekStartsOn),
    allClosed,
  })

  const tasks = useMemo(() => data ?? [], [data])
  const visible = useMemo(
    () => filterTasks(tasks, { tab: filters.tab, status: filters.status }),
    [tasks, filters.tab, filters.status],
  )
  const counts = useMemo(() => tabCounts(tasks), [tasks])
  const columns = useMemo(
    () => boardStatuses({ tab: filters.tab, status: filters.status }),
    [filters.tab, filters.status],
  )
  const boardTasks = useMemo(
    () => visible.filter((t) => BOARD_STATUSES.includes(t.status)),
    [visible],
  )
  const overdue = tasks.filter((t) => t.due_date && t.due_date < today && !isClosed(t)).length

  const openCreate = (initialValues = null) => setDialog({ open: true, task: null, initialValues })
  const openEdit = (task) => setDialog({ open: true, task, initialValues: null })

  const headerActions = useMemo(
    () =>
      overdue > 0 && filters.due !== 'overdue' ? (
        <HeaderAlert actionLabel="Review" onAction={() => setFilter('due', 'overdue')}>
          {overdue} overdue
        </HeaderAlert>
      ) : null,
    [overdue, filters.due, setFilter],
  )
  usePageHeader({ title: 'Tasks', actions: headerActions })

  const subtitle = isGlobal
    ? `Everything across ${activeSpaces.map((s) => s.name).join(', ')}`
    : space?.description || 'Tracked work: status, priority, dates and links.'

  return (
    <div className="flex w-full flex-col px-4 pt-8 pb-12 md:px-9">
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-3">
            <h2 className="text-3xl font-semibold tracking-tight">Tasks</h2>
            <span className="text-2xl font-light text-faint tabular-nums">{visible.length}</span>
          </div>
          <p className="mt-1.5 truncate text-muted-foreground">{subtitle}</p>
        </div>
        <Button className="h-9" onClick={() => openCreate()}>
          <Plus />
          New task
        </Button>
      </div>

      <div className="mt-6">
        <TaskTabs value={filters.tab} counts={counts} onChange={(v) => setFilter('tab', v)} />
      </div>
      <div className="mt-5">
        <TaskToolbar
          filters={filters}
          setFilter={setFilter}
          clear={clear}
          hasFilters={hasFilters}
        />
      </div>

      <div className="mt-5">
        {isLoading ? (
          <TasksSkeleton view={filters.view} />
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} title="Couldn’t load tasks" />
        ) : filters.view === 'board' && tasks.length > 0 ? (
          <TaskBoard
            tasks={boardTasks}
            statuses={columns}
            actions={actions}
            onEdit={openEdit}
            onCreate={(status) => openCreate({ status })}
            windowed={!allClosed}
            onShowAll={() => setFilter('tab', 'completed')}
          />
        ) : visible.length === 0 ? (
          tasks.length > 0 || hasFilters ? (
            <EmptyState
              icon={SearchX}
              title="Nothing matches"
              description="Try another tab or clear the filters."
              action={
                hasFilters && (
                  <Button variant="outline" onClick={clear}>
                    Clear filters
                  </Button>
                )
              }
            />
          ) : (
            <EmptyState
              icon={ListTodo}
              title="No tasks yet"
              description="Track work with a status, priority, due date and an MR link."
              action={
                <Button onClick={() => openCreate()}>
                  <Plus />
                  Create your first task
                </Button>
              }
            />
          )
        ) : filters.view === 'list' ? (
          <TaskList
            tasks={visible}
            actions={actions}
            onEdit={openEdit}
            windowed={!allClosed}
            onShowAllCompleted={() => setFilter('tab', 'completed')}
          />
        ) : (
          <TaskGrid tasks={visible} actions={actions} onEdit={openEdit} />
        )}
      </div>

      <TaskDialog
        open={dialog.open}
        task={dialog.task}
        initialValues={dialog.initialValues}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
      />
    </div>
  )
}

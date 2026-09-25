import { formatRelative } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { DueLabel } from '@/components/shared/DueLabel'
import { SpaceBadge } from '@/components/shared/SpaceBadge'
import { TagPillGroup } from '@/components/shared/TagPill'
import { TaskLinksButton } from '@/features/tasks/components/TaskLinksButton'
import { PriorityMenu, StatusMenu, TaskActionsMenu } from '@/features/tasks/components/TaskMenus'
import { TaskPriorityPill, TaskStatusPill } from '@/features/tasks/components/TaskPills'
import { TASK_PRIORITY_MAP, TASK_STATUSES } from '@/features/tasks/constants'
import { isClosed } from '@/features/tasks/utils'
import { ChecklistProgressBadge } from '@/features/todos/components/ChecklistProgressBadge'

const STATUS_ORDER = Object.fromEntries(TASK_STATUSES.map((s, i) => [s.value, i]))
const byString = (a, b) => (a < b ? -1 : a > b ? 1 : 0)

// Cells shrink to their content; only the title column takes the remaining width.
const fit = 'w-px whitespace-nowrap'

/**
 * Column definitions for `TaskTable` (TanStack Table v9). Sortable columns carry their own
 * `sortFn` (v9 doesn't bundle the built-in sort functions unless registered). `meta.className`
 * sizes both the header and the cells of a column.
 */
export function buildTaskColumns({
  isGlobal,
  spaceById,
  tagsById,
  progressByTask,
  onEdit,
  actions,
}) {
  const columns = [
    {
      id: 'title',
      header: 'Task',
      accessorFn: (t) => t.title,
      sortFn: (a, b) =>
        a.original.title.localeCompare(b.original.title, undefined, { sensitivity: 'base' }),
      meta: { className: 'w-full max-w-0' },
      cell: ({ row }) => {
        const task = row.original
        return (
          <div className="py-1">
            <button
              type="button"
              onClick={() => onEdit(task)}
              title={task.title}
              className={cn(
                'block max-w-full truncate rounded-sm text-left font-medium outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring',
                isClosed(task) && 'text-muted-foreground line-through decoration-faint',
              )}
            >
              {task.title}
            </button>
            {task.description_text && (
              // The cell is nowrap (shadcn default); the description wraps to 2 lines, then clips.
              <p className="mt-0.5 line-clamp-2 max-w-md text-xs leading-relaxed whitespace-normal text-muted-foreground">
                {task.description_text}
              </p>
            )}
          </div>
        )
      },
    },
    {
      id: 'status',
      header: 'Status',
      accessorFn: (t) => t.status,
      sortFn: (a, b) => STATUS_ORDER[a.original.status] - STATUS_ORDER[b.original.status],
      meta: { className: fit },
      cell: ({ row }) => (
        <StatusMenu
          value={row.original.status}
          onChange={(v) => actions.setField(row.original, 'status', v)}
        >
          <TaskStatusPill status={row.original.status} asButton aria-label="Change status" />
        </StatusMenu>
      ),
    },
    {
      id: 'priority',
      header: 'Priority',
      accessorFn: (t) => t.priority,
      sortDescFirst: true,
      sortFn: (a, b) =>
        TASK_PRIORITY_MAP[a.original.priority].rank - TASK_PRIORITY_MAP[b.original.priority].rank,
      meta: { className: fit },
      cell: ({ row }) => (
        <PriorityMenu
          value={row.original.priority}
          onChange={(v) => actions.setField(row.original, 'priority', v)}
        >
          <TaskPriorityPill
            priority={row.original.priority}
            showNone
            asButton
            aria-label="Change priority"
          />
        </PriorityMenu>
      ),
    },
    {
      id: 'tags',
      header: 'Tags',
      enableSorting: false,
      meta: { className: fit },
      cell: ({ row }) => (
        <TagPillGroup
          tags={row.original.tag_ids?.map((id) => tagsById.get(id)).filter(Boolean)}
          max={3}
        />
      ),
    },
    {
      id: 'checklist',
      header: 'Checklist',
      enableSorting: false,
      meta: { className: fit },
      cell: ({ row }) => <ChecklistProgressBadge progress={progressByTask?.get(row.original.id)} />,
    },
    {
      id: 'due',
      header: 'Due',
      // Undefined (no due date) always sorts last, whichever direction.
      accessorFn: (t) => t.due_date ?? undefined,
      sortUndefined: 'last',
      sortFn: (a, b) => byString(a.original.due_date, b.original.due_date),
      meta: { className: fit },
      cell: ({ row }) => (
        <DueLabel
          date={row.original.due_date}
          completedAt={row.original.completed_at}
          closed={isClosed(row.original)}
          showEmpty={false}
        />
      ),
    },
    {
      id: 'updated',
      header: 'Updated',
      accessorFn: (t) => t.updated_at,
      sortDescFirst: true,
      sortFn: (a, b) => byString(a.original.updated_at, b.original.updated_at),
      meta: { className: fit },
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {formatRelative(row.original.updated_at)}
        </span>
      ),
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Actions</span>,
      enableSorting: false,
      meta: { className: fit },
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <TaskLinksButton links={row.original.links} size="size-6" className="bg-transparent" />
          <TaskActionsMenu
            task={row.original}
            vertical={false}
            onEdit={() => onEdit(row.original)}
            onDelete={() => actions.remove(row.original)}
          />
        </div>
      ),
    },
  ]

  if (isGlobal) {
    columns.splice(1, 0, {
      id: 'space',
      header: 'Space',
      accessorFn: (t) => spaceById.get(t.space_id)?.name ?? '',
      sortFn: (a, b) =>
        byString(
          spaceById.get(a.original.space_id)?.name ?? '',
          spaceById.get(b.original.space_id)?.name ?? '',
        ),
      meta: { className: fit },
      cell: ({ row }) => <SpaceBadge space={spaceById.get(row.original.space_id)} />,
    })
  }
  return columns
}

import { useMemo } from 'react'
import { rowSortingFeature, tableFeatures, useTable } from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSpace } from '@/context/SpaceContext'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { buildTaskColumns } from '@/features/tasks/components/taskTableColumns'

// Sorting state and header toggles only: the rows arrive already sorted (manualSorting).
const features = tableFeatures({ rowSortingFeature })

/** "-due" ⇄ [{ id: 'due', desc: true }]. Single-column sort; empty means the manual order. */
const parseSort = (sort) =>
  sort ? [{ id: sort.replace(/^-/, ''), desc: sort.startsWith('-') }] : []
const formatSort = (sorting) => (sorting[0] ? `${sorting[0].desc ? '-' : ''}${sorting[0].id}` : '')

function SortableHeader({ header, table }) {
  const { column } = header
  if (!column.getCanSort()) return <table.FlexRender header={header} />
  const sorted = column.getIsSorted()
  const Icon = sorted === 'asc' ? ArrowUp : sorted === 'desc' ? ArrowDown : ChevronsUpDown
  return (
    <button
      type="button"
      onClick={column.getToggleSortingHandler()}
      className={cn(
        '-ml-1.5 inline-flex h-7 items-center gap-1 rounded-md px-1.5 outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
        sorted && 'text-foreground',
      )}
    >
      <table.FlexRender header={header} />
      <Icon className={cn('size-3.5', !sorted && 'text-faint')} aria-hidden />
    </button>
  )
}

/**
 * The Tasks page's table view (TanStack Table v9 on shadcn's Table), replacing the old grouped
 * list (the user's request, 2026-09-25). Rows arrive in the page's sort order (`sortTasks`, shared
 * with the grid); a header click, or the toolbar's Sort menu, sets `?sort=` (`due`, `-updated`). Status and priority change
 * in place; the title opens the task.
 */
export function TaskTable({
  tasks,
  actions,
  tagsById,
  progressByTask,
  onEdit,
  onOpen,
  sort,
  onSortChange,
  windowed,
  onShowAllCompleted,
}) {
  const { isGlobal, spaceById } = useSpace()
  const columns = useMemo(
    () =>
      buildTaskColumns({ isGlobal, spaceById, tagsById, progressByTask, onEdit, onOpen, actions }),
    [isGlobal, spaceById, tagsById, progressByTask, onEdit, onOpen, actions],
  )
  const sorting = useMemo(() => parseSort(sort), [sort])

  const table = useTable({
    features,
    columns,
    data: tasks,
    getRowId: (task) => task.id,
    enableMultiSort: false,
    manualSorting: true,
    state: { sorting },
    onSortingChange: (updater) =>
      onSortChange(formatSort(typeof updater === 'function' ? updater(sorting) : updater)),
  })

  const showDoneHint = windowed && tasks.some((t) => t.status === 'done')

  return (
    <div className="overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id} className="hover:bg-transparent">
              {group.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={cn(
                    'h-10 px-3 text-muted-foreground',
                    header.column.columnDef.meta?.className,
                  )}
                  aria-sort={
                    header.column.getIsSorted() === 'asc'
                      ? 'ascending'
                      : header.column.getIsSorted() === 'desc'
                        ? 'descending'
                        : undefined
                  }
                >
                  {header.isPlaceholder ? null : <SortableHeader header={header} table={table} />}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id} className="h-11">
              {row.getAllCells().map((cell) => (
                <TableCell
                  key={cell.id}
                  className={cn('px-3 py-1.5', cell.column.columnDef.meta?.className)}
                >
                  <table.FlexRender cell={cell} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {showDoneHint && (
        <p className="flex h-10 items-center gap-1.5 border-t px-3 text-xs text-muted-foreground">
          Completed tasks from the last 30 days ·
          <button
            type="button"
            onClick={onShowAllCompleted}
            className="font-medium text-foreground underline-offset-3 hover:underline"
          >
            Show all
          </button>
        </p>
      )}
    </div>
  )
}

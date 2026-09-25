import { useMemo } from 'react'
import { tableFeatures, useTable } from '@tanstack/react-table'
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
import { buildNoteColumns } from '@/features/notes/components/noteTableColumns'
import { useSpacePaths } from '@/features/spaces/hooks/useSpacePaths'

const features = tableFeatures({})

/** The Notes page's table view (decision A): Note + excerpt, Space (Global), Tags, Version, Updated, ⋮. */
export function NotesTable({ notes, tagsById, actions }) {
  const { isGlobal, spaceById } = useSpace()
  const p = useSpacePaths()
  const columns = useMemo(
    () => buildNoteColumns({ isGlobal, spaceById, tagsById, noteHref: p.note, actions }),
    [isGlobal, spaceById, tagsById, p, actions],
  )

  const table = useTable({
    features,
    columns,
    data: notes,
    getRowId: (note) => note.id,
  })

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
                >
                  {header.isPlaceholder ? null : <table.FlexRender header={header} />}
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
    </div>
  )
}

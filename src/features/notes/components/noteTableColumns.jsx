import { Link } from 'react-router'
import { formatRelative } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { SpaceBadge } from '@/components/shared/SpaceBadge'
import { TagPillGroup } from '@/components/shared/TagPill'
import { NoteActionsMenu } from '@/features/notes/components/NoteActionsMenu'

// Cells shrink to their content; only the title column takes the remaining width.
const fit = 'w-px whitespace-nowrap'

/**
 * Column definitions for `NotesTable` (TanStack Table v9, the same pattern as the Tasks table).
 * There's no sorting: notes arrive newest edit first. `meta.className` sizes a column.
 */
export function buildNoteColumns({ isGlobal, spaceById, tagsById, noteHref, actions }) {
  const columns = [
    {
      id: 'title',
      header: 'Note',
      meta: { className: 'w-full max-w-0' },
      cell: ({ row }) => {
        const note = row.original
        return (
          <div className="py-1">
            <Link
              to={noteHref(note.id)}
              title={note.title || 'Untitled'}
              className={cn(
                'block max-w-full truncate rounded-sm font-medium outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring',
                !note.title && 'text-faint',
              )}
            >
              {note.title || 'Untitled'}
            </Link>
            {note.excerpt && (
              // The cell is nowrap (shadcn default); the excerpt wraps to 2 lines, then clips.
              <p className="mt-0.5 line-clamp-2 max-w-md text-xs leading-relaxed whitespace-normal text-muted-foreground">
                {note.excerpt}
              </p>
            )}
          </div>
        )
      },
    },
    {
      id: 'tags',
      header: 'Tags',
      meta: { className: fit },
      cell: ({ row }) => (
        <TagPillGroup
          tags={row.original.tag_ids.map((id) => tagsById.get(id)).filter(Boolean)}
          max={3}
        />
      ),
    },
    {
      id: 'updated',
      header: 'Updated',
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
      meta: { className: fit },
      cell: ({ row }) => (
        <div className="flex justify-end">
          <NoteActionsMenu
            note={row.original}
            vertical={false}
            onTogglePin={() => actions.togglePin(row.original)}
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
      meta: { className: fit },
      cell: ({ row }) => <SpaceBadge space={spaceById.get(row.original.space_id)} />,
    })
  }
  return columns
}

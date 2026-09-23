import { Archive, ArchiveRestore, Ellipsis, GripVertical, Pencil, Plus, Trash2 } from 'lucide-react'
import { Link } from 'react-router'
import { formatDateShort } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { SpaceIcon } from '@/components/shared/SpaceIcon'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const CARD =
  'group relative flex min-h-44 flex-col rounded-2xl border bg-card p-5 transition duration-(--dur-fast) ease-(--ease-standard)'
const HOVER =
  'hover:-translate-y-px hover:border-border-strong hover:shadow-xs focus-within:border-border-strong'

/**
 * One space in the gallery (design 02a). The whole card links into the space; the grip and the
 * menu sit above the link. `dragHandle` receives dnd-kit's listeners and attributes.
 */
export function SpaceCard({
  space,
  to,
  onOpen,
  onEdit,
  onArchive,
  onDelete,
  dragHandle,
  dragging = false,
  archived = false,
}) {
  return (
    <div
      className={cn(
        CARD,
        !dragging && HOVER,
        archived && 'bg-muted',
        dragging && 'z-20 scale-101 rotate-1 border-border-strong shadow-md',
      )}
    >
      <Link
        to={to}
        onClick={onOpen}
        className="absolute inset-0 z-0 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Open ${space.name}`}
      />

      <div className="pointer-events-none relative flex items-start gap-2.5">
        <SpaceIcon icon={space.icon} size="lg" />
        <div className="flex-1" />
        {dragHandle && (
          <button
            type="button"
            className="pointer-events-auto mt-0.5 flex size-6.5 cursor-grab items-center justify-center rounded-md text-faint opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 active:cursor-grabbing"
            aria-label={`Reorder ${space.name}`}
            {...dragHandle}
          >
            <GripVertical className="size-4" />
          </button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="pointer-events-auto text-faint"
              aria-label={`${space.name} options`}
            >
              <Ellipsis />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onSelect={onEdit}>
              <Pencil />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onArchive}>
              {archived ? <ArchiveRestore /> : <Archive />}
              {archived ? 'Unarchive' : 'Archive'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={onDelete}>
              <Trash2 />
              Delete…
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <p className="pointer-events-none relative mt-4 text-base font-semibold tracking-tight">
        {space.name}
      </p>
      {space.description && (
        <p className="pointer-events-none relative mt-1 line-clamp-2 text-muted-foreground">
          {space.description}
        </p>
      )}
      <div className="flex-1" />
      <p className="pointer-events-none relative mt-4 font-mono text-xs text-muted-foreground">
        {archived
          ? `Archived ${formatDateShort(space.archived_at)}`
          : `Since ${formatDateShort(space.created_at)}`}
      </p>
    </div>
  )
}

/** The Global card (design 02a): first, muted, not sortable. */
export function GlobalCard({ to, onOpen, spaceCount }) {
  return (
    <div className={cn(CARD, HOVER, 'bg-muted')}>
      <Link
        to={to}
        onClick={onOpen}
        className="absolute inset-0 z-0 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Open Global"
      />
      <div className="pointer-events-none relative">
        <SpaceIcon global size="lg" />
      </div>
      <p className="pointer-events-none relative mt-4 text-base font-semibold tracking-tight">
        Global
      </p>
      <p className="pointer-events-none relative mt-1 text-muted-foreground">
        Everything from every space, in one view.
      </p>
      <div className="flex-1" />
      <p className="pointer-events-none relative mt-4 font-mono text-xs text-muted-foreground">
        {spaceCount} {spaceCount === 1 ? 'space' : 'spaces'}
      </p>
    </div>
  )
}

/** Dashed ghost card that opens the create dialog. */
export function NewSpaceCard({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-44 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border-strong text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <Plus className="size-4.5" aria-hidden />
      New space
    </button>
  )
}

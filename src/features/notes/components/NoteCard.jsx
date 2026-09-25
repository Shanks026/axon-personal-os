import { SquareCheckBig } from 'lucide-react'
import { Link } from 'react-router'
import { formatRelative } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { SpaceIcon } from '@/components/shared/SpaceIcon'
import { TagPillGroup } from '@/components/shared/TagPill'
import { VersionBadgeGroup } from '@/components/shared/VersionBadge'
import { NoteActionsMenu } from '@/features/notes/components/NoteActionsMenu'

/**
 * Grid card (design 07a, with the Tasks card decisions): a 2-line semibold title (full title
 * on hover) with its versions at the right end of the title row (like the task card), a 2-line excerpt, then, pinned to the bottom, up to 3 tags (+n) and a dashed footer
 * with "Updated 2d ago" and, on the right, how many tasks it's linked to. `showSpace` (Global) adds the space's emoji before it. The whole card
 * is a link to the editor; the ⋮ menu sits above that link.
 */
export function NoteCard({ note, to, space, showSpace, tags, onTogglePin, onDelete }) {
  const title = note.title || 'Untitled'
  return (
    <article className="group relative flex h-full min-h-37 flex-col rounded-xl border bg-card px-5 py-4.5 transition duration-(--dur-fast) ease-(--ease-standard) hover:-translate-y-px hover:border-border-strong hover:shadow-xs dark:bg-card/50">
      <Link
        to={to}
        className="absolute inset-0 z-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Open ${title}`}
        title={title}
      />

      <div className="pointer-events-none relative flex items-start gap-2">
        <h3
          className={cn(
            'line-clamp-2 min-w-0 flex-1 text-base leading-snug font-semibold tracking-tight text-pretty',
            !note.title && 'text-faint',
          )}
        >
          {title}
        </h3>
        <VersionBadgeGroup versions={note.versions} className="pointer-events-auto mt-0.5" />
        <span className="pointer-events-auto -mt-0.5 -mr-1.5 -ml-1">
          <NoteActionsMenu
            note={note}
            onTogglePin={() => onTogglePin(note)}
            onDelete={() => onDelete(note)}
          />
        </span>
      </div>
      {note.excerpt && (
        <p className="pointer-events-none relative mt-1.5 line-clamp-2 leading-relaxed text-muted-foreground">
          {note.excerpt}
        </p>
      )}
      <div className="flex-1" />
      {tags?.length > 0 && (
        <TagPillGroup tags={tags} max={3} className="pointer-events-none relative mt-3" />
      )}

      <footer className="pointer-events-none relative mt-3 flex items-center gap-2 border-t border-dashed border-border-strong pt-3.5">
        {showSpace && (
          <span className="flex" title={space?.name}>
            <SpaceIcon icon={space?.icon} size="sm" />
            <span className="sr-only">{space?.name}</span>
          </span>
        )}
        <span className="text-xs whitespace-nowrap text-muted-foreground">
          Updated {formatRelative(note.updated_at)}
        </span>
        <div className="flex-1" />
        {note.link_count > 0 && (
          <span
            className="flex items-center gap-1 text-xs text-muted-foreground tabular-nums"
            aria-label={`Linked to ${note.link_count} ${note.link_count === 1 ? 'task' : 'tasks'}`}
          >
            <SquareCheckBig className="size-3.25" aria-hidden />
            {note.link_count}
          </span>
        )}
      </footer>
    </article>
  )
}

import { formatDate, formatRelative } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { SpaceIcon } from '@/components/shared/SpaceIcon'
import { LinkedTasksSection } from '@/features/links/components/LinkedTasksSection'
import { NoteTagsRow } from '@/features/notes/components/NoteTagsRow'
import { NoteVersionBadges } from '@/features/notes/components/NoteVersionBadges'

function Row({ label, children }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex-1 text-muted-foreground">{label}</span>
      <span className="font-mono text-xs text-foreground tabular-nums">{children}</span>
    </div>
  )
}

/**
 * The editor's side panel: the note's space, Created, Updated, Words, Tags and Versions (all of a note's metadata), then its Linked tasks
 * (moved below the details at the user's request, 2026-09-26). Rendered in the 352px rail on large screens and in
 * a Sheet below `lg`.
 */
export function NoteMetaRail({ note, space, words, className }) {
  return (
    <div className={cn('flex flex-col gap-2.5', className)}>
      <div className="flex items-center gap-2">
        <span className="flex-1 text-muted-foreground">Space</span>
        <span className="flex min-w-0 items-center gap-1.5">
          <SpaceIcon icon={space?.icon} size="xs" />
          <span className="truncate">{space?.name}</span>
        </span>
      </div>
      <Row label="Created">{formatDate(note.created_at)}</Row>
      <Row label="Updated">{formatRelative(note.updated_at)}</Row>
      <Row label="Words">{words.toLocaleString()}</Row>
      <NoteTagsRow note={note} />
      <NoteVersionBadges note={note} />
      <div className="my-2 border-t" />
      <LinkedTasksSection note={note} />
    </div>
  )
}

import { useMemo, useState } from 'react'
import { FileText } from 'lucide-react'
import { useDebounce } from 'use-debounce'
import { cn } from '@/lib/utils'
import { useSpace } from '@/context/SpaceContext'
import { SpaceIcon } from '@/components/shared/SpaceIcon'
import { TagPillGroup } from '@/components/shared/TagPill'
import { VersionBadgeGroup } from '@/components/shared/VersionBadge'
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useNotes } from '@/features/notes/api'
import { useTags } from '@/features/tags/api'

/** A note result laid out like its card, without the footer: title + versions, excerpt, tags. */
function NoteOption({ note, tags, space, showSpace }) {
  return (
    <div className="flex w-full min-w-0 flex-col">
      <div className="flex items-start gap-2">
        <FileText className="mt-0.75 size-4 shrink-0 text-muted-foreground" aria-hidden />
        <p className="line-clamp-2 min-w-0 flex-1 text-base leading-snug font-semibold tracking-tight">
          {note.title || <span className="text-faint">Untitled</span>}
        </p>
        {showSpace && (
          <span className="mt-0.5 flex" title={space?.name}>
            <SpaceIcon icon={space?.icon} size="sm" />
            <span className="sr-only">{space?.name}</span>
          </span>
        )}
        <VersionBadgeGroup versions={note.versions} className="mt-0.5" />
      </div>
      {note.excerpt && (
        <p className="mt-1.5 line-clamp-2 leading-relaxed text-muted-foreground">{note.excerpt}</p>
      )}
      {tags.length > 0 && <TagPillGroup tags={tags} max={3} className="mt-3" />}
    </div>
  )
}

/**
 * "Link a note" from the task detail page: a proper dialog (the user's request, 2026-09-26) with
 * a search box and the matching notes (any active space: links cross spaces) as card-like rows,
 * so their tags and versions are visible while choosing. Arrow keys move, Enter links.
 * `spaceId` is the task's space: a note from another space shows its space emoji.
 */
export function NotePickerDialog({ open, onOpenChange, excludeIds = [], onPick, spaceId }) {
  const { activeSpaces, spaceById, isGlobal } = useSpace()
  const [query, setQuery] = useState('')
  const [q] = useDebounce(query, 200)
  const spaceIds = useMemo(() => activeSpaces.map((s) => s.id), [activeSpaces])
  const { data = [], isLoading } = useNotes({ spaceIds, q })
  const { data: allTags = [] } = useTags({ spaceIds })
  const tagsById = useMemo(() => new Map(allTags.map((t) => [t.id, t])), [allTags])
  const notes = data.filter((n) => !excludeIds.includes(n.id)).slice(0, 30)

  const close = (o) => {
    onOpenChange(o)
    if (!o) setQuery('')
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="flex max-h-dialog flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <div className="shrink-0 px-5 pt-5 pb-3">
          <DialogHeader>
            <DialogTitle>Link a note</DialogTitle>
            <DialogDescription>
              Search your notes and pick one to link to this task.
            </DialogDescription>
          </DialogHeader>
        </div>
        <Command shouldFilter={false} className="flex min-h-0 flex-1 flex-col bg-transparent">
          <div className="shrink-0 border-y px-4 pt-2 pb-3">
            <CommandInput placeholder="Search notes…" value={query} onValueChange={setQuery} />
          </div>
          <CommandList className="max-h-none min-h-0 flex-1 overflow-y-auto p-3">
            {isLoading ? (
              <div className="flex flex-col gap-3" aria-hidden>
                <Skeleton className="h-24 rounded-xl" />
                <Skeleton className="h-24 rounded-xl" />
              </div>
            ) : (
              <>
                <CommandEmpty>No notes found.</CommandEmpty>
                <div className="flex flex-col gap-2">
                  {notes.map((note) => (
                    <CommandItem
                      key={note.id}
                      value={note.id}
                      onSelect={() => {
                        onPick(note)
                        close(false)
                      }}
                      className={cn(
                        // The item's built-in check icon is its last child: not wanted on a card.
                        'items-start rounded-xl border bg-card px-5 py-4 text-left *:last:hidden',
                        'data-selected:border-border-strong data-selected:bg-card data-selected:shadow-xs',
                      )}
                    >
                      <NoteOption
                        note={note}
                        tags={note.tag_ids.map((id) => tagsById.get(id)).filter(Boolean)}
                        space={spaceById.get(note.space_id)}
                        showSpace={isGlobal || note.space_id !== spaceId}
                      />
                    </CommandItem>
                  ))}
                </div>
              </>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}

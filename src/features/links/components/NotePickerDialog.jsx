import { useState } from 'react'
import { FileText } from 'lucide-react'
import { useDebounce } from 'use-debounce'
import { useSpace } from '@/context/SpaceContext'
import { SpaceBadge } from '@/components/shared/SpaceBadge'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Skeleton } from '@/components/ui/skeleton'
import { useNotes } from '@/features/notes/api'

/**
 * Pick a note to link (any active space: links can cross spaces). Searches titles and text as
 * you type (debounced), newest edit first; `excludeIds` (already linked) are left out.
 */
export function NotePickerDialog({ open, onOpenChange, excludeIds = [], onPick }) {
  const { activeSpaces, spaceById } = useSpace()
  const [query, setQuery] = useState('')
  const [q] = useDebounce(query, 200)
  const { data = [], isLoading } = useNotes({ spaceIds: activeSpaces.map((s) => s.id), q })
  const notes = data.filter((n) => !excludeIds.includes(n.id)).slice(0, 20)

  return (
    <CommandDialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) setQuery('')
      }}
      title="Link a note"
      description="Search your notes and pick one to link to this task."
    >
      <Command shouldFilter={false}>
        <CommandInput placeholder="Search notes…" value={query} onValueChange={setQuery} />
        <CommandList>
          {isLoading ? (
            <div className="flex flex-col gap-2 p-3" aria-hidden>
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : (
            <>
              <CommandEmpty>No notes found.</CommandEmpty>
              <CommandGroup>
                {notes.map((note) => (
                  <CommandItem
                    key={note.id}
                    value={note.id}
                    onSelect={() => {
                      onPick(note)
                      onOpenChange(false)
                      setQuery('')
                    }}
                  >
                    <FileText className="text-muted-foreground" aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{note.title || 'Untitled'}</span>
                    <SpaceBadge space={spaceById.get(note.space_id)} />
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}

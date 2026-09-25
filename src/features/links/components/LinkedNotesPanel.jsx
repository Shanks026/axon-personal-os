import { useState } from 'react'
import { FileText, Link2, Loader2, Plus, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { Link, useNavigate } from 'react-router'
import { formatRelative } from '@/lib/dates'
import { paths } from '@/lib/paths'
import { useSpace } from '@/context/SpaceContext'
import { listItem } from '@/components/motion/presets'
import { ErrorState } from '@/components/shared/ErrorState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useLinkNoteTask, useNotesForTask, useUnlinkNoteTask } from '@/features/links/api'
import { NotePickerDialog } from '@/features/links/components/NotePickerDialog'
import { useCreateNote } from '@/features/notes/api'

/**
 * "Linked notes" on the task detail page (design Task Detail): excerpt cards in two columns,
 * "Link note" (search picker, any space) and "New linked note" (created in the task's space with
 * the task's title, linked, then opened). A card opens its note; ✕ unlinks.
 */
export function LinkedNotesPanel({ task }) {
  const navigate = useNavigate()
  const { spaceById } = useSpace()
  const { data: links = [], isLoading, error, refetch } = useNotesForTask(task.id)
  const link = useLinkNoteTask()
  const unlink = useUnlinkNoteTask()
  const createNote = useCreateNote()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [creating, setCreating] = useState(false)

  const newLinkedNote = async () => {
    setCreating(true)
    try {
      const note = await createNote.mutateAsync({ space_id: task.space_id, title: task.title })
      await link.mutateAsync({ noteId: note.id, taskId: task.id })
      navigate(paths.space(spaceById.get(note.space_id)?.slug).note(note.id))
    } finally {
      setCreating(false)
    }
  }

  return (
    <section aria-labelledby="linked-notes">
      <div className="mb-3 flex items-center gap-2">
        <h2 id="linked-notes" className="font-medium">
          Linked notes
        </h2>
        {links.length > 0 && (
          <span className="font-mono text-xs text-faint tabular-nums">{links.length}</span>
        )}
        <div className="flex-1" />
        <Button variant="ghost" size="sm" onClick={() => setPickerOpen(true)}>
          <Link2 />
          Link note
        </Button>
        <Button variant="ghost" size="sm" onClick={newLinkedNote} disabled={creating}>
          {creating ? <Loader2 className="animate-spin" /> : <Plus />}
          New linked note
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2" aria-hidden>
          <Skeleton className="h-22 rounded-xl" />
          <Skeleton className="h-22 rounded-xl" />
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} title="Couldn’t load linked notes" />
      ) : links.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border-strong px-4 py-3 text-muted-foreground">
          No linked notes. Link one or start a new note.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <AnimatePresence initial={false}>
            {links.map(({ note }) => {
              const space = spaceById.get(note.space_id)
              return (
                <motion.article
                  key={note.id}
                  layout
                  variants={listItem}
                  initial="initial"
                  animate="animate"
                  exit={{ opacity: 0 }}
                  className="group relative flex min-h-22 flex-col rounded-xl border bg-card px-4 py-3 transition-colors hover:border-border-strong"
                >
                  <Link
                    to={paths.space(space?.slug).note(note.id)}
                    className="absolute inset-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`Open note ${note.title || 'Untitled'}`}
                  />
                  <div className="pointer-events-none relative flex items-center gap-2">
                    <FileText className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {note.title || 'Untitled'}
                    </span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => unlink.mutate({ noteId: note.id, taskId: task.id })}
                          aria-label={`Unlink ${note.title || 'Untitled'}`}
                          className="pointer-events-auto -my-1 text-faint opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                        >
                          <X />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Unlink</TooltipContent>
                    </Tooltip>
                  </div>
                  {note.excerpt && (
                    <p className="pointer-events-none relative mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {note.excerpt}
                    </p>
                  )}
                  <span className="pointer-events-none relative mt-auto pt-2 text-xs text-faint">
                    Updated {formatRelative(note.updated_at)}
                  </span>
                </motion.article>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      <NotePickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        excludeIds={links.map((l) => l.note.id)}
        onPick={(note) => link.mutate({ noteId: note.id, taskId: task.id })}
      />
    </section>
  )
}

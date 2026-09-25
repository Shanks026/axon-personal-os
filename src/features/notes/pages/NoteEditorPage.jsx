import { Archive, FileQuestion } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router'
import { paths } from '@/lib/paths'
import { useSpace } from '@/context/SpaceContext'
import { usePageHeader } from '@/components/layout/PageHeaderContext'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useNote } from '@/features/notes/api'
import { NoteEditor } from '@/features/notes/components/NoteEditor'
import { useSpacePaths } from '@/features/spaces/hooks/useSpacePaths'

/** Header + body for every state other than the loaded editor (which sets its own header). */
function NoteStatus({ children }) {
  const p = useSpacePaths()
  usePageHeader({ title: 'Note', parent: { label: 'Notes', to: p.notes() } })
  return <div className="mx-auto w-full max-w-170 px-4 pt-12 pb-24">{children}</div>
}

/** /s/:slug/notes/:noteId (design 07b). */
export default function NoteEditorPage() {
  const { noteId } = useParams()
  const { isGlobal, space, activeSpaces } = useSpace()
  const p = useSpacePaths()
  const { data: note, isLoading, error, refetch } = useNote(noteId)
  const noteSpace = note ? activeSpaces.find((s) => s.id === note.space_id) : null

  if (isLoading) {
    return (
      <NoteStatus>
        <div aria-hidden>
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="mt-4 h-6 w-40" />
          <Skeleton className="mt-8 h-4 w-full" />
          <Skeleton className="mt-3 h-4 w-5/6" />
          <Skeleton className="mt-3 h-4 w-3/4" />
        </div>
      </NoteStatus>
    )
  }
  if (error) {
    return (
      <NoteStatus>
        <ErrorState error={error} onRetry={refetch} title="Couldn’t load this note" />
      </NoteStatus>
    )
  }
  if (!note || note.deleted_at) {
    return (
      <NoteStatus>
        <EmptyState
          icon={FileQuestion}
          title="This note doesn’t exist or is in Trash"
          description="It may have been deleted, or the link is wrong."
          action={
            <Button variant="outline" asChild>
              <Link to={p.notes()}>Back to Notes</Link>
            </Button>
          }
        />
      </NoteStatus>
    )
  }
  if (!noteSpace) {
    return (
      <NoteStatus>
        <EmptyState
          icon={Archive}
          title="This note is in an archived space"
          description="Restore the space to open its notes again."
          action={
            <Button variant="outline" asChild>
              <Link to={paths.spaces()}>Go to spaces</Link>
            </Button>
          }
        />
      </NoteStatus>
    )
  }
  // Canonical URL: a note opened under another space moves to its own (Global shows any note).
  if (!isGlobal && note.space_id !== space?.id) {
    return <Navigate to={paths.space(noteSpace.slug).note(note.id)} replace />
  }

  return <NoteEditor key={note.id} note={note} />
}

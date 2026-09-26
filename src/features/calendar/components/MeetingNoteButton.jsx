import { FilePlus, NotebookPen } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { useCreateMeetingNote } from '@/features/calendar/api'
import { useNote } from '@/features/notes/api'
import { usePreferences } from '@/features/settings/api'
import { useSpacePaths } from '@/features/spaces/hooks/useSpacePaths'

/**
 * The event dialog's meeting-note action (design: Overlays → event footer). With a live note it
 * links to it ("Open meeting note"); with none, or when the note is in Trash or gone, it creates
 * one from the template and opens it. Leaving the calendar keeps `?event=` in history, so Back
 * reopens the event.
 */
export function MeetingNoteButton({ event }) {
  const p = useSpacePaths()
  const navigate = useNavigate()
  const { timezone } = usePreferences()
  const create = useCreateMeetingNote()
  const { data: note, isLoading } = useNote(event.note_id)
  const live = !!note && !note.deleted_at

  if (event.note_id && isLoading) {
    return (
      <Button type="button" variant="outline" disabled>
        <NotebookPen />
        Meeting note
      </Button>
    )
  }
  if (live) {
    return (
      <Button type="button" variant="outline" asChild>
        <Link to={p.note(note.id)}>
          <NotebookPen />
          Open meeting note
        </Link>
      </Button>
    )
  }
  return (
    <Button
      type="button"
      variant="outline"
      disabled={create.isPending}
      onClick={() =>
        create.mutate(
          { event, timeZone: timezone },
          { onSuccess: (created) => navigate(p.note(created.id)) },
        )
      }
    >
      <FilePlus />
      {create.isPending ? 'Creating…' : 'Create meeting note'}
    </Button>
  )
}

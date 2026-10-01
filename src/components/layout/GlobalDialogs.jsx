import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router'
import { useGlobalDialog } from '@/hooks/useGlobalDialog'
import { EventDialog } from '@/features/calendar/components/EventDialog'
import { QuickCaptureDialog } from '@/features/inbox/components/QuickCaptureDialog'
import { useCreateAndOpenNote } from '@/features/notes/hooks/useCreateAndOpenNote'
import { TaskDialog } from '@/features/tasks/components/TaskDialog'
import { TodoDialog } from '@/features/todos/components/TodoDialog'

/**
 * The create dialogs any page can open through `?new=<kind>` (the palette, later shortcuts),
 * mounted once in the app shell. Spaces are never picked (the dialogs use the default space):
 * `task` → `TaskDialog` (`&title=` prefills it), `todo` → `TodoDialog`, `event` → `EventDialog`,
 * `note` → a new note in the default space, opened in the editor; `capture` → quick capture
 * (Feature 13). An unknown kind is dropped.
 */
export function GlobalDialogs() {
  const { kind, raw, title, close } = useGlobalDialog()
  const [, setParams] = useSearchParams()
  const { createAndOpen, canCreate } = useCreateAndOpenNote()
  const creatingNote = useRef(false)

  // ?new=note creates straight away and opens the editor (there's no note dialog).
  useEffect(() => {
    if (kind !== 'note' || creatingNote.current) return
    creatingNote.current = true
    close()
    if (canCreate) createAndOpen({ title })
    queueMicrotask(() => {
      creatingNote.current = false
    })
  }, [kind, title, close, canCreate, createAndOpen])

  // A `new` value that isn't a known kind is removed rather than left in the URL.
  useEffect(() => {
    if (raw && !kind) {
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev)
          p.delete('new')
          return p
        },
        { replace: true },
      )
    }
  }, [raw, kind, setParams])

  const onOpenChange = (next) => {
    if (!next) close()
  }

  return (
    <>
      <TaskDialog
        open={kind === 'task'}
        onOpenChange={onOpenChange}
        initialValues={title ? { title } : undefined}
      />
      <TodoDialog
        open={kind === 'todo'}
        onOpenChange={onOpenChange}
        initialValues={title ? { title } : undefined}
      />
      <EventDialog
        open={kind === 'event'}
        onOpenChange={onOpenChange}
        initialValues={title ? { title } : undefined}
      />
      <QuickCaptureDialog open={kind === 'capture'} onOpenChange={onOpenChange} />
    </>
  )
}

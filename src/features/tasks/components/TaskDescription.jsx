import { useCallback, useEffect } from 'react'
import { isDocEmpty } from '@/lib/richText'
import { useAutosave } from '@/hooks/useAutosave'
import { RichTextEditor } from '@/components/editor/RichTextEditor'
import { useImageHandlers } from '@/features/attachments/api'
import { useUpdateTask } from '@/features/tasks/api'
import { textToDoc } from '@/features/tasks/utils'

const DESCRIPTION_TEXT_MAX = 20_000

/**
 * The detail page's description: the full rich editor (slash menu, images, Ctrl+S) that
 * autosaves after 800ms through `useAutosave`. Old plain-text descriptions open as paragraphs.
 * `onStatusChange(status, flush)` reports the save state up for the header indicator.
 */
export function TaskDescription({ task, onStatusChange }) {
  const update = useUpdateTask()
  const images = useImageHandlers({ spaceId: task.space_id })
  const { schedule, flush, status } = useAutosave({
    save: (patch) => update.mutateAsync({ id: task.id, patch }),
  })

  useEffect(() => {
    onStatusChange?.(status, flush)
  }, [status, flush, onStatusChange])

  const change = useCallback(
    (json, text) =>
      schedule({
        description: isDocEmpty(json) ? null : json,
        description_text: text.slice(0, DESCRIPTION_TEXT_MAX),
      }),
    [schedule],
  )

  return (
    <RichTextEditor
      value={task.description ?? textToDoc(task.description_text)}
      onChange={change}
      placeholder="Add a description… Type '/' for commands"
      features={{ slash: true, onSave: flush, images }}
      label="Description"
      // As tall as its content, in UI-size text (the user's request, 2026-09-25).
      fit
      className="text-sm leading-6"
    />
  )
}

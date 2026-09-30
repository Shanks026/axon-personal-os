import { useCallback, useEffect, useMemo } from 'react'
import { isDocEmpty } from '@/lib/richText'
import { useAutosave } from '@/hooks/useAutosave'
import { RichTextEditor } from '@/components/editor/RichTextEditor'
import { useImageHandlers, useUploadAttachments } from '@/features/attachments/api'
import { hasJiraImages } from '@/features/jira/utils'
import { useUpdateTask } from '@/features/tasks/api'
import { textToDoc } from '@/features/tasks/utils'

const DESCRIPTION_TEXT_MAX = 20_000

/**
 * The detail page's description: the full rich editor (slash menu, images, Ctrl+S; other files
 * dropped in go to the task's attachments) that
 * autosaves after 800ms through `useAutosave`. Old plain-text descriptions open as paragraphs.
 * `onStatusChange(status, flush)` reports the save state up for the header indicator.
 */
export function TaskDescription({ task, onStatusChange }) {
  const update = useUpdateTask()
  const images = useImageHandlers({ spaceId: task.space_id })
  // Documents dropped or pasted into the description go to the task's attachments.
  const { mutate: uploadFiles } = useUploadAttachments()
  const files = useMemo(
    () => ({
      onFiles: (list) =>
        uploadFiles({ task: { id: task.id, space_id: task.space_id }, files: list }),
    }),
    [task.id, task.space_id, uploadFiles],
  )
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

  // The editor reads its value once. A Jira import's images are swapped in after the copy
  // (Feature 17 Phase 4), so remount it when the saved description stops having placeholders.
  const jiraPending = hasJiraImages(task.description)

  return (
    <RichTextEditor
      key={jiraPending ? 'jira-pending' : 'ready'}
      value={task.description ?? textToDoc(task.description_text)}
      onChange={change}
      placeholder="Add a description… Type '/' for commands"
      features={{ slash: true, onSave: flush, images, files }}
      label="Description"
      // As tall as its content, in UI-size text (the user's request, 2026-09-25).
      fit
      className="text-sm leading-6"
    />
  )
}

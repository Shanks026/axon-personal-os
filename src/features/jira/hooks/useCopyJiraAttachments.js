import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { attachmentKeys } from '@/features/attachments/api'
import { copyJiraAttachment } from '@/features/jira/api'
import { replaceJiraImages } from '@/features/jira/utils'
import { fetchTask, taskKeys, updateTask } from '@/features/tasks/api'

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

/**
 * Returns `copyAll({ task, attachments, issueUrl, rewriteDescription })` (Feature 17 Phase 4): copies
 * each Jira attachment onto the saved task, one request per file, with one toast that counts
 * through them ("Copying 2 of 5…") and ends with the result (Retry copies only the failures).
 * It's a plain async loop on the query client, so closing the dialog doesn't stop it.
 * With `rewriteDescription`, the task's `jira:{id}` images are then swapped for the copies
 * (`replaceJiraImages`). Images left in Jira become links; failed copies stay placeholders until
 * a Retry finishes them.
 */
export function useCopyJiraAttachments() {
  const qc = useQueryClient()

  const copyAll = useCallback(
    async function run({ task, attachments, issueUrl, rewriteDescription = false }) {
      const list = attachments ?? []
      if (!list.length) return
      const toastId = toast.loading(`Copying ${plural(list.length, 'attachment')} from Jira…`)
      const copied = new Map() // Jira attachment id → attachments row
      const failed = []
      let kept = 0
      for (const [i, file] of list.entries()) {
        if (list.length > 1) {
          toast.loading(`Copying ${i + 1} of ${list.length} attachments from Jira…`, {
            id: toastId,
          })
        }
        try {
          const res = await copyJiraAttachment({
            key: task.jira_key,
            attachmentId: file.id,
            taskId: task.id,
          })
          copied.set(file.id, res.attachment)
          if (res.skipped) kept += 1
        } catch (err) {
          failed.push({ file, message: err.message })
        }
      }
      qc.invalidateQueries({ queryKey: attachmentKeys.task(task.id) })
      qc.invalidateQueries({ queryKey: attachmentKeys.usage() })
      qc.invalidateQueries({ queryKey: taskKeys.lists() })

      if (rewriteDescription) {
        try {
          const fresh = await fetchTask(task.id)
          const keep = new Set(failed.map((f) => f.file.id))
          const { doc, changed } = replaceJiraImages(fresh?.description, copied, issueUrl, keep)
          if (changed) {
            await updateTask(task.id, { description: doc })
            qc.invalidateQueries({ queryKey: taskKeys.detail(task.id) })
          }
        } catch (err) {
          failed.push({ file: { filename: 'the description images' }, message: err.message })
        }
      }

      const done = copied.size - kept
      const summary = [
        done && `Copied ${plural(done, 'attachment')} from Jira`,
        kept && `${kept} left in Jira (video or over 50 MB)`,
      ]
        .filter(Boolean)
        .join(' · ')
      if (!failed.length) {
        toast.success(summary || 'Nothing to copy from Jira', { id: toastId })
        return
      }
      const retry = failed.map((f) => f.file).filter((f) => f.id)
      toast.error(
        `Couldn’t copy ${plural(failed.length, 'file')} from Jira${summary ? ` (${summary})` : ''}`,
        {
          id: toastId,
          description: failed.map((f) => `${f.file.filename}: ${f.message}`).join('\n'),
          action: retry.length
            ? {
                label: 'Retry',
                onClick: () => run({ task, attachments: retry, issueUrl, rewriteDescription }),
              }
            : undefined,
        },
      )
    },
    [qc],
  )

  return copyAll
}

import { useCallback, useMemo, useState } from 'react'
import { useUploadAttachments } from '@/features/attachments/api'
import { useAcceptFiles } from '@/features/attachments/hooks/useAcceptFiles'
import { useCopyJiraAttachments } from '@/features/jira/hooks/useCopyJiraAttachments'
import { jiraIssueUrl } from '@/features/jira/utils'
import { usePreferences } from '@/features/settings/api'

/**
 * The task dialog's files (Feature 15 Phase 2, Feature 17 Phase 4).
 * - `stagedFiles` / `setStagedFiles`: a new task's files, held until it's saved.
 * - `files`: the description editor's `features.files`. Documents dropped or pasted into it are
 *   uploaded straight away in edit mode, or staged in create mode.
 * - `afterCreate(row)`: uploads the staged files onto the saved task, and copies a Jira import's
 *   attachments (`jiraAttachments`) and swaps its description images for the copies.
 */
export function useTaskDialogFiles({ task, jiraAttachments }) {
  const { jiraSettings } = usePreferences()
  const [stagedFiles, setStagedFiles] = useState([])
  const { mutate: uploadFiles } = useUploadAttachments()
  const acceptFiles = useAcceptFiles()
  const copyJiraAttachments = useCopyJiraAttachments()

  const files = useMemo(
    () => ({
      onFiles: (list) =>
        task
          ? uploadFiles({ task, files: list })
          : setStagedFiles((prev) => [...prev, ...acceptFiles(list)]),
    }),
    [task, uploadFiles, acceptFiles],
  )

  const afterCreate = useCallback(
    (row) => {
      if (stagedFiles.length) uploadFiles({ task: row, files: stagedFiles })
      if (row.jira_key && jiraAttachments?.length) {
        copyJiraAttachments({
          task: row,
          attachments: jiraAttachments,
          issueUrl: jiraIssueUrl(jiraSettings.site, row.jira_key),
          rewriteDescription: true,
        })
      }
    },
    [stagedFiles, uploadFiles, jiraAttachments, copyJiraAttachments, jiraSettings.site],
  )

  return { stagedFiles, setStagedFiles, files, afterCreate }
}

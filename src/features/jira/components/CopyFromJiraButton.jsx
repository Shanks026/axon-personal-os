import { useState } from 'react'
import { Loader2, Ticket } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useTaskAttachments } from '@/features/attachments/api'
import { fetchJiraIssue } from '@/features/jira/api'
import { useCopyJiraAttachments } from '@/features/jira/hooks/useCopyJiraAttachments'
import { jiraIssueUrl } from '@/features/jira/utils'
import { usePreferences } from '@/features/settings/api'

/**
 * "Copy from Jira" in a Jira task's Attachments header (Feature 17 Phase 4): fetches the issue and
 * copies the attachments the task doesn't have yet. It doesn't touch the description, which may
 * have been edited since the import. Nothing for a task without a Jira key.
 */
export function CopyFromJiraButton({ task }) {
  const { jiraSettings } = usePreferences()
  const { data: rows = [] } = useTaskAttachments(task.id)
  const copyAll = useCopyJiraAttachments()
  const [busy, setBusy] = useState(false)
  if (!task.jira_key) return null

  const run = async () => {
    setBusy(true)
    try {
      const { issue } = await fetchJiraIssue(task.jira_key)
      const have = new Set(rows.map((r) => r.jira_attachment_id).filter(Boolean))
      const missing = (issue.attachments ?? []).filter((a) => !have.has(a.id))
      if (!missing.length) {
        toast.success(
          issue.attachments?.length
            ? 'Every attachment is already copied'
            : `${task.jira_key} has no attachments`,
        )
        return
      }
      await copyAll({
        task,
        attachments: missing,
        issueUrl: jiraIssueUrl(jiraSettings.site, task.jira_key),
      })
    } catch (err) {
      toast.error(err.message ?? 'Couldn’t read the Jira issue')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={run}
          disabled={busy}
        >
          {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Ticket />}
          Copy from Jira
        </Button>
      </TooltipTrigger>
      <TooltipContent>Copy {task.jira_key}’s attachments that aren’t here yet</TooltipContent>
    </Tooltip>
  )
}

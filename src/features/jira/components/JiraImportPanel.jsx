import { useState } from 'react'
import { ArrowUpRight, CircleAlert, Loader2, Ticket, X } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router'
import { paths } from '@/lib/paths'
import { useSpace } from '@/context/SpaceContext'
import { htmlToDoc } from '@/components/editor/html'
import { Button } from '@/components/ui/button'
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { usePreferences } from '@/features/settings/api'
import { useTags } from '@/features/tags/api'
import { fetchTaskByJiraKey, taskKeys } from '@/features/tasks/api'
import { useFetchJiraIssue, useJiraStatus } from '@/features/jira/api'
import { JIRA_SITE_PLACEHOLDER } from '@/features/jira/constants'
import { issueToTaskValues, parseJiraRef } from '@/features/jira/utils'

/**
 * The task dialog's "From Jira" view (Feature 17 Phase 2): paste a Jira link or key, and the
 * issue comes back as the normal form, prefilled (`onImported(values, issue)`). An issue that's
 * already a task offers "Open it" instead. Pasting fetches straight away; Enter or Import too.
 */
export function JiraImportPanel({ spaceId, headerExtra, onClose, onImported }) {
  const qc = useQueryClient()
  const { spaceById } = useSpace()
  const { jiraSettings } = usePreferences()
  const status = useJiraStatus({ site: jiraSettings.site })
  const fetchIssue = useFetchJiraIssue()
  const { data: tags = [] } = useTags({ spaceIds: spaceId ? [spaceId] : [] })
  const [input, setInput] = useState('')
  const [error, setError] = useState(null)
  const [existing, setExisting] = useState(null) // { key, task }
  const [checking, setChecking] = useState(false)

  const configured = status.data?.configured
  const pending = checking || fetchIssue.isPending

  const importRef = async (value) => {
    setError(null)
    setExisting(null)
    const key = parseJiraRef(value)
    if (!key) {
      setError('That doesn’t look like a Jira link or issue key (e.g. MP-43512).')
      return
    }
    setChecking(true)
    try {
      const task = await qc.fetchQuery({
        queryKey: taskKeys.byJiraKey(key),
        queryFn: () => fetchTaskByJiraKey(key),
        staleTime: 0,
      })
      if (task) {
        setExisting({ key, task })
        return
      }
    } catch (err) {
      setError(err.message ?? 'Couldn’t check for an existing task.')
      return
    } finally {
      setChecking(false)
    }
    fetchIssue.mutate(key, {
      onSuccess: ({ issue }) =>
        onImported(issueToTaskValues(issue, { tags, htmlToDoc, jiraSettings }), issue),
      onError: (err) => setError(err.message),
    })
  }

  const existingSpace = existing && spaceById.get(existing.task.space_id)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-start gap-3 px-5 pt-5 pb-1">
        <div className="min-w-0 flex-1">
          <DialogHeader>
            <DialogTitle>New task</DialogTitle>
            <DialogDescription>
              Paste a Jira link and review the imported task before saving.
            </DialogDescription>
          </DialogHeader>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X />
        </Button>
      </div>
      {headerExtra && <div className="shrink-0 px-5 pt-3">{headerExtra}</div>}

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-4 pb-5">
        {status.isLoading ? null : !configured ? (
          <div className="rounded-xl border border-dashed border-border-strong p-4">
            <p className="flex items-center gap-2 font-medium">
              <Ticket className="size-4 text-muted-foreground" aria-hidden />
              Jira isn’t connected yet
            </p>
            <p className="mt-1.5 text-muted-foreground">
              {status.data?.hasCredentials
                ? 'Set your Jira site in Settings → AI & integrations.'
                : 'Add JIRA_EMAIL and JIRA_API_TOKEN in Supabase → Edge Functions → Secrets, then set your Jira site in Settings.'}
            </p>
            <Link
              to={paths.settings('ai')}
              className="mt-3 inline-block text-sm underline-offset-3 hover:underline"
            >
              Open settings
            </Link>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (!pending && input.trim()) importRef(input)
            }}
            className="flex flex-col gap-2"
          >
            <label htmlFor="jira-ref" className="font-medium">
              Jira link or key
            </label>
            <div className="flex gap-2">
              <Input
                id="jira-ref"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onPaste={(e) => {
                  const pasted = e.clipboardData.getData('text')
                  if (parseJiraRef(pasted)) {
                    e.preventDefault()
                    setInput(pasted.trim())
                    importRef(pasted)
                  }
                }}
                placeholder={`${jiraSettings.site || JIRA_SITE_PLACEHOLDER}/browse/MP-43512`}
                autoFocus
                readOnly={pending}
                aria-invalid={!!error || undefined}
                className="font-mono text-sm"
              />
              <Button type="submit" disabled={pending || !input.trim()}>
                {pending && <Loader2 className="animate-spin" />}
                Import
              </Button>
            </div>
            {error && (
              <p role="alert" className="flex items-start gap-1.5 text-xs text-destructive">
                <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
                {error}
              </p>
            )}
            {existing && (
              <div className="mt-1 flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5">
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-mono text-xs text-muted-foreground">{existing.key}</span> is
                  already a task: {existing.task.title}
                </span>
                {existingSpace && (
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      to={paths.space(existingSpace.slug).task(existing.task.id)}
                      onClick={onClose}
                    >
                      Open it
                      <ArrowUpRight />
                    </Link>
                  </Button>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Imports the title, description, status, priority, labels as tags, fix version and
              dates. Nothing is sent to an AI.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}

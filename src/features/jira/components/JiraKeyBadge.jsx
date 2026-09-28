import { Ticket } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePreferences } from '@/features/settings/api'
import { jiraIssueUrl } from '@/features/jira/utils'

/**
 * A Jira-imported task's key (mono, `Ticket` icon), linking to the issue on the saved Jira site
 * (plain text without one). `pointer-events-auto` so it works inside cards whose footer ignores
 * the pointer.
 */
export function JiraKeyBadge({ jiraKey, className }) {
  const { jiraSettings } = usePreferences()
  if (!jiraKey) return null
  const url = jiraIssueUrl(jiraSettings.site, jiraKey)
  const classes = cn(
    'pointer-events-auto inline-flex h-5 shrink-0 items-center gap-1 rounded-sm px-1 font-mono text-xs text-muted-foreground',
    url &&
      'outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
    className,
  )
  const body = (
    <>
      <Ticket className="size-3" aria-hidden />
      {jiraKey}
    </>
  )
  return url ? (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      title="Open in Jira"
      className={classes}
      onClick={(e) => e.stopPropagation()}
    >
      {body}
    </a>
  ) : (
    <span className={classes}>{body}</span>
  )
}

import { useState } from 'react'
import { ArrowUpRight, GitPullRequestArrow, Link2, Plus, Ticket, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCreateTaskLink, useDeleteTaskLink } from '@/features/tasks/api'
import { taskLinkUrlSchema } from '@/features/tasks/schemas'
import { linkInfo } from '@/features/tasks/utils'

const ICONS = { gitlab: GitPullRequestArrow, jira: Ticket, link: Link2 }

/**
 * The rail's links (design 04 "ExternalLinkCard", generalised to many links): each a bordered
 * card reading "!1431 · thmp/buyer-web" for a GitLab MR, the issue key for Jira, or the host,
 * opening in a new tab, removable on hover. An inline field adds another (saved at once).
 */
export function TaskLinkCards({ task }) {
  const create = useCreateTaskLink(task.id)
  const remove = useDeleteTaskLink(task.id)
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')

  const add = () => {
    const parsed = taskLinkUrlSchema.safeParse(url)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Enter a full link')
      return
    }
    create.mutate({ task_id: task.id, url: parsed.data }, { onSuccess: () => setUrl('') })
  }

  return (
    <div className="flex flex-col gap-1.5">
      {task.links?.map((link) => {
        const info = linkInfo(link.url, link.label)
        const Icon = ICONS[info.kind]
        return (
          <div
            key={link.id}
            className="group/link flex h-9 items-center gap-2 rounded-lg border bg-card px-2.5 transition-colors hover:border-border-strong"
          >
            <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              title={link.url}
              className="min-w-0 flex-1 truncate rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {info.text}
            </a>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => remove.mutate(link.id)}
              aria-label={`Remove link ${info.text}`}
              className="text-faint opacity-0 group-hover/link:opacity-100 focus-visible:opacity-100"
            >
              <X />
            </Button>
            <ArrowUpRight className="size-3.5 shrink-0 text-faint" aria-hidden />
          </div>
        )
      })}
      <div className="flex h-8 items-center gap-2 px-1">
        <Link2 className="size-3.5 shrink-0 text-faint" aria-hidden />
        <input
          value={url}
          onChange={(e) => {
            setUrl(e.target.value)
            setError('')
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          placeholder={task.links?.length ? 'Add another link' : 'Add a link'}
          aria-label="Add a link"
          aria-invalid={!!error}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-faint"
        />
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={add}
          disabled={!url.trim() || create.isPending}
          aria-label="Add link"
        >
          <Plus />
        </Button>
      </div>
      {error && <p className="px-1 text-xs text-destructive">{error}</p>}
    </div>
  )
}

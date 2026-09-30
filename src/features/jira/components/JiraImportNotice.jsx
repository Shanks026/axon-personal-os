import { ArrowUpRight, Paperclip, Ticket } from 'lucide-react'
import { SuggestTagsButton } from '@/features/ai/components/SuggestTagsButton'
import { attachmentNotice } from '@/features/jira/utils'

/**
 * Above the form after a Jira import: the key (a link to the issue), type and status, and
 * "Suggest tags" (AI, on click) when `formApi` is given. When the issue has attachments, a second
 * line says how many will be copied after saving (Feature 17 Phase 4).
 */
export function JiraImportNotice({ issue, formApi }) {
  const files = attachmentNotice(issue.attachments)
  return (
    <div className="flex flex-col gap-1">
      <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
        <Ticket className="size-3.5" aria-hidden />
        Imported from
        <a
          href={issue.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-0.5 font-mono text-foreground underline-offset-3 hover:underline"
        >
          {issue.key}
          <ArrowUpRight className="size-3" aria-hidden />
        </a>
        {[issue.issueType, issue.status?.name].filter(Boolean).map((part) => (
          <span key={part}>· {part}</span>
        ))}
        <span>· review before saving</span>
        {formApi && <SuggestTagsButton formApi={formApi} />}
      </p>
      {files && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Paperclip className="size-3.5" aria-hidden />
          {files}
        </p>
      )}
    </div>
  )
}

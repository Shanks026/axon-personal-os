import { ListChecks, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DueLabel } from '@/components/shared/DueLabel'
import { TagPill } from '@/components/shared/TagPill'
import { VersionBadge } from '@/components/shared/VersionBadge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { PriorityMenu, StatusMenu } from '@/features/tasks/components/TaskMenus'
import { TaskPriorityPill, TaskStatusPill } from '@/features/tasks/components/TaskPills'

/**
 * One AI draft in the "several tasks" review list: include/exclude, an editable title, status and
 * priority pills (menus), due label, tags (a tag the space doesn't have yet is dashed with "new"),
 * version and checklist count. `value` is task dialog values (`draftToTaskValues`).
 * @param {{ value: object, tags: object[], included: boolean, onIncludedChange: (v: boolean) => void, onChange: (patch: object) => void, onRemove: () => void }} props
 */
export function AiDraftCard({ value, tags, included, onIncludedChange, onChange, onRemove }) {
  const known = tags.filter((t) => value.tag_ids.includes(t.id))
  const titleInvalid = !value.title.trim()

  return (
    <div
      className={cn(
        'group flex gap-3 rounded-xl border bg-card px-3.5 py-3 transition-opacity',
        !included && 'opacity-55',
      )}
    >
      <Checkbox
        checked={included}
        onCheckedChange={(v) => onIncludedChange(v === true)}
        aria-label={`Include “${value.title || 'Untitled'}”`}
        className="mt-1"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <input
            value={value.title}
            onChange={(e) => onChange({ title: e.target.value.slice(0, 300) })}
            aria-label="Task title"
            aria-invalid={titleInvalid}
            placeholder="Task title"
            className="min-w-0 flex-1 bg-transparent font-medium outline-none placeholder:text-faint aria-invalid:placeholder:text-destructive"
          />
          {value.versions[0] && <VersionBadge version={value.versions[0]} />}
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={onRemove}
            aria-label="Remove draft"
            className="-mt-0.5 text-faint opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
          >
            <X />
          </Button>
        </div>
        {value.description_text && (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
            {value.description_text}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <StatusMenu value={value.status} onChange={(status) => onChange({ status })}>
            <TaskStatusPill status={value.status} asButton />
          </StatusMenu>
          <PriorityMenu value={value.priority} onChange={(priority) => onChange({ priority })}>
            <TaskPriorityPill priority={value.priority} showNone asButton />
          </PriorityMenu>
          {value.due_date && <DueLabel date={value.due_date} className="mx-1" />}
          {known.map((tag) => (
            <TagPill key={tag.id} tag={tag} />
          ))}
          {value.newTags.map((name) => (
            <span
              key={name}
              title="Created when you save"
              className="inline-flex h-5 items-center gap-1 rounded-sm border border-dashed border-border-strong px-1.75 text-xs text-muted-foreground"
            >
              {name}
              <span className="text-faint">new</span>
            </span>
          ))}
          {value.checklist.length > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <ListChecks className="size-3.5" aria-hidden />
              Checklist · {value.checklist.length}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

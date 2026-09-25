import { useState } from 'react'
import { Link2, Plus, Tag, X } from 'lucide-react'
import { Controller } from 'react-hook-form'
import { useHoverOpen } from '@/hooks/useHoverOpen'
import { formatDateShort } from '@/lib/dates'
import { DatePicker } from '@/components/shared/DatePicker'
import { PropertyChip } from '@/components/shared/PropertyChip'
import { TagPill } from '@/components/shared/TagPill'
import { TagPicker } from '@/components/shared/TagPicker'
import { Button } from '@/components/ui/button'
import { taskLinkUrlSchema } from '@/features/tasks/schemas'
import { linkHost } from '@/features/tasks/utils'

// The property chips and inline fields of TaskDialog (design 04f), split out so the dialog's
// form logic stays near components.md's ~200-line guideline. The date and tag chips open on
// hover as well as on click (the user's request, 2026-09-25); keyboard and touch users click.

export function DateChip({ form, name, label, icon, weekStartsOn }) {
  const { open, setOpen, hoverProps } = useHoverOpen()
  return (
    <Controller
      name={name}
      control={form.control}
      render={({ field }) => (
        <DatePicker
          value={field.value}
          onChange={field.onChange}
          weekStartsOn={weekStartsOn}
          open={open}
          onOpenChange={setOpen}
          contentProps={hoverProps}
        >
          <PropertyChip icon={icon} empty={!field.value} {...hoverProps}>
            {field.value ? `${label} ${formatDateShort(field.value)}` : label}
          </PropertyChip>
        </DatePicker>
      )}
    />
  )
}

/**
 * Tags property chip. It always reads "Tags" (with a count once some are picked); the selected
 * tags themselves are listed under the description (`TagList`), since a task can have several.
 */
export function TagsChip({ spaceId, value, onChange }) {
  const { open, setOpen, hoverProps } = useHoverOpen()
  return (
    <TagPicker
      value={value}
      onChange={onChange}
      spaceIds={spaceId ? [spaceId] : []}
      createSpaceId={spaceId}
      open={open}
      onOpenChange={setOpen}
      contentProps={hoverProps}
      trigger={
        <PropertyChip icon={Tag} empty={value.length === 0} {...hoverProps}>
          {value.length ? `Tags · ${value.length}` : 'Tags'}
        </PropertyChip>
      }
    />
  )
}

/** The task's selected tags, under the description; each pill removes its tag. */
export function TagList({ tags, onRemove }) {
  if (!tags.length) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <TagPill key={tag.id} tag={tag} size="md" onRemove={onRemove} />
      ))}
    </div>
  )
}

/**
 * A task's links, inline in the dialog body like the description: the saved links, then a
 * borderless "Add a link" input with a + button (Enter works too). `taskId` set means changes
 * save immediately; unset (a task being created) means they stage in `links`/`onLinksChange`,
 * and `TaskForm` creates them once the task exists.
 */
export function LinksField({ taskId, links, onLinksChange, onCreate, onDelete }) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')

  const add = () => {
    if (!url.trim()) return
    const parsed = taskLinkUrlSchema.safeParse(url)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Enter a full link')
      return
    }
    if (taskId) {
      onCreate({ task_id: taskId, url: parsed.data }, (row) => onLinksChange([...links, row]))
    } else {
      onLinksChange([...links, { id: `pending-${Date.now()}`, url: parsed.data, label: null }])
    }
    setUrl('')
    setError('')
  }

  const remove = (link) => {
    if (taskId && !link.id.startsWith('pending-')) onDelete(link.id)
    onLinksChange(links.filter((l) => l !== link))
  }

  return (
    <div className="flex flex-col">
      {links.map((link) => (
        <div key={link.id} className="group/link flex h-8 items-center gap-2">
          <Link2 className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="min-w-0 flex-1 truncate text-muted-foreground hover:text-foreground hover:underline"
          >
            {link.label || link.url}
          </a>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => remove(link)}
            aria-label={`Remove link ${link.label || linkHost(link.url)}`}
            className="opacity-0 group-hover/link:opacity-100 focus-visible:opacity-100"
          >
            <X />
          </Button>
        </div>
      ))}
      <div className="flex h-8 items-center gap-2">
        <Link2 className="size-4 shrink-0 text-faint" aria-hidden />
        <input
          value={url}
          onChange={(e) => {
            setUrl(e.target.value)
            setError('')
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
              e.preventDefault()
              add()
            }
          }}
          placeholder={links.length ? 'Add another link' : 'Add a link'}
          aria-label="Add a link"
          aria-invalid={!!error}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-faint"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={add}
          disabled={!url.trim()}
          aria-label="Add link"
        >
          <Plus />
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

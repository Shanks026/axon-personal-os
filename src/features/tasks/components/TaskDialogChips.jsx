import { useState } from 'react'
import { Link2, Plus, Tag, X } from 'lucide-react'
import { Controller } from 'react-hook-form'
import { useHoverOpen } from '@/hooks/useHoverOpen'
import { formatDateShort } from '@/lib/dates'
import { DatePicker } from '@/components/shared/DatePicker'
import { PropertyChip } from '@/components/shared/PropertyChip'
import { TagPillGroup } from '@/components/shared/TagPill'
import { TagPicker } from '@/components/shared/TagPicker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { taskLinkUrlSchema } from '@/features/tasks/schemas'
import { linkHost } from '@/features/tasks/utils'

// The small property-chip fields of TaskDialog (design 04f), split out so the dialog's main
// form logic stays under components.md's ~200-line guideline. Status, priority, due, tags and
// link all open on hover as well as on click (the user's request, 2026-09-25), so a pointer user
// can preview and change a property without a click; keyboard and touch users still click.

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

/** Tags property chip: selected tags render as their real colour pills, not a plain text label. */
export function TagsChip({ spaceId, tags, value, onChange }) {
  const { open, setOpen, hoverProps } = useHoverOpen()
  const selected = tags.filter((t) => value.includes(t.id))

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
        selected.length > 0 ? (
          <button
            type="button"
            {...hoverProps}
            className="inline-flex h-7 max-w-full items-center gap-1 rounded-md border border-transparent px-1 outline-none hover:border-border focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:border-border"
          >
            <TagPillGroup tags={selected} max={4} />
          </button>
        ) : (
          <PropertyChip icon={Tag} empty {...hoverProps}>
            Tags
          </PropertyChip>
        )
      }
    />
  )
}

/**
 * A task's links (design: the user asked for more than one, 2026-09-25). `taskId` set means
 * edits save immediately (`useCreateTaskLink` etc); unset (a task being created) means they
 * stage locally in `links`/`onLinksChange`, and `TaskForm` creates them once the task exists.
 */
export function LinksChip({ taskId, links, onLinksChange, onCreate, onDelete }) {
  const { open, setOpen, hoverProps } = useHoverOpen()
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')

  const label =
    links.length === 0 ? 'Link' : links.length === 1 ? linkHost(links[0].url) : `${links.length} links`

  const add = () => {
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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <PropertyChip icon={Link2} empty={links.length === 0} {...hoverProps}>
          {label}
        </PropertyChip>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-3" {...hoverProps}>
        {links.length > 0 && (
          <ul className="mb-2.5 flex flex-col gap-1">
            {links.map((link) => (
              <li key={link.id} className="flex items-center gap-1.5">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1 truncate rounded-sm text-muted-foreground hover:text-foreground hover:underline"
                >
                  {link.label || linkHost(link.url)}
                </a>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => remove(link)}
                  aria-label={`Remove link ${link.label || linkHost(link.url)}`}
                >
                  <X />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <label className="mb-1.5 block text-xs font-medium" htmlFor="task-link">
          MR, ticket or doc link
        </label>
        <div className="flex gap-1.5">
          <Input
            id="task-link"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value)
              setError('')
            }}
            placeholder="https://gitlab.com/…/merge_requests/1431"
            aria-invalid={!!error}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                add()
              }
            }}
          />
          <Button type="button" variant="outline" size="icon" onClick={add} aria-label="Add link">
            <Plus />
          </Button>
        </div>
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </PopoverContent>
    </Popover>
  )
}

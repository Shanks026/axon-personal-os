import { useState } from 'react'
import { Link2, Tag } from 'lucide-react'
import { Controller } from 'react-hook-form'
import { formatDateShort } from '@/lib/dates'
import { DatePicker } from '@/components/shared/DatePicker'
import { PropertyChip } from '@/components/shared/PropertyChip'
import { TagPicker } from '@/components/shared/TagPicker'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { linkHost } from '@/features/tasks/utils'

// The small property-chip fields of TaskDialog (design 04f), split out so the dialog's main
// form logic stays under components.md's ~200-line guideline.

export function DateChip({ form, name, label, icon, weekStartsOn }) {
  return (
    <Controller
      name={name}
      control={form.control}
      render={({ field }) => (
        <DatePicker value={field.value} onChange={field.onChange} weekStartsOn={weekStartsOn}>
          <PropertyChip icon={icon} empty={!field.value}>
            {field.value ? `${label} ${formatDateShort(field.value)}` : label}
          </PropertyChip>
        </DatePicker>
      )}
    />
  )
}

/** Tags property chip: label reflects the current selection; assigning can create a new tag. */
export function TagsChip({ spaceId, tags, value, onChange }) {
  const selected = tags.filter((t) => value.includes(t.id))
  const label =
    selected.length === 0
      ? 'Tags'
      : selected.length === 1
        ? selected[0].name
        : `${selected.length} tags`

  return (
    <TagPicker
      value={value}
      onChange={onChange}
      spaceIds={spaceId ? [spaceId] : []}
      createSpaceId={spaceId}
      trigger={
        <PropertyChip icon={Tag} empty={value.length === 0}>
          {label}
        </PropertyChip>
      }
    />
  )
}

export function LinkChip({ form, value }) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <PropertyChip icon={Link2} empty={!value}>
          {value ? linkHost(value) : 'Link'}
        </PropertyChip>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-3">
        <label className="mb-1.5 block text-xs font-medium" htmlFor="task-link">
          MR, ticket or doc link
        </label>
        <Input
          id="task-link"
          {...form.register('external_url')}
          placeholder="https://gitlab.com/…/merge_requests/1431"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              setOpen(false)
            }
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}

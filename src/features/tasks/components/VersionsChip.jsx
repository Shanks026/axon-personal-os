import { useState } from 'react'
import { Check, GitBranch, Plus } from 'lucide-react'
import { useHoverOpen } from '@/hooks/useHoverOpen'
import { PropertyChip } from '@/components/shared/PropertyChip'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useTaskVersions } from '@/features/tasks/api'
import { taskVersionSchema } from '@/features/tasks/schemas'

/**
 * "Version" property chip for TaskDialog: a searchable list of the versions already used in the
 * task's space, plus "Add …" for a new one (versions are free text; a task can have several).
 * The chosen versions are listed under the description, like tags. Opens on hover or click.
 */
export function VersionsChip({ spaceId, value, onChange }) {
  const { open, setOpen, hoverProps } = useHoverOpen()
  const [query, setQuery] = useState('')
  const { data: known = [] } = useTaskVersions({ spaceIds: spaceId ? [spaceId] : [] })

  const trimmed = query.trim()
  const valid = taskVersionSchema.safeParse(trimmed).success
  const exists = [...known, ...value].some((v) => v.toLowerCase() === trimmed.toLowerCase())
  const full = value.length >= 10

  const toggle = (v) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])
  const add = () => {
    if (!valid || exists || full) return
    onChange([...value, trimmed])
    setQuery('')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <PropertyChip icon={GitBranch} empty={value.length === 0} {...hoverProps}>
          {value.length ? `Version · ${value.length}` : 'Version'}
        </PropertyChip>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-60 p-0" {...hoverProps}>
        <Command>
          <CommandInput
            placeholder="Find or add a version…"
            value={query}
            onValueChange={setQuery}
            onKeyDown={(e) => {
              // Enter with nothing matching adds the typed version.
              if (e.key === 'Enter' && trimmed && !exists) {
                e.preventDefault()
                add()
              }
            }}
          />
          <CommandList>
            <CommandEmpty>{trimmed ? 'No match.' : 'No versions yet.'}</CommandEmpty>
            <CommandGroup>
              {known.map((v) => (
                <CommandItem
                  key={v}
                  value={v}
                  onSelect={() => toggle(v)}
                  disabled={full && !value.includes(v)}
                  className="data-selected:bg-transparent"
                >
                  <span className="flex-1 truncate tabular-nums">{v}</span>
                  {value.includes(v) && <Check className="size-4" aria-label="Selected" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          {trimmed && !exists && valid && !full && (
            <div className="border-t p-1">
              <button
                type="button"
                onClick={add}
                className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Plus className="size-3.5 text-faint" aria-hidden />
                Add “{trimmed}”
              </button>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  )
}

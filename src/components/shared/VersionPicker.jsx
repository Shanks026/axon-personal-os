import { useState } from 'react'
import { Check, Plus } from 'lucide-react'
import { MAX_VERSIONS, versionSchema } from '@/lib/versions'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

/**
 * Popover + Command multi-select over free-text versions (task dialog's Version chip, the note
 * editor's "+ Version"). `known` are the suggestions (versions already used in the space),
 * newest first; typing a new one offers "Add …" (Enter adds it). `trigger` is rendered asChild.
 * Pass `open`/`onOpenChange` and `hoverProps` to drive it on hover (see `useHoverOpen`).
 */
export function VersionPicker({
  value,
  onChange,
  known = [],
  trigger,
  align = 'start',
  open: openProp,
  onOpenChange,
  hoverProps,
}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = openProp ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen
  const [query, setQuery] = useState('')

  const trimmed = query.trim()
  const valid = versionSchema.safeParse(trimmed).success
  const exists = [...known, ...value].some((v) => v.toLowerCase() === trimmed.toLowerCase())
  const full = value.length >= MAX_VERSIONS
  const options = [...new Set([...known, ...value])]

  const toggle = (v) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])
  const add = () => {
    if (!valid || exists || full) return
    onChange([...value, trimmed])
    setQuery('')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align={align} className="w-60 p-0" {...hoverProps}>
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
              {options.map((v) => (
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

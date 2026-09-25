import { forwardRef, useState } from 'react'
import { Check, ChevronDown, Plus, Tag as TagIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ManageTagsDialog } from '@/components/shared/ManageTagsDialog'
import { TagPill } from '@/components/shared/TagPill'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useCreateTag, useTags } from '@/features/tags/api'
import { nextTagColor } from '@/features/tags/utils'

/**
 * Outline button in the toolbar filter style, used when no `trigger` is given. `PopoverTrigger
 * asChild` clones its Radix props (onClick, aria-expanded, ref, …) onto this component, so they
 * must be forwarded through to the real `<button>` rather than swallowed here.
 */
const DefaultTrigger = forwardRef(function DefaultTrigger({ count, ...props }, ref) {
  return (
    <Button
      ref={ref}
      variant="outline"
      className={cn('h-9 gap-2', count > 0 && 'border-border-strong bg-space-soft text-space')}
      {...props}
    >
      <TagIcon className={cn(count === 0 && 'text-muted-foreground')} />
      Tags
      {count > 0 && <span className="font-mono text-xs">{count}</span>}
      <ChevronDown className="text-faint" />
    </Button>
  )
})

/**
 * Popover + Command multi-select over tags in scope (design: tag picker). `mode="assign"`
 * (the default) offers inline creation when `createSpaceId` is given (a space id, or `null` for
 * a global tag). `mode="filter"` drops creation and shows Clear instead.
 */
export function TagPicker({
  value = [],
  onChange,
  spaceIds,
  createSpaceId,
  mode = 'assign',
  trigger,
  align = 'start',
  open: openProp,
  onOpenChange: onOpenChangeProp,
  contentProps,
}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = openProp ?? internalOpen
  const setOpen = onOpenChangeProp ?? setInternalOpen
  const [manageOpen, setManageOpen] = useState(false)
  const [query, setQuery] = useState('')
  const { data: tags = [] } = useTags({ spaceIds })
  const createTag = useCreateTag()

  const trimmed = query.trim()
  const exactMatch = tags.some((t) => t.name.toLowerCase() === trimmed.toLowerCase())
  const canCreate =
    mode === 'assign' && createSpaceId !== undefined && trimmed !== '' && !exactMatch

  const toggle = (id) =>
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])

  const handleCreate = () => {
    createTag.mutate(
      { name: trimmed, color: nextTagColor(tags), space_id: createSpaceId },
      { onSuccess: (tag) => (onChange([...value, tag.id]), setQuery('')) },
    )
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          {trigger ?? <DefaultTrigger count={value.length} />}
        </PopoverTrigger>
        <PopoverContent align={align} className="w-64 p-0" {...contentProps}>
          <Command>
            <CommandInput placeholder="Search tags…" value={query} onValueChange={setQuery} />
            <CommandList>
              <CommandEmpty>No tags found.</CommandEmpty>
              <CommandGroup>
                {tags.map((tag) => (
                  <CommandItem
                    key={tag.id}
                    value={tag.name}
                    onSelect={() => toggle(tag.id)}
                    className="data-selected:bg-transparent"
                  >
                    <span className="flex min-w-0 flex-1">
                      <TagPill tag={tag} size="md" className="max-w-full truncate" />
                    </span>
                    {value.includes(tag.id) && (
                      <Check className="size-4 text-foreground" aria-label="Selected" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
            {canCreate && (
              <div className="border-t p-1">
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={createTag.isPending}
                  className="flex h-8 w-full items-center gap-2 rounded-md px-2 text-left outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Plus className="size-3.5 text-faint" aria-hidden />
                  Create tag “{trimmed}”
                </button>
              </div>
            )}
            {mode === 'filter' && value.length > 0 && (
              <div className="border-t p-1">
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="flex h-8 w-full items-center rounded-md px-2 text-left text-muted-foreground outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Clear
                </button>
              </div>
            )}
            <div className="border-t p-1">
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  setManageOpen(true)
                }}
                className="flex h-8 w-full items-center rounded-md px-2 text-left text-muted-foreground outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
              >
                Manage tags…
              </button>
            </div>
          </Command>
        </PopoverContent>
      </Popover>
      <ManageTagsDialog open={manageOpen} onOpenChange={setManageOpen} spaceIds={spaceIds} />
    </>
  )
}

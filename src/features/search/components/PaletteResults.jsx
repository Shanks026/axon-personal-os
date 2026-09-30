import { CircleAlert, Plus, RotateCw } from 'lucide-react'
import { CommandGroup, CommandItem } from '@/components/ui/command'
import { Skeleton } from '@/components/ui/skeleton'
import { PaletteResultItem } from '@/features/search/components/PaletteResultItem'

/** Server results: skeletons on the first load, an inline retry on error, "Create task" when empty. */
export function PaletteResults({ search, groups, query, showSpace, spaceById, onOpen, onCreate }) {
  if (search.isError) {
    return (
      <CommandGroup heading="Results">
        <CommandItem value="search-retry" onSelect={() => search.refetch()}>
          <CircleAlert className="size-4 text-destructive" aria-hidden />
          <span className="flex-1">Search failed</span>
          <RotateCw className="size-3.5 text-muted-foreground" aria-hidden />
          <span className="text-xs text-muted-foreground">Retry</span>
        </CommandItem>
      </CommandGroup>
    )
  }
  if (!search.data) {
    return (
      <div className="flex flex-col gap-2 p-2" aria-hidden>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-10 rounded-md" />
        ))}
      </div>
    )
  }
  if (!groups.length) {
    if (search.isFetching || search.isDebouncing) return null
    return (
      <CommandGroup heading="Results">
        <CommandItem value="create-task" onSelect={onCreate}>
          <Plus className="size-4 text-muted-foreground" aria-hidden />
          <span className="truncate">
            No results for “{query}”. Create task “{query}”
          </span>
        </CommandItem>
      </CommandGroup>
    )
  }
  return groups.map((g) => (
    <CommandGroup key={g.type} heading={g.label}>
      {g.items.map((row) => (
        <PaletteResultItem
          key={`${row.entity_type}:${row.id}`}
          row={row}
          query={query}
          space={spaceById.get(row.space_id)}
          showSpace={showSpace}
          onSelect={onOpen}
        />
      ))}
    </CommandGroup>
  ))
}

import { useState } from 'react'
import { LayoutGrid, Search, Sheet, X } from 'lucide-react'
import { useDebouncedCallback } from 'use-debounce'
import { useSpace } from '@/context/SpaceContext'
import { SegmentedControl } from '@/components/shared/SegmentedControl'
import { TagPicker } from '@/components/shared/TagPicker'
import { Button } from '@/components/ui/button'

const VIEWS = [
  { value: 'grid', label: <LayoutGrid className="size-3.75" aria-label="Grid" /> },
  { value: 'table', label: <Sheet className="size-3.75" aria-label="Table" /> },
]

/**
 * Search on the left (debounced into `?q=`); on the right, Clear (when filtering), the Tags filter
 * (`?tag=`, any-of: the same searchable picker as the Tasks page, so it scales to many tags; it
 * replaced inline chips at the user's request) and the Grid · Table switch.
 */
export function NotesToolbar({ filters, setFilter, clear }) {
  const { scopeSpaceIds } = useSpace()
  // Local text so typing stays instant; the URL updates after a short pause.
  const [text, setText] = useState(filters.q)
  const pushQuery = useDebouncedCallback((v) => setFilter('q', v), 250)
  // "Clear filters" (the empty state) empties ?q= from outside: empty the field too.
  const [prevQ, setPrevQ] = useState(filters.q)
  if (filters.q !== prevQ) {
    setPrevQ(filters.q)
    if (!filters.q) setText('')
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex h-9 w-full items-center gap-2.5 rounded-lg border bg-card px-3 text-muted-foreground focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 sm:w-55">
        <Search className="size-4 shrink-0 text-faint" aria-hidden />
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            pushQuery(e.target.value)
          }}
          placeholder="Search notes…"
          aria-label="Search notes"
          className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-faint"
        />
        {text && (
          <button
            type="button"
            onClick={() => {
              setText('')
              pushQuery.cancel()
              setFilter('q', '')
            }}
            aria-label="Clear search"
            className="text-faint hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        )}
      </label>

      <div className="flex-1" />

      {(filters.q || filters.tag.length > 0) && (
        <Button
          variant="ghost"
          className="h-9 text-muted-foreground"
          onClick={() => {
            setText('')
            pushQuery.cancel()
            clear()
          }}
        >
          Clear
        </Button>
      )}

      <TagPicker
        mode="filter"
        value={filters.tag}
        onChange={(ids) => setFilter('tag', ids)}
        spaceIds={scopeSpaceIds}
        align="end"
      />

      <SegmentedControl
        label="View"
        value={filters.view}
        onChange={(v) => setFilter('view', v)}
        options={VIEWS}
        className="h-9 items-center"
      />
    </div>
  )
}

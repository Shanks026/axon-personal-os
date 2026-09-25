import { useState } from 'react'
import { LayoutGrid, Search, Sheet, X } from 'lucide-react'
import { useDebouncedCallback } from 'use-debounce'
import { SegmentedControl } from '@/components/shared/SegmentedControl'

const VIEWS = [
  { value: 'grid', label: <LayoutGrid className="size-3.75" aria-label="Grid" /> },
  { value: 'table', label: <Sheet className="size-3.75" aria-label="Table" /> },
]

/** Search on the left (debounced into `?q=`), the Grid · Table switch on the right (design 07a). */
export function NotesToolbar({ filters, setFilter }) {
  // Local text so typing stays instant; the URL updates after a short pause.
  const [text, setText] = useState(filters.q)
  const pushQuery = useDebouncedCallback((v) => setFilter('q', v), 250)

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

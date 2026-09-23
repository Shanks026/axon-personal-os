import { useState } from 'react'
import { Search } from 'lucide-react'
import { looksLikeEmoji, SPACE_EMOJIS } from '@/components/shared/spaceEmoji'
import { cn } from '@/lib/utils'

/**
 * Inline searchable emoji grid (design 02c layout, emoji instead of icons). Search by keyword,
 * or paste any emoji into the box to use it even if it isn't in the curated set.
 */
export function EmojiPicker({ value, onChange }) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const pasted = looksLikeEmoji(query) ? query.trim() : null
  const matches = pasted
    ? [[pasted, 'pasted']]
    : q
      ? SPACE_EMOJIS.filter(([, words]) => words.includes(q))
      : SPACE_EMOJIS

  return (
    <div className="rounded-lg border p-2">
      <label className="-mx-0.5 mb-2 flex h-8 items-center gap-2 border-b px-1.5 pb-1.5 text-faint">
        <Search className="size-3.5 shrink-0" aria-hidden />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search emoji, or paste any emoji…"
          aria-label="Search emoji"
          className="w-full bg-transparent text-foreground outline-none placeholder:text-faint"
        />
      </label>
      <div
        role="radiogroup"
        aria-label="Emoji"
        className="grid max-h-40 grid-cols-9 gap-1 overflow-y-auto"
      >
        {matches.map(([emoji, words]) => {
          const selected = emoji === value
          return (
            <button
              key={emoji}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={words.split(' ')[0]}
              title={words}
              onClick={() => onChange(emoji)}
              className={cn(
                'flex h-9 items-center justify-center rounded-md text-lg leading-none transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                selected ? 'bg-accent ring-1 ring-foreground/40' : 'hover:bg-accent',
              )}
            >
              {emoji}
            </button>
          )
        })}
        {matches.length === 0 && (
          <p className="col-span-9 py-4 text-center text-xs text-muted-foreground">
            No emoji match “{query}”. Paste one to use it.
          </p>
        )}
      </div>
    </div>
  )
}

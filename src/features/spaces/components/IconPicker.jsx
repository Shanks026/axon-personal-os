import { useState } from 'react'
import { Search } from 'lucide-react'
import { SPACE_ICONS } from '@/components/shared/spaceIconMap'
import { hueVar } from '@/lib/tint'
import { cn } from '@/lib/utils'
import { SPACE_ICON_KEYS } from '@/features/spaces/constants'

/** Inline searchable icon grid (design 02c): 9 columns, the selection tinted in the space colour. */
export function IconPicker({ value, onChange, color }) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase().replaceAll(' ', '-')
  const keys = q ? SPACE_ICON_KEYS.filter((k) => k.includes(q)) : SPACE_ICON_KEYS
  const hue = hueVar(color)

  return (
    <div className="rounded-lg border p-2">
      <label className="-mx-0.5 mb-2 flex h-8 items-center gap-2 border-b px-1.5 pb-1.5 text-faint">
        <Search className="size-3.5 shrink-0" aria-hidden />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search icons…"
          aria-label="Search icons"
          className="w-full bg-transparent text-foreground outline-none placeholder:text-faint"
        />
      </label>
      <div
        role="radiogroup"
        aria-label="Icon"
        className="grid max-h-40 grid-cols-9 gap-1 overflow-y-auto"
      >
        {keys.map((key) => {
          const Icon = SPACE_ICONS[key]
          const selected = key === value
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={key.replaceAll('-', ' ')}
              title={key.replaceAll('-', ' ')}
              onClick={() => onChange(key)}
              className={cn(
                'flex h-9 items-center justify-center rounded-md transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
                !selected && 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
              style={
                selected
                  ? {
                      color: hue,
                      backgroundColor: `color-mix(in oklab, ${hue} var(--space-soft-mix), transparent)`,
                    }
                  : undefined
              }
            >
              <Icon className="size-4" />
            </button>
          )
        })}
        {keys.length === 0 && (
          <p className="col-span-9 py-4 text-center text-xs text-muted-foreground">
            No icons match “{query}”.
          </p>
        )}
      </div>
    </div>
  )
}

import { Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SpaceIcon } from '@/components/shared/SpaceIcon'
import { TYPE_FILTERS } from '@/features/search/constants'

/**
 * Under the palette input: the type filter (All · Tasks · …; Tab cycles it) and the scope chip,
 * the space's name or "All spaces" (fixed in Global, which always searches every space).
 */
export function PaletteFilterBar({ type, onType, allSpaces, onToggleScope, isGlobal, space }) {
  return (
    <div className="flex scrollbar-none items-center gap-1 overflow-x-auto border-b px-3 py-2">
      {TYPE_FILTERS.map((f) => (
        <button
          key={f.label}
          type="button"
          onClick={() => onType(f.type)}
          aria-pressed={type === f.type}
          className={cn(
            'h-6 shrink-0 rounded-md px-2 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring',
            type === f.type
              ? 'bg-accent text-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {f.label}
        </button>
      ))}
      <div className="flex-1" />
      <button
        type="button"
        onClick={onToggleScope}
        disabled={isGlobal}
        title={isGlobal ? 'Global searches every space' : 'Switch between this space and all'}
        className="flex h-6 shrink-0 items-center gap-1.5 rounded-md border px-2 text-xs font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:hover:text-muted-foreground"
      >
        {allSpaces ? (
          <Layers className="size-3.5" aria-hidden />
        ) : (
          <SpaceIcon icon={space?.icon} size="xs" />
        )}
        {allSpaces ? 'All spaces' : (space?.name ?? 'This space')}
      </button>
    </div>
  )
}

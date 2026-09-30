import { hueVar } from '@/lib/tint'
import { cn } from '@/lib/utils'

/**
 * Small space label for items shown in Global: muted fill and a rounded-square swatch in the space's
 * colour, with the `rounded-md` shape every badge shares (Attio-style, 2026-09-30).
 */
export function SpaceBadge({ space, className }) {
  if (!space) return null
  return (
    <span
      className={cn(
        'inline-flex h-5 max-w-40 items-center gap-1.5 rounded-md bg-muted px-1.75 text-xs font-medium text-muted-foreground',
        className,
      )}
    >
      <span
        className="size-2 shrink-0 rounded-xs"
        style={{ background: hueVar(space.color) }}
        aria-hidden
      />
      <span className="truncate">{space.name}</span>
    </span>
  )
}

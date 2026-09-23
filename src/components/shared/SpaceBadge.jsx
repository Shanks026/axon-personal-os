import { hueVar } from '@/lib/tint'
import { cn } from '@/lib/utils'

/**
 * Small space label for items shown in Global (design: square-ish 5px radius, muted fill,
 * accent dot), deliberately a different shape from round tag pills.
 */
export function SpaceBadge({ space, className }) {
  if (!space) return null
  return (
    <span
      className={cn(
        'inline-flex h-5 max-w-40 items-center gap-1.5 rounded-sm bg-muted px-1.75 text-xs text-muted-foreground',
        className,
      )}
    >
      <span
        className="size-1.5 shrink-0 rounded-full"
        style={{ background: hueVar(space.color) }}
        aria-hidden
      />
      <span className="truncate">{space.name}</span>
    </span>
  )
}

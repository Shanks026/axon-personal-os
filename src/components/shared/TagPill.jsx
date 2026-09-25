import { X } from 'lucide-react'
import { badgeClasses } from '@/lib/tint'
import { cn } from '@/lib/utils'

/**
 * Tag pill (design: tag rows and cards, board card tags). `--radius-sm`, the same square-ish
 * shape as `SpaceBadge`, so both read as "labels" distinct from the fully round status pills.
 * A plain Tailwind colour-scale badge (the user's request, 2026-09-25), not the CSS-variable tint
 * recipe. `onRemove` adds a labelled ✕; otherwise it's a plain read-only chip. A long name
 * truncates inside the pill (capped at 10rem, or 15rem for `md`); hover shows the full name.
 */
export function TagPill({ tag, size = 'sm', onRemove, className }) {
  return (
    <span
      className={cn(
        'inline-flex min-w-0 items-center gap-1 rounded-sm px-1.75 font-medium whitespace-nowrap',
        badgeClasses(tag.color),
        size === 'sm' ? 'h-5 max-w-40 text-xs' : 'h-6.5 max-w-60 px-2 text-sm',
        className,
      )}
      title={tag.name}
    >
      <span className="truncate">{tag.name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove(tag)
          }}
          aria-label={`Remove tag ${tag.name}`}
          className="-mr-0.5 shrink-0 rounded-full outline-none hover:opacity-70 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className={size === 'sm' ? 'size-2.75' : 'size-3.25'} />
        </button>
      )}
    </span>
  )
}

/** Up to `max` `TagPill`s, then a "+n" pill (rows, board and grid cards). */
export function TagPillGroup({ tags, max = 3, size = 'sm', className }) {
  if (!tags?.length) return null
  const shown = tags.slice(0, max)
  const rest = tags.length - shown.length
  return (
    <div className={cn('flex min-w-0 items-center gap-1', className)}>
      {shown.map((tag) => (
        <TagPill key={tag.id} tag={tag} size={size} />
      ))}
      {rest > 0 && (
        <span className="shrink-0 text-xs text-faint" aria-label={`${rest} more tags`}>
          +{rest}
        </span>
      )}
    </div>
  )
}

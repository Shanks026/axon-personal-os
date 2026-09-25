import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'

/**
 * A version a task or note is linked to ("v3.9.0"): shadcn's secondary badge with the tags' square-ish
 * `rounded-sm` (the user's request, 2026-09-25), so versions read as labels next to tags without
 * competing with their colours. `onRemove` adds a labelled ✕ (the task dialog, the note editor).
 */
export function VersionBadge({ version, onRemove, className }) {
  return (
    <Badge
      variant="secondary"
      title={version}
      className={cn('max-w-32 rounded-sm px-1.75 tabular-nums', className)}
    >
      <span className="truncate">{version}</span>
      {onRemove && (
        <button
          type="button"
          onClick={() => onRemove(version)}
          aria-label={`Remove version ${version}`}
          className="-mr-0.5 shrink-0 rounded-full outline-none hover:opacity-70 focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-3" />
        </button>
      )}
    </Badge>
  )
}

/**
 * A task's or note's versions in a row (cards, table rows, board cards, previews): one badge,
 * then "+n" (the user's request, 2026-09-26, matching the tags). Hovering a group with hidden
 * versions lists them all. Renders nothing without any.
 */
export function VersionBadgeGroup({ versions, max = 1, className }) {
  if (!versions?.length) return null
  const shown = versions.slice(0, max)
  const rest = versions.length - shown.length
  const group = (
    <div
      className={cn(
        'flex shrink-0 items-center gap-1',
        className,
        // Callers may disable pointer events (grid cards); hovering must still reach the trigger.
        rest > 0 && 'pointer-events-auto cursor-default',
      )}
    >
      {shown.map((v) => (
        <VersionBadge key={v} version={v} />
      ))}
      {rest > 0 && (
        <span className="shrink-0 text-xs text-faint" aria-label={`${rest} more versions`}>
          +{rest}
        </span>
      )}
    </div>
  )
  if (rest === 0) return group

  return (
    <HoverCard openDelay={150} closeDelay={100}>
      <HoverCardTrigger asChild>{group}</HoverCardTrigger>
      <HoverCardContent align="end" className="w-auto max-w-72 p-2">
        <p className="mb-1.5 text-xs text-muted-foreground">{versions.length} versions</p>
        <div className="flex flex-wrap gap-1">
          {versions.map((v) => (
            <VersionBadge key={v} version={v} />
          ))}
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}

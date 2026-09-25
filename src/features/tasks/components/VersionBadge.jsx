import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

/**
 * A version a task is linked to ("v3.9.0"): shadcn's secondary badge with the tags' square-ish
 * `rounded-sm` (the user's request, 2026-09-25), so versions read as labels next to tags without
 * competing with their colours. `onRemove` adds a labelled ✕ (the task dialog).
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
 * A task's versions in a row (cards, table rows, board cards): up to `max`, then "+n" with the
 * full list on hover. Renders nothing without any.
 */
export function VersionBadgeGroup({ versions, max = 2, className }) {
  if (!versions?.length) return null
  const rest = versions.length - max
  return (
    <div
      className={cn('flex shrink-0 items-center gap-1', className)}
      title={rest > 0 ? versions.join(', ') : undefined}
    >
      {versions.slice(0, max).map((v) => (
        <VersionBadge key={v} version={v} />
      ))}
      {rest > 0 && <span className="text-xs text-faint">+{rest}</span>}
    </div>
  )
}

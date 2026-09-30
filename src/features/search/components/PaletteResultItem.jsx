import { formatRelative, formatWeekdayDate } from '@/lib/dates'
import { EntityIcon } from '@/components/shared/EntityIcon'
import { SpaceBadge } from '@/components/shared/SpaceBadge'
import { CommandItem } from '@/components/ui/command'
import { HighlightedText } from '@/features/search/components/HighlightedText'
import { highlightTitle, parseSnippet } from '@/features/search/utils'
import { TASK_STATUS_MAP } from '@/features/tasks/constants'

const EDITED = { event: 'updated', todo: 'updated' }

/** The small status word after a title: a task's status, "Done" for todos, a report's draft. */
function statusLabel(row) {
  if (row.entity_type === 'task') return TASK_STATUS_MAP[row.status]?.label
  if (row.entity_type === 'todo') return row.status === 'done' ? 'Done' : null
  if (row.entity_type === 'report') return row.status === 'final' ? 'Final' : null
  return null
}

/**
 * One palette result or recent item: the type icon, the title with the query marked (a journal
 * day falls back to its date), then the snippet with its matches marked, else "edited 2d ago".
 * `showSpace` (searching all spaces) adds the space badge. `value` is `type:id` for cmdk.
 */
export function PaletteResultItem({ row, query, space, showSpace, onSelect }) {
  const title =
    row.title?.trim() ||
    (row.entity_type === 'journal' ? `Journal · ${formatWeekdayDate(row.status)}` : 'Untitled')
  const snippet = parseSnippet(row.snippet)
  const status = statusLabel(row)
  const edited = row.updated_at
    ? `${EDITED[row.entity_type] ?? 'edited'} ${formatRelative(row.updated_at)}`
    : null

  return (
    <CommandItem value={`${row.entity_type}:${row.id}`} onSelect={() => onSelect(row)}>
      <EntityIcon type={row.entity_type} className="mt-0.5 self-start" />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex min-w-0 items-center gap-2">
          <HighlightedText segments={highlightTitle(title, query)} className="min-w-0" />
          {status && <span className="shrink-0 text-xs text-muted-foreground">{status}</span>}
        </div>
        {snippet.length > 0 ? (
          <HighlightedText segments={snippet} className="text-xs text-muted-foreground" />
        ) : (
          edited && <span className="truncate text-xs text-muted-foreground">{edited}</span>
        )}
      </div>
      {snippet.length > 0 && edited && (
        <span className="shrink-0 text-xs text-faint">{edited}</span>
      )}
      {showSpace && space && <SpaceBadge space={space} className="shrink-0" />}
    </CommandItem>
  )
}

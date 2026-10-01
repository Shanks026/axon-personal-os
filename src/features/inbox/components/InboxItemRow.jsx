import { useState } from 'react'
import { CalendarPlus, Delete, FileText, ListChecks, MoveRight, SquareCheckBig } from 'lucide-react'
import { formatRelative } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { Kbd } from '@/components/shared/Kbd'
import { SpaceBadge } from '@/components/shared/SpaceBadge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { MoveToSpaceMenu } from '@/features/inbox/components/MoveToSpaceMenu'
import { ITEM_KINDS, SOURCE_LABELS } from '@/features/inbox/constants'
import { itemKind } from '@/features/inbox/utils'

/** One action chip: an icon, its label and key (the design delta: T, D, N, E, M). */
function ActionChip({ icon: Icon, label, keyHint, onClick }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      className="gap-1.5 text-muted-foreground"
      onClick={onClick}
    >
      <Icon aria-hidden />
      <span className="hidden sm:inline">{label}</span>
      {keyHint && <Kbd shortcut={keyHint} className="hidden sm:inline-flex" />}
    </Button>
  )
}

/**
 * An inbox item (design delta): the kind icon (link, question or idea), the text (three lines,
 * "Show more" for longer), "2h ago · Quick capture" and, in Global, the space (or Unsorted).
 * - Action chips (Task T, Todo D, Note N, Event E, Move M, Discard ⌫) show on the hovered,
 *   focused or keyboard-selected row (always on phones).
 * - A checkbox picks the row for bulk actions: click toggles, Shift+click a range
 *   (`onCheck(event)`). It's visible on hover, focus, and whenever anything is picked.
 * - `rowProps` come from `useListNavigation`; `moveOpen` / `onMoveOpenChange` let M open the
 *   move menu; `onAction(kind, item, extra?)` does the work.
 */
export function InboxItemRow({
  item,
  space,
  showSpace,
  onAction,
  rowProps,
  checked = false,
  showCheck = false,
  onCheck,
  moveOpen,
  onMoveOpenChange,
}) {
  const [expanded, setExpanded] = useState(false)
  const kind = ITEM_KINDS[itemKind(item.body)]
  const KindIcon = kind.icon
  const long = item.body.split('\n').length > 3 || item.body.length > 280
  const title = item.body.split('\n')[0]

  return (
    <div
      {...rowProps}
      className={cn(
        'group flex gap-3 rounded-lg border bg-card px-4 py-3 transition-colors hover:border-border-strong data-selected:border-border-strong data-selected:bg-accent/40',
        checked && 'border-border-strong bg-accent/40',
      )}
    >
      <div className="relative mt-0.5 size-7 shrink-0">
        <span
          className={cn(
            'flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground transition-opacity',
            (checked || showCheck) && 'opacity-0',
            'group-focus-within:opacity-0 group-hover:opacity-0',
          )}
          title={kind.label}
        >
          <KindIcon className="size-4" aria-hidden />
          <span className="sr-only">{kind.label}</span>
        </span>
        <span
          className={cn(
            'absolute inset-0 flex items-center justify-center opacity-0 transition-opacity',
            (checked || showCheck) && 'opacity-100',
            'group-focus-within:opacity-100 group-hover:opacity-100',
          )}
        >
          <Checkbox
            checked={checked}
            onClick={(e) => {
              e.preventDefault()
              onCheck?.(e)
            }}
            aria-label={`Select “${title}”`}
          />
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn('wrap-break-word whitespace-pre-wrap', !expanded && 'line-clamp-3')}>
          {item.body}
        </p>
        {long && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-0.5 text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            {expanded ? 'Show less' : 'Show more'}
          </button>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{formatRelative(item.created_at)}</span>
          <span className="text-faint">·</span>
          <span>{SOURCE_LABELS[item.source] ?? item.source}</span>
          {showSpace &&
            (space ? (
              <SpaceBadge space={space} />
            ) : (
              <span className="inline-flex h-5 items-center rounded-md bg-muted px-1.75 font-medium">
                Unsorted
              </span>
            ))}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 group-data-selected:opacity-100 max-sm:opacity-100">
          <ActionChip
            icon={SquareCheckBig}
            label="Task"
            keyHint="t"
            onClick={() => onAction('task', item)}
          />
          <ActionChip
            icon={ListChecks}
            label="Todo"
            keyHint="d"
            onClick={() => onAction('todo', item)}
          />
          <ActionChip
            icon={FileText}
            label="Note"
            keyHint="n"
            onClick={() => onAction('note', item)}
          />
          <ActionChip
            icon={CalendarPlus}
            label="Event"
            keyHint="e"
            onClick={() => onAction('event', item)}
          />
          <MoveToSpaceMenu
            current={item.space_id}
            open={moveOpen}
            onOpenChange={onMoveOpenChange}
            onMove={(spaceId) => onAction('move', item, spaceId)}
          >
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="gap-1.5 text-muted-foreground"
            >
              <MoveRight aria-hidden />
              <span className="hidden sm:inline">Move</span>
              <Kbd shortcut="m" className="hidden sm:inline-flex" />
            </Button>
          </MoveToSpaceMenu>
          <div className="flex-1" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="destructive"
                size="icon-xs"
                onClick={() => onAction('discard', item)}
                aria-label="Discard"
              >
                <Delete />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Discard (Backspace)</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  )
}

import { dotClasses } from '@/lib/tint'
import { cn } from '@/lib/utils'
import { TagPicker } from '@/components/shared/TagPicker'

const MAX_CHIPS = 6

function Chip({ selected, onClick, children }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'flex h-8 max-w-44 shrink-0 items-center gap-1.5 rounded-full border px-3 whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-ring',
        selected
          ? 'border-border-strong bg-accent text-foreground'
          : 'text-muted-foreground hover:border-border-strong hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

/**
 * Inline tag chips for the notes toolbar (design 07a: All, sprint, rca…). "All" clears; a chip
 * toggles its tag (any-of, in `?tag=`). The chips are the tags notes use most (`note_count`),
 * plus any selected one; the rest are reachable from "More", a filter-mode `TagPicker`.
 */
export function NoteTagFilter({ tags, value, onChange, spaceIds }) {
  const used = tags.filter((t) => t.note_count > 0).sort((a, b) => b.note_count - a.note_count)
  if (used.length === 0 && value.length === 0) return null

  const top = used.slice(0, MAX_CHIPS)
  const extraSelected = tags.filter((t) => value.includes(t.id) && !top.includes(t))
  const chips = [...top, ...extraSelected]
  const toggle = (id) =>
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id])

  return (
    <div
      className="flex min-w-0 flex-wrap items-center gap-1.5"
      role="group"
      aria-label="Filter by tag"
    >
      <Chip selected={value.length === 0} onClick={() => onChange([])}>
        All
      </Chip>
      {chips.map((tag) => (
        <Chip key={tag.id} selected={value.includes(tag.id)} onClick={() => toggle(tag.id)}>
          <span className={cn('size-2 shrink-0 rounded-full', dotClasses(tag.color))} aria-hidden />
          <span className="truncate">{tag.name}</span>
        </Chip>
      ))}
      {used.length > MAX_CHIPS && (
        <TagPicker
          mode="filter"
          value={value}
          onChange={onChange}
          spaceIds={spaceIds}
          trigger={
            <button
              type="button"
              className="flex h-8 shrink-0 items-center rounded-full border border-dashed border-border-strong px-3 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              More
            </button>
          }
        />
      )}
    </div>
  )
}

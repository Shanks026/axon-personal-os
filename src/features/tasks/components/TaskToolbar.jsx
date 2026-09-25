import { useState } from 'react'
import {
  CalendarDays,
  ChevronDown,
  CircleDashed,
  Columns3,
  LayoutGrid,
  Sheet,
  Search,
  SignalHigh,
  X,
} from 'lucide-react'
import { useDebouncedCallback } from 'use-debounce'
import { textClasses } from '@/lib/tint'
import { cn } from '@/lib/utils'
import { useSpace } from '@/context/SpaceContext'
import { SegmentedControl } from '@/components/shared/SegmentedControl'
import { TagPicker } from '@/components/shared/TagPicker'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DUE_FILTERS, TASK_PRIORITIES, TASK_STATUSES } from '@/features/tasks/constants'

const VIEWS = [
  { value: 'grid', label: <LayoutGrid className="size-3.75" aria-label="Grid" /> },
  { value: 'board', label: <Columns3 className="size-3.75" aria-label="Board" /> },
  { value: 'table', label: <Sheet className="size-3.75" aria-label="Table" /> },
]

/** Filter button (design 04a toolbar): icon, label or selection count, chevron. */
function FilterButton({ icon: Icon, label, count, active, children }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn('h-9 gap-2', active && 'border-border-strong bg-space-soft text-space')}
        >
          <Icon className={cn(!active && 'text-muted-foreground')} />
          {label}
          {count > 0 && <span className="font-mono text-xs">{count}</span>}
          <ChevronDown className="text-faint" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const toggle = (list, v) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

/** Search on the left; Status / Priority / Tags / Due filters and the view switch on the right. */
export function TaskToolbar({ filters, setFilter, clear, hasFilters }) {
  const { scopeSpaceIds } = useSpace()
  // Local text so typing stays instant; the URL updates after a short pause.
  const [text, setText] = useState(filters.q)
  const pushQuery = useDebouncedCallback((v) => setFilter('q', v), 250)
  const dueLabel = DUE_FILTERS.find((d) => d.value === filters.due)?.label

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex h-9 w-full items-center gap-2.5 rounded-lg border bg-card px-3 text-muted-foreground focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 sm:w-85">
        <Search className="size-4 shrink-0 text-faint" aria-hidden />
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            pushQuery(e.target.value)
          }}
          placeholder="Search tasks…"
          aria-label="Search tasks"
          className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-faint"
        />
        {text && (
          <button
            type="button"
            onClick={() => {
              setText('')
              setFilter('q', '')
            }}
            aria-label="Clear search"
            className="text-faint hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        )}
      </label>

      <div className="flex-1" />

      {hasFilters && (
        <Button
          variant="ghost"
          className="h-9 text-muted-foreground"
          onClick={() => {
            setText('')
            clear()
          }}
        >
          Clear
        </Button>
      )}

      <FilterButton
        icon={CircleDashed}
        label="Status"
        count={filters.status.length}
        active={filters.status.length > 0}
      >
        <DropdownMenuLabel className="text-xs text-faint">Status</DropdownMenuLabel>
        {TASK_STATUSES.map((s) => (
          <DropdownMenuCheckboxItem
            key={s.value}
            checked={filters.status.includes(s.value)}
            onCheckedChange={() => setFilter('status', toggle(filters.status, s.value))}
            onSelect={(e) => e.preventDefault()}
          >
            <s.icon className={textClasses(s.color)} />
            {s.label}
          </DropdownMenuCheckboxItem>
        ))}
      </FilterButton>

      <FilterButton
        icon={SignalHigh}
        label="Priority"
        count={filters.priority.length}
        active={filters.priority.length > 0}
      >
        <DropdownMenuLabel className="text-xs text-faint">Priority</DropdownMenuLabel>
        {TASK_PRIORITIES.map((p) => (
          <DropdownMenuCheckboxItem
            key={p.value}
            checked={filters.priority.includes(p.value)}
            onCheckedChange={() => setFilter('priority', toggle(filters.priority, p.value))}
            onSelect={(e) => e.preventDefault()}
          >
            <p.icon color={p.color} />
            {p.label}
          </DropdownMenuCheckboxItem>
        ))}
      </FilterButton>

      <TagPicker
        mode="filter"
        value={filters.tag}
        onChange={(ids) => setFilter('tag', ids)}
        spaceIds={scopeSpaceIds}
      />

      <FilterButton icon={CalendarDays} label={dueLabel ?? 'Due'} active={!!filters.due}>
        <DropdownMenuLabel className="text-xs text-faint">Due</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={filters.due} onValueChange={(v) => setFilter('due', v)}>
          {DUE_FILTERS.map((d) => (
            <DropdownMenuRadioItem key={d.value} value={d.value}>
              {d.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        {filters.due && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value="" onValueChange={() => setFilter('due', '')}>
              <DropdownMenuRadioItem value="any">Any date</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </>
        )}
      </FilterButton>

      <SegmentedControl
        label="View"
        value={filters.view}
        onChange={(v) => setFilter('view', v)}
        options={VIEWS}
        className="h-9 items-center"
      />
    </div>
  )
}

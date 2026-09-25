import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DEFAULT_TASK_SORT, MANUAL_TASK_SORT, TASK_SORTS } from '@/features/tasks/constants'

/**
 * Toolbar Sort menu for the grid and table (`?sort=`, shared with the table's header clicks).
 * Picking a field starts in its natural direction (newest / most urgent first for Created,
 * Updated and Priority); the direction can then be flipped. "Manual order" is the drag order.
 */
export function TaskSortMenu({ value, onChange }) {
  const key = value.replace(/^-/, '')
  const desc = value.startsWith('-')
  const current = TASK_SORTS.find((s) => s.value === key)
  const DirIcon = desc ? ArrowDown : ArrowUp
  // The default (newest created) reads as a plain "Sort" button (the user's request, 2026-09-25).
  const isDefault = value === DEFAULT_TASK_SORT
  const label = isDefault ? 'Sort' : current ? current.label : 'Manual order'

  const pickField = (v) => {
    if (v === MANUAL_TASK_SORT) return onChange(MANUAL_TASK_SORT)
    const def = TASK_SORTS.find((s) => s.value === v)
    onChange(def.descFirst ? `-${v}` : v)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-9 gap-2">
          <ArrowUpDown className={cn(isDefault && 'text-muted-foreground')} />
          {label}
          {current && !isDefault && (
            <DirIcon
              className="text-muted-foreground"
              aria-label={desc ? 'descending' : 'ascending'}
            />
          )}
          <ChevronDown className="text-faint" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs text-faint">Sort by</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={current ? key : MANUAL_TASK_SORT} onValueChange={pickField}>
          <DropdownMenuRadioItem value={MANUAL_TASK_SORT}>Manual order</DropdownMenuRadioItem>
          {TASK_SORTS.map((s) => (
            <DropdownMenuRadioItem key={s.value} value={s.value}>
              {s.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        {current && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={desc ? 'desc' : 'asc'}
              onValueChange={(d) => onChange(d === 'desc' ? `-${key}` : key)}
            >
              <DropdownMenuRadioItem value="asc">Ascending</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="desc">Descending</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

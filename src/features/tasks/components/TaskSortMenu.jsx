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
import { TASK_SORTS } from '@/features/tasks/constants'

const MANUAL = 'manual'

/**
 * Toolbar Sort menu for the grid and table (`?sort=`, shared with the table's header clicks).
 * Picking a field starts in its natural direction (newest / most urgent first for Created,
 * Updated and Priority); the direction can then be flipped. "Manual order" clears the sort.
 */
export function TaskSortMenu({ value, onChange }) {
  const key = value.replace(/^-/, '')
  const desc = value.startsWith('-')
  const current = TASK_SORTS.find((s) => s.value === key)
  const DirIcon = desc ? ArrowDown : ArrowUp

  const pickField = (v) => {
    if (v === MANUAL) return onChange('')
    const def = TASK_SORTS.find((s) => s.value === v)
    onChange(def.descFirst ? `-${v}` : v)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="h-9 gap-2">
          <ArrowUpDown className={cn(!current && 'text-muted-foreground')} />
          {current ? current.label : 'Sort'}
          {current && (
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
        <DropdownMenuRadioGroup value={current ? key : MANUAL} onValueChange={pickField}>
          <DropdownMenuRadioItem value={MANUAL}>Manual order</DropdownMenuRadioItem>
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

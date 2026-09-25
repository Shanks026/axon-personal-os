import { ChevronLeft, ChevronRight, Ellipsis, Plus } from 'lucide-react'
import { useHotkeys } from 'react-hotkeys-hook'
import { Kbd } from '@/components/shared/Kbd'
import { SegmentedControl } from '@/components/shared/SegmentedControl'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { CALENDAR_VIEWS } from '@/features/calendar/constants'

const VIEW_OPTIONS = CALENDAR_VIEWS.map((v) => ({
  value: v.value,
  label: v.label,
  disabled: v.disabled,
  hint: v.disabled ? 'Coming soon' : undefined,
}))

function IconButton({ label, shortcut, onClick, children }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={label} onClick={onClick}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {label} <Kbd shortcut={shortcut} className="ml-1" />
      </TooltipContent>
    </Tooltip>
  )
}

/**
 * The calendar's title row (design: Calendar header, laid out like the Tasks page): the range
 * title with a mono fiscal subtitle, then Today, previous / next, the view switch, the layers
 * menu and "New event". Hotkeys (t, ←, →, m, a, n) are off while a dialog is open.
 */
export function CalendarToolbar({
  title,
  subtitle,
  view,
  onViewChange,
  onToday,
  onPrev,
  onNext,
  onCreate,
  layers,
  onToggleLayer,
  hotkeysEnabled = true,
}) {
  const opts = { enabled: hotkeysEnabled }
  useHotkeys('t', onToday, opts, [onToday])
  useHotkeys('left', onPrev, opts, [onPrev])
  useHotkeys('right', onNext, opts, [onNext])
  useHotkeys('m', () => onViewChange('month'), opts, [onViewChange])
  useHotkeys('a', () => onViewChange('agenda'), opts, [onViewChange])
  useHotkeys('n', () => onCreate(), { ...opts, preventDefault: true }, [onCreate])

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
      <div className="flex min-w-0 flex-1 items-baseline gap-3">
        <h2 className="truncate text-3xl font-semibold tracking-tight">{title}</h2>
        <span className="font-mono text-xs whitespace-nowrap text-faint">{subtitle}</span>
      </div>
      <div className="flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm" onClick={onToday}>
              Today
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Go to today <Kbd shortcut="t" className="ml-1" />
          </TooltipContent>
        </Tooltip>
        <IconButton label="Previous" shortcut="left" onClick={onPrev}>
          <ChevronLeft />
        </IconButton>
        <IconButton label="Next" shortcut="right" onClick={onNext}>
          <ChevronRight />
        </IconButton>
      </div>
      <SegmentedControl
        label="Calendar view"
        value={view}
        onChange={onViewChange}
        options={VIEW_OPTIONS}
      />
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Calendar layers">
                <Ellipsis />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>Layers</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuLabel>Show</DropdownMenuLabel>
          <DropdownMenuCheckboxItem
            checked={layers.tasks}
            onCheckedChange={() => onToggleLayer('tasks')}
            onSelect={(e) => e.preventDefault()}
          >
            Tasks due
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={layers.todos}
            onCheckedChange={() => onToggleLayer('todos')}
            onSelect={(e) => e.preventDefault()}
          >
            Todos due
          </DropdownMenuCheckboxItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button className="h-9" onClick={() => onCreate()}>
        <Plus />
        New event
      </Button>
    </div>
  )
}

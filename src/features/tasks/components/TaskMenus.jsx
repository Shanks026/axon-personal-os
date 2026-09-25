import { Check, Ellipsis, ExternalLink, Pencil, Trash2 } from 'lucide-react'
import { useHoverOpen } from '@/hooks/useHoverOpen'
import { textClasses } from '@/lib/tint'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TASK_PRIORITIES, TASK_STATUSES } from '@/features/tasks/constants'
import { linkHost } from '@/features/tasks/utils'

/**
 * Pick a status. `children` is the trigger (rendered asChild). `hoverOpen` also opens the menu
 * on hover, without changing its click behaviour (the dialog's property chips use this; rows and
 * cards don't, so hovering a list doesn't pop menus open unexpectedly).
 */
export function StatusMenu({ value, onChange, children, align = 'start', hoverOpen = false }) {
  const { open, setOpen, hoverProps } = useHoverOpen()
  const controlled = hoverOpen ? { open, onOpenChange: setOpen } : {}
  return (
    <DropdownMenu {...controlled}>
      <DropdownMenuTrigger asChild {...(hoverOpen ? hoverProps : {})}>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-44" {...(hoverOpen ? hoverProps : {})}>
        <DropdownMenuLabel className="text-xs text-faint">Status</DropdownMenuLabel>
        {TASK_STATUSES.map((s) => (
          <DropdownMenuItem key={s.value} onSelect={() => onChange(s.value)}>
            <s.icon className={textClasses(s.color)} />
            <span className="flex-1">{s.label}</span>
            {s.value === value && <Check className="size-3.5" aria-label="Current" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Pick a priority. `children` is the trigger (rendered asChild). See `StatusMenu` for `hoverOpen`. */
export function PriorityMenu({ value, onChange, children, align = 'start', hoverOpen = false }) {
  const { open, setOpen, hoverProps } = useHoverOpen()
  const controlled = hoverOpen ? { open, onOpenChange: setOpen } : {}
  return (
    <DropdownMenu {...controlled}>
      <DropdownMenuTrigger asChild {...(hoverOpen ? hoverProps : {})}>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-40" {...(hoverOpen ? hoverProps : {})}>
        <DropdownMenuLabel className="text-xs text-faint">Priority</DropdownMenuLabel>
        {TASK_PRIORITIES.map((p) => (
          <DropdownMenuItem key={p.value} onSelect={() => onChange(p.value)}>
            <p.icon color={p.color} />
            <span className="flex-1">{p.label}</span>
            {p.value === value && <Check className="size-3.5" aria-label="Current" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Card/row "⋮" menu: Edit, one item per link, Move to Trash. */
export function TaskActionsMenu({ task, onEdit, onDelete, vertical = true }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          className="text-faint"
          aria-label={`${task.title} options`}
        >
          <Ellipsis className={vertical ? 'rotate-90' : undefined} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onSelect={onEdit}>
          <Pencil />
          Edit
        </DropdownMenuItem>
        {task.links?.map((link) => (
          <DropdownMenuItem key={link.id} asChild>
            <a href={link.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink />
              {link.label || linkHost(link.url)}
            </a>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={onDelete}>
          <Trash2 />
          Move to Trash
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

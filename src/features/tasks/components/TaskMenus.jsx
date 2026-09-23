import { Check, Ellipsis, ExternalLink, Pencil, Trash2 } from 'lucide-react'
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

/** Pick a status. `children` is the trigger (rendered asChild). */
export function StatusMenu({ value, onChange, children, align = 'start' }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-44">
        <DropdownMenuLabel className="text-xs text-faint">Status</DropdownMenuLabel>
        {TASK_STATUSES.map((s) => (
          <DropdownMenuItem key={s.value} onSelect={() => onChange(s.value)}>
            <s.icon style={{ color: s.iconTone ?? s.tone }} />
            <span className="flex-1">{s.label}</span>
            {s.value === value && <Check className="size-3.5" aria-label="Current" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Pick a priority. `children` is the trigger (rendered asChild). */
export function PriorityMenu({ value, onChange, children, align = 'start' }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-40">
        <DropdownMenuLabel className="text-xs text-faint">Priority</DropdownMenuLabel>
        {TASK_PRIORITIES.map((p) => (
          <DropdownMenuItem key={p.value} onSelect={() => onChange(p.value)}>
            <p.icon style={{ color: p.tone }} />
            <span className="flex-1">{p.label}</span>
            {p.value === value && <Check className="size-3.5" aria-label="Current" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Card/row "⋮" menu: Edit, Open link, Move to Trash. */
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
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onSelect={onEdit}>
          <Pencil />
          Edit
        </DropdownMenuItem>
        {task.external_url && (
          <DropdownMenuItem asChild>
            <a href={task.external_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink />
              Open link
            </a>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={onDelete}>
          <Trash2 />
          Move to Trash
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

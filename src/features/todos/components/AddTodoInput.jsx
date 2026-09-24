import { useRef, useState } from 'react'
import { CalendarDays, Plus } from 'lucide-react'
import { formatDueLabel } from '@/lib/dates'
import { useSpace } from '@/context/SpaceContext'
import { DatePicker } from '@/components/shared/DatePicker'
import { Kbd } from '@/components/shared/Kbd'
import { SpaceIcon } from '@/components/shared/SpaceIcon'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { usePreferences } from '@/features/settings/api'
import { useCreateTodo } from '@/features/todos/api'

/**
 * The always-visible add row (design: Todos.dc.html). Enter creates and keeps focus for the
 * next one; Esc blurs. In Global, a compact space select sits before the input.
 */
export function AddTodoInput({ spaceId }) {
  const { isGlobal, activeSpaces } = useSpace()
  const { weekStartsOn } = usePreferences()
  const create = useCreateTodo()
  const inputRef = useRef(null)
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState(null)
  // Only overridden once the user actually picks a space in Global; otherwise this stays
  // reactive to the current space, instead of freezing whatever `spaceId` was on first render.
  const [manualSpace, setManualSpace] = useState(null)
  const space = manualSpace ?? spaceId ?? activeSpaces[0]?.id ?? ''

  const submit = () => {
    const trimmed = title.trim()
    if (!trimmed || !space) return
    create.mutate({ space_id: space, title: trimmed, due_date: dueDate })
    setTitle('')
    setDueDate(null)
    inputRef.current?.focus()
  }

  return (
    <div className="sticky top-0 z-10 -mx-1 flex items-center gap-2 bg-background px-1 pb-1">
      {isGlobal && (
        <Select value={space} onValueChange={setManualSpace}>
          <SelectTrigger size="sm" className="h-11 w-36 shrink-0" aria-label="Space">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {activeSpaces.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                <SpaceIcon icon={s.icon} size="xs" />
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <label className="flex h-11 flex-1 items-center gap-3 rounded-lg border bg-card px-3.5 shadow-xs focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
        <Plus className="size-4 shrink-0 text-space" aria-hidden />
        <input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit()
            if (e.key === 'Escape') e.currentTarget.blur()
          }}
          placeholder="Add a todo…"
          aria-label="Add a todo"
          maxLength={500}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-faint"
        />
        <DatePicker value={dueDate} onChange={setDueDate} weekStartsOn={weekStartsOn} align="end">
          <button
            type="button"
            aria-label="Set due date"
            className="flex shrink-0 items-center gap-1.5 rounded-sm text-faint outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            {dueDate && (
              <span className="font-mono text-xs text-muted-foreground">
                {formatDueLabel(dueDate)}
              </span>
            )}
            <CalendarDays className="size-4" />
          </button>
        </DatePicker>
        <Kbd shortcut="enter" className="hidden shrink-0 sm:inline-flex" />
      </label>
    </div>
  )
}

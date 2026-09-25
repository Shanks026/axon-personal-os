import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Checklist for a task that doesn't exist yet (TaskDialog create mode): plain titles kept in the
 * dialog's state, saved as checklist todos once the task is created.
 */
export function StagedChecklist({ items, onChange }) {
  const [title, setTitle] = useState('')

  const add = () => {
    const trimmed = title.trim()
    if (!trimmed) return
    onChange([...items, trimmed])
    setTitle('')
  }

  return (
    <div className="mt-2 flex flex-col">
      {items.map((item, i) => (
        <div key={`${i}-${item}`} className="group/item flex h-8.5 items-center gap-2.5 px-1">
          <span className="ml-6 size-3.75 shrink-0 rounded-sm border border-border-strong" aria-hidden />
          <span className="min-w-0 flex-1 truncate">{item}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            aria-label={`Remove ${item}`}
            className="opacity-0 group-hover/item:opacity-100 focus-visible:opacity-100"
          >
            <X />
          </Button>
        </div>
      ))}
      <div className="flex h-8.5 items-center gap-2.5 px-1 text-faint">
        <Plus className="ml-6 size-3.5 shrink-0" aria-hidden />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
              e.preventDefault()
              add()
            }
          }}
          placeholder={items.length === 0 ? 'Break this task into steps' : 'Add item'}
          aria-label="Add checklist item"
          maxLength={500}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-faint"
        />
      </div>
    </div>
  )
}

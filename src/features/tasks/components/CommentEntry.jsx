import { useState } from 'react'
import { Ellipsis, Pencil, Trash2 } from 'lucide-react'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Kbd } from '@/components/shared/Kbd'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useDeleteTaskComment, useUpdateTaskComment } from '@/features/tasks/api'
import { ActivityTime } from '@/features/tasks/components/ActivityTime'
import { isEdited } from '@/features/tasks/utils'

/**
 * A manual work-log entry (design: a card labelled "Work log"): its text (line breaks kept), the
 * time, "edited" when changed later, and a menu to edit inline (Ctrl/Cmd+Enter saves, Esc
 * cancels) or delete (confirmed: it's permanent).
 */
export function CommentEntry({ entry }) {
  const update = useUpdateTaskComment()
  const remove = useDeleteTaskComment()
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(entry.body)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const save = () => {
    const body = text.trim()
    if (!body) return
    update.mutate({ id: entry.id, body }, { onSuccess: () => setEditing(false) })
  }

  return (
    <div className="relative flex items-start gap-3 py-1.5">
      <span className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full border bg-background text-space">
        <Pencil className="size-3.25" aria-hidden />
      </span>
      <div className="min-w-0 flex-1 rounded-lg border bg-card px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">Work log</span>
          <ActivityTime value={entry.created_at} />
          {isEdited(entry) && <span className="text-xs text-faint">· edited</span>}
          <div className="flex-1" />
          {!editing && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="-my-1 text-faint"
                  aria-label="Work log entry options"
                >
                  <Ellipsis />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuItem
                  onSelect={() => {
                    setText(entry.body)
                    setEditing(true)
                  }}
                >
                  <Pencil />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onSelect={() => setConfirmOpen(true)}>
                  <Trash2 />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        {editing ? (
          <div className="mt-1.5">
            <textarea
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault()
                  save()
                }
                if (e.key === 'Escape') setEditing(false)
              }}
              maxLength={5000}
              aria-label="Edit work log entry"
              className="field-sizing-content min-h-16 w-full resize-none bg-transparent leading-relaxed outline-none"
            />
            <div className="mt-1 flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={save} disabled={!text.trim() || update.isPending}>
                Save
                <Kbd shortcut="mod+enter" className="text-current opacity-60" />
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-1 leading-relaxed break-words whitespace-pre-wrap">{entry.body}</p>
        )}
      </div>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete this work log entry?"
        description="It will be removed permanently."
        confirmLabel="Delete"
        pending={remove.isPending}
        onConfirm={() => remove.mutate(entry.id, { onSuccess: () => setConfirmOpen(false) })}
      />
    </div>
  )
}

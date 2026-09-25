import { useState } from 'react'
import { Kbd } from '@/components/shared/Kbd'
import { Button } from '@/components/ui/button'
import { useAddTaskComment } from '@/features/tasks/api'

/**
 * The work-log composer at the bottom of the activity stream (design: "Log work or leave a note…
 * ⌘↵"). Ctrl/Cmd+Enter (or the button) adds the entry; the field clears and keeps focus.
 */
export function CommentComposer({ taskId }) {
  const add = useAddTaskComment()
  const [text, setText] = useState('')

  const submit = () => {
    const body = text.trim()
    if (!body || add.isPending) return
    add.mutate({ taskId, body }, { onSuccess: () => setText('') })
  }

  return (
    <div className="rounded-lg border bg-card px-3.5 py-2.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            submit()
          }
        }}
        maxLength={5000}
        placeholder="Log work or leave a note…"
        aria-label="Log work or leave a note"
        className="field-sizing-content min-h-10 w-full resize-none bg-transparent leading-relaxed outline-none placeholder:text-faint"
      />
      <div className="flex items-center justify-end gap-2">
        <Kbd shortcut="mod+enter" />
        <Button size="sm" onClick={submit} disabled={!text.trim() || add.isPending}>
          Add
        </Button>
      </div>
    </div>
  )
}

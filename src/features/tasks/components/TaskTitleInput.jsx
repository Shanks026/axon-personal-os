import { useState } from 'react'
import { TitleTextarea } from '@/components/shared/TitleTextarea'
import { useUpdateTask } from '@/features/tasks/api'

/**
 * The task's inline title on the detail page. Enter or blur saves (logging a `title` activity
 * entry); Esc reverts; an empty title reverts too, since a task always needs one.
 */
export function TaskTitleInput({ task }) {
  const update = useUpdateTask()
  const [title, setTitle] = useState(task.title)
  const [prevTitle, setPrevTitle] = useState(task.title)
  // Follow saves made elsewhere (the dialog), unless the user is mid-edit.
  if (task.title !== prevTitle) {
    setPrevTitle(task.title)
    setTitle(task.title)
  }

  const save = () => {
    const next = title.trim()
    if (!next) {
      setTitle(task.title)
      return
    }
    if (next !== task.title) update.mutate({ id: task.id, patch: { title: next } })
  }

  return (
    <TitleTextarea
      value={title}
      onChange={setTitle}
      onEnter={(e) => e.currentTarget.blur()}
      onEscape={(e) => {
        setTitle(task.title)
        // Revert first, then leave: blur would save the old value, which is a no-op.
        requestAnimationFrame(() => e.target.blur())
      }}
      onBlur={save}
      label="Task title"
      placeholder="Task title"
      maxLength={300}
      className="text-3xl leading-tight"
    />
  )
}

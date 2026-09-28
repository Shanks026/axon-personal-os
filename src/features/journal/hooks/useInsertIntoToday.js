import { useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { collectTaskMentionIds } from '@/features/links/utils'
import { appendToSection, completedTasksToBulletList } from '@/features/journal/utils'

/**
 * "Insert into Today" (design Journal.dc rail): appends a bullet list of task mention chips for
 * the given completed tasks under the entry's Today heading, skipping tasks the entry already
 * mentions. `setContent` emits an update, so autosave (and the mention sync) run as for typing.
 * Pass `onEditorReady` to the journal editor so this can reach the live instance.
 * @returns {{ onEditorReady: (editor) => void, insert: (tasks: Array<{ id: string, title: string }>) => void }}
 */
export function useInsertIntoToday() {
  const editorRef = useRef(null)

  const onEditorReady = useCallback((editor) => {
    editorRef.current = editor
  }, [])

  const insert = useCallback((tasks) => {
    const editor = editorRef.current
    if (!editor || editor.isDestroyed) return
    const doc = editor.getJSON()
    const list = completedTasksToBulletList(tasks, collectTaskMentionIds(doc))
    if (!list) {
      toast('Nothing new to insert', { description: 'Every completed task is already mentioned.' })
      return
    }
    editor.commands.setContent(appendToSection(doc, 'Today', [list]), { emitUpdate: true })
  }, [])

  return { onEditorReady, insert }
}

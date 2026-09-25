import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { noteKeys } from '@/features/notes/api'
import { taskKeys } from '@/features/tasks/api'

// tasks/api.js and notes/api.js invalidate `['links']` (linkKeys.all) by value: they can't import
// this module back without a cycle.
export const linkKeys = {
  all: ['links'],
  notesForTask: (taskId) => [...linkKeys.all, 'notes-for-task', taskId],
  tasksForNote: (noteId) => [...linkKeys.all, 'tasks-for-note', noteId],
}

/** A task's linked notes (live ones only), newest link first. */
export async function fetchNotesForTask(taskId) {
  const { data, error } = await supabase
    .from('note_task_links')
    .select(
      'source, created_at, note:notes!inner(id, space_id, title, excerpt, updated_at, deleted_at)',
    )
    .eq('task_id', taskId)
    .is('note.deleted_at', null)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

/** A note's linked tasks (live ones only), newest link first. */
export async function fetchTasksForNote(noteId) {
  const { data, error } = await supabase
    .from('note_task_links')
    .select(
      'source, created_at, task:tasks!inner(id, space_id, title, status, priority, due_date, completed_at, deleted_at)',
    )
    .eq('note_id', noteId)
    .is('task.deleted_at', null)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

/** Links a note and a task; an existing mention link (Phase 3) becomes manual. */
export async function linkNoteTask({ noteId, taskId }) {
  const { error } = await supabase
    .from('note_task_links')
    .upsert(
      { note_id: noteId, task_id: taskId, source: 'manual' },
      { onConflict: 'note_id,task_id' },
    )
  if (error) throw error
}

/** Removes a manual link (mention links follow the note's text, Phase 3). */
export async function unlinkNoteTask({ noteId, taskId }) {
  const { error } = await supabase
    .from('note_task_links')
    .delete()
    .eq('note_id', noteId)
    .eq('task_id', taskId)
    .eq('source', 'manual')
  if (error) throw error
}

export function useNotesForTask(taskId) {
  return useQuery({
    queryKey: linkKeys.notesForTask(taskId),
    queryFn: () => fetchNotesForTask(taskId),
    enabled: !!taskId,
  })
}

export function useTasksForNote(noteId) {
  return useQuery({
    queryKey: linkKeys.tasksForNote(noteId),
    queryFn: () => fetchTasksForNote(noteId),
    enabled: !!noteId,
  })
}

/** Both sides, the task's activity (the log trigger) and the list counts refresh. */
function useInvalidateLinks() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: linkKeys.all })
    qc.invalidateQueries({ queryKey: taskKeys.activities() })
    qc.invalidateQueries({ queryKey: taskKeys.lists() })
    qc.invalidateQueries({ queryKey: noteKeys.lists() })
  }
}

export function useLinkNoteTask() {
  const invalidate = useInvalidateLinks()
  return useMutation({
    mutationFn: linkNoteTask,
    onSuccess: invalidate,
    onError: (err) => toast.error(err.message ?? 'Could not link'),
  })
}

export function useUnlinkNoteTask() {
  const invalidate = useInvalidateLinks()
  return useMutation({
    mutationFn: unlinkNoteTask,
    onSuccess: invalidate,
    onError: (err) => toast.error(err.message ?? 'Could not unlink'),
  })
}

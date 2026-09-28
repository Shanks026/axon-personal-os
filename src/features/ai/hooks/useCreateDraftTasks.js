import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ensureTagIds, setTaskTags, tagKeys } from '@/features/tags/api'
import { createTask, taskKeys } from '@/features/tasks/api'
import { createChecklistItems, todoKeys } from '@/features/todos/api'

/**
 * "Create N tasks" from reviewed AI drafts (task dialog values, see `draftToTaskValues`), in the
 * given space. New tag names are created once each (first), then every task in order with its
 * tags and checklist, the same pieces the task dialog saves. A failure stops the run and says how
 * many were created. Resolves with the created rows.
 */
export function useCreateDraftTasks() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ spaceId, drafts, tags }) => {
      // Every new name once, up front, so two drafts asking for the same tag share it.
      const byLower = new Map(drafts.flatMap((d) => d.newTags).map((n) => [n.toLowerCase(), n]))
      const names = [...byLower.values()]
      const newIds = await ensureTagIds({ spaceId, names, tags })
      const idByName = new Map(names.map((n, i) => [n.toLowerCase(), newIds[i]]))

      const created = []
      try {
        for (const d of drafts) {
          const { newTags, tag_ids, checklist, ...values } = d
          const row = await createTask({ ...values, space_id: spaceId })
          const ids = [
            ...new Set([...tag_ids, ...newTags.map((n) => idByName.get(n.toLowerCase()))]),
          ]
          if (ids.length) await setTaskTags(row.id, ids)
          if (checklist.length) await createChecklistItems(row.id, spaceId, checklist)
          created.push(row)
        }
      } catch (err) {
        err.created = created.length
        throw err
      }
      return created
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: taskKeys.all })
      qc.invalidateQueries({ queryKey: tagKeys.all })
      qc.invalidateQueries({ queryKey: todoKeys.all })
    },
    onError: (err) => {
      const made = err.created ? ` (${err.created} created before it failed)` : ''
      toast.error(`${err.message ?? 'Could not create the tasks'}${made}`)
    },
  })
}

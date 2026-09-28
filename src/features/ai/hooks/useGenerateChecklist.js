import { useMutation, useQueryClient } from '@tanstack/react-query'
import { docToText } from '@/lib/richText'
import { htmlToDoc } from '@/components/editor/html'
import { aiKeys, invokeAi } from '@/features/ai/api'
import { fetchJiraComments, fetchJiraIssue } from '@/features/jira/api'

/**
 * "Generate checklist" (Feature 17 Phase 3): for a Jira task, the ticket's current description and
 * latest comments (fetched fresh, so edits made in Jira count); otherwise, or if Jira can't be
 * reached, the task's own saved description. Existing items go along so they aren't repeated.
 * Resolves `{ items, model, costUsd, source: 'jira' | 'task' }`. Errors are shown by the caller.
 */
export function useGenerateChecklist() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ task, existing, model }) => {
      let description = task.description_text ?? ''
      let comments = []
      let source = 'task'
      if (task.jira_key) {
        try {
          const [{ issue }, res] = await Promise.all([
            fetchJiraIssue(task.jira_key),
            fetchJiraComments(task.jira_key),
          ])
          description = docToText(htmlToDoc(issue.descriptionHtml)) || description
          comments = res.comments ?? []
          source = 'jira'
        } catch {
          // Jira unavailable (not connected, token expired): fall back on the saved description.
        }
      }
      const res = await invokeAi('checklist', {
        title: task.title,
        description,
        comments,
        existing,
        model,
      })
      return { ...res, source }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: [...aiKeys.all, 'usage'] }),
  })
}

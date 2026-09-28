import { Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { usePreferences } from '@/features/settings/api'
import { useRecentTaggedTasks } from '@/features/tasks/api'
import { useAiStatus, useSuggestTags } from '@/features/ai/api'
import { availableModels, modelFor, tagExamples } from '@/features/ai/utils'

/**
 * "Suggest tags" (Feature 17): asks the AI for tags from the space's existing ones, using the
 * form's current title and description and the space's recent tagging as examples, then adds
 * them (`formApi.addTagIds`). Only on click: it's slower than keyword matching and sends the text
 * to the AI provider. Uses the Task drafting model.
 * @param {{ formApi: { spaceId: string, spaceTags: object[], getText: () => { title: string, description: string }, addTagIds: (ids: string[]) => number } }} props
 */
export function SuggestTagsButton({ formApi }) {
  const { aiSettings } = usePreferences()
  const status = useAiStatus()
  const suggest = useSuggestTags()
  const { data: tagged = [] } = useRecentTaggedTasks(formApi.spaceId)
  if (status.data && !status.data.configured) return null

  const run = () => {
    const { title, description } = formApi.getText()
    const tags = formApi.spaceTags
    suggest.mutate(
      {
        title,
        description,
        model: modelFor('draft_tasks', aiSettings, availableModels(status.data)),
        context: { tags: tags.map((t) => t.name), examples: tagExamples(tagged, tags) },
      },
      {
        onSuccess: (res) => {
          const byName = new Map(tags.map((t) => [t.name.toLowerCase(), t.id]))
          const ids = res.tags.map((n) => byName.get(n.toLowerCase())).filter(Boolean)
          const added = formApi.addTagIds(ids)
          toast(added ? `Added ${added} tag${added === 1 ? '' : 's'}` : 'No new tags suggested')
        },
        onError: (err) => toast.error(err.message ?? 'Couldn’t suggest tags'),
      },
    )
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="xs"
      onClick={run}
      disabled={suggest.isPending}
      className="text-muted-foreground"
    >
      {suggest.isPending ? <Loader2 className="animate-spin" /> : <Sparkles />}
      {suggest.isPending ? 'Suggesting…' : 'Suggest tags'}
    </Button>
  )
}

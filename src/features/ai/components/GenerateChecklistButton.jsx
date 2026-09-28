import { useState } from 'react'
import { CircleAlert, Loader2, RotateCw, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { usePreferences } from '@/features/settings/api'
import { useCreateChecklistItems } from '@/features/todos/api'
import { useAiStatus } from '@/features/ai/api'
import { AiNotConfigured } from '@/features/ai/components/AiNotConfigured'
import { useGenerateChecklist } from '@/features/ai/hooks/useGenerateChecklist'
import { availableModels, modelFor } from '@/features/ai/utils'

/**
 * "Generate" in a task's checklist header (Feature 17 Phase 3): opens a popover and asks the AI
 * for checklist items from the task (its Jira ticket and comments when it has a key). Nothing is
 * added until the user reviews the list (untick, edit) and clicks "Add N items"; they're appended
 * after the existing items. Only runs on click.
 * @param {{ task: { id: string, space_id: string, title: string, description_text?: string, jira_key?: string }, existingItems: { title: string, position: number }[] }} props
 */
export function GenerateChecklistButton({ task, existingItems }) {
  const { aiSettings } = usePreferences()
  const status = useAiStatus()
  const generate = useGenerateChecklist()
  const add = useCreateChecklistItems()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([]) // [{ text, keep }]

  const run = () => {
    setItems([])
    generate.mutate(
      {
        task,
        existing: existingItems.map((t) => t.title),
        model: modelFor('checklist', aiSettings, availableModels(status.data)),
      },
      { onSuccess: (res) => setItems(res.items.map((text) => ({ text, keep: true }))) },
    )
  }

  const onOpenChange = (next) => {
    setOpen(next)
    if (next && !generate.isPending) run()
  }

  const chosen = items.filter((i) => i.keep && i.text.trim())
  const addItems = () => {
    const after = Math.max(0, ...existingItems.map((t) => t.position ?? 0))
    add.mutate(
      {
        taskId: task.id,
        spaceId: task.space_id,
        titles: chosen.map((i) => i.text.trim().slice(0, 300)),
        afterPosition: after,
      },
      {
        onSuccess: () => {
          toast.success(`Added ${chosen.length} item${chosen.length === 1 ? '' : 's'}`)
          setOpen(false)
        },
      },
    )
  }

  const notConfigured =
    status.data?.configured === false || generate.error?.code === 'ai_not_configured'
  const source = generate.data?.source

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="xs" className="text-muted-foreground">
          <Sparkles />
          Generate
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="border-b px-4 py-3">
          <p className="font-medium">Suggested checklist</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {generate.isPending
              ? task.jira_key
                ? `Reading ${task.jira_key} and its comments…`
                : 'Reading the task…'
              : source === 'jira'
                ? `From ${task.jira_key}’s description and comments. Review before adding.`
                : 'From the task’s description. Review before adding.'}
          </p>
        </div>

        <div className="max-h-80 overflow-y-auto px-2 py-2">
          {notConfigured ? (
            <AiNotConfigured className="m-2" />
          ) : generate.isPending ? (
            <div className="flex flex-col gap-3 px-2 py-2" aria-hidden>
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : generate.error ? (
            <p role="alert" className="flex items-start gap-1.5 px-2 py-2 text-xs text-destructive">
              <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
              {generate.error.message}
            </p>
          ) : items.length === 0 ? (
            <p className="px-2 py-2 text-muted-foreground">
              Nothing new to add: the checklist already covers it, or the task has too little
              detail.
            </p>
          ) : (
            items.map((item, i) => (
              <div key={i} className="flex items-start gap-2.5 rounded-md px-2 py-1.5">
                <Checkbox
                  checked={item.keep}
                  onCheckedChange={(v) =>
                    setItems((list) =>
                      list.map((x, j) => (j === i ? { ...x, keep: v === true } : x)),
                    )
                  }
                  aria-label={`Keep “${item.text}”`}
                  className="mt-0.5"
                />
                <input
                  value={item.text}
                  onChange={(e) =>
                    setItems((list) =>
                      list.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)),
                    )
                  }
                  aria-label="Checklist item"
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                />
              </div>
            ))
          )}
        </div>

        <div className="flex items-center gap-2 border-t px-3 py-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={run}
            disabled={generate.isPending || notConfigured}
          >
            <RotateCw />
            Regenerate
          </Button>
          <div className="flex-1" />
          <Button
            type="button"
            size="sm"
            onClick={addItems}
            disabled={!chosen.length || add.isPending || generate.isPending}
          >
            {add.isPending && <Loader2 className="animate-spin" />}
            Add {chosen.length} item{chosen.length === 1 ? '' : 's'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

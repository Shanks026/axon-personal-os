import { useState } from 'react'
import { ArrowLeft, Loader2, Sparkles, X } from 'lucide-react'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useSpace } from '@/context/SpaceContext'
import { staggerItem } from '@/components/motion/presets'
import { markdownToDoc } from '@/components/editor/markdown'
import { Kbd } from '@/components/shared/Kbd'
import { Button } from '@/components/ui/button'
import { DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { usePreferences } from '@/features/settings/api'
import { useTags } from '@/features/tags/api'
import { useRecentTaggedTasks, useTaskVersions } from '@/features/tasks/api'
import { useAiStatus, useDraftTasks } from '@/features/ai/api'
import { AiDraftCard } from '@/features/ai/components/AiDraftCard'
import { AiNotConfigured } from '@/features/ai/components/AiNotConfigured'
import { AiTaskComposer } from '@/features/ai/components/AiTaskComposer'
import { ModelPicker } from '@/features/ai/components/ModelPicker'
import { AI_MAX_INPUT, AI_MODEL_MAP } from '@/features/ai/constants'
import { useCreateDraftTasks } from '@/features/ai/hooks/useCreateDraftTasks'
import {
  availableModels,
  buildDraftContext,
  draftToTaskValues,
  formatCost,
  modelFor,
} from '@/features/ai/utils'

const item = staggerItem()

/**
 * The task dialog's "Describe with AI" view (Feature 17 Phase 1). Describe one task or several;
 * one draft goes to the normal form (`onSingleDraft(values, meta)`) for review, several become
 * editable cards created together. Drafts land in `spaceId` (the dialog's fixed space) and use
 * its tags and versions. `headerExtra` is the dialog's Form / Describe with AI switch.
 */
export function AiTaskPanel({ spaceId, headerExtra, onClose, onSingleDraft, onCreated }) {
  const { spaceById } = useSpace()
  const { timezone, weekStartsOn, fyStartMonth, aiSettings } = usePreferences()
  const status = useAiStatus()
  const draft = useDraftTasks()
  const createDrafts = useCreateDraftTasks()
  const { data: tags = [] } = useTags({ spaceIds: spaceId ? [spaceId] : [] })
  const { data: versions = [] } = useTaskVersions({ spaceIds: spaceId ? [spaceId] : [] })
  const { data: taggedTasks = [] } = useRecentTaggedTasks(spaceId)
  const [text, setText] = useState('')
  // The user's pick, else the job's default among the usable models (known once status loads).
  const [picked, setPicked] = useState(null)
  const [drafts, setDrafts] = useState(null) // [{ key, included, value }] once there are several
  const [meta, setMeta] = useState(null)
  const [empty, setEmpty] = useState(false)

  const model = picked ?? modelFor('draft_tasks', aiSettings, availableModels(status.data))
  const notConfigured =
    status.data?.configured === false || draft.error?.code === 'ai_not_configured'
  const canGenerate = !!text.trim() && text.length <= AI_MAX_INPUT && !draft.isPending

  const generate = () => {
    setEmpty(false)
    draft.mutate(
      {
        text,
        model,
        context: buildDraftContext({
          timezone,
          weekStartsOn,
          fyStartMonth,
          spaceName: spaceById.get(spaceId)?.name,
          tags,
          versions,
          taggedTasks,
        }),
      },
      {
        onSuccess: (res) => {
          const values = res.tasks.map((t) => draftToTaskValues(t, { tags, toDoc: markdownToDoc }))
          const info = { model: res.model, costUsd: res.costUsd }
          if (values.length === 0) setEmpty(true)
          else if (values.length === 1) onSingleDraft(values[0], info)
          else {
            setMeta(info)
            setDrafts(
              values.map((value, i) => ({ key: `${i}-${value.title}`, included: true, value })),
            )
          }
        },
      },
    )
  }

  const patchDraft = (key, patch) =>
    setDrafts((list) => list.map((d) => (d.key === key ? { ...d, ...patch } : d)))
  const chosen = drafts?.filter((d) => d.included) ?? []
  const invalid = chosen.some((d) => !d.value.title.trim())

  const createAll = () =>
    createDrafts.mutate(
      { spaceId, drafts: chosen.map((d) => d.value), tags },
      {
        onSuccess: (rows) => {
          toast.success(`Created ${rows.length} task${rows.length === 1 ? '' : 's'}`)
          onCreated?.(rows)
          onClose()
        },
      },
    )

  const error = draft.error && draft.error.code !== 'ai_not_configured' ? draft.error.message : null

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-start gap-3 px-5 pt-5 pb-1">
        <div className="min-w-0 flex-1">
          <DialogHeader>
            <DialogTitle>New task</DialogTitle>
            <DialogDescription>
              Describe the work in your own words and review the drafts before saving.
            </DialogDescription>
          </DialogHeader>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X />
        </Button>
      </div>
      {headerExtra && <div className="shrink-0 px-5 pt-3">{headerExtra}</div>}

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-4 pb-5">
        {notConfigured ? (
          <AiNotConfigured />
        ) : drafts ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground">
              {drafts.length} drafts by {AI_MODEL_MAP[meta?.model]?.label ?? meta?.model} ·{' '}
              {formatCost(meta?.costUsd)}. Edit, untick or remove any, then create them.
            </p>
            {drafts.map((d, i) => (
              <motion.div
                key={d.key}
                variants={item}
                custom={i}
                initial="initial"
                animate="animate"
              >
                <AiDraftCard
                  value={d.value}
                  tags={tags}
                  included={d.included}
                  onIncludedChange={(included) => patchDraft(d.key, { included })}
                  onChange={(patch) => patchDraft(d.key, { value: { ...d.value, ...patch } })}
                  onRemove={() => setDrafts((list) => list.filter((x) => x.key !== d.key))}
                />
              </motion.div>
            ))}
          </div>
        ) : (
          <>
            <AiTaskComposer
              value={text}
              onChange={setText}
              onSubmit={generate}
              pending={draft.isPending}
              error={error}
            />
            {empty && (
              <p className="mt-2 text-xs text-muted-foreground">
                Nothing to create from that. Try adding more detail.
              </p>
            )}
          </>
        )}
      </div>

      <div className="flex h-13 shrink-0 items-center gap-2.5 border-t px-4">
        {drafts ? (
          <>
            <Button type="button" variant="ghost" onClick={() => setDrafts(null)}>
              <ArrowLeft />
              Back
            </Button>
            <div className="flex-1" />
            <Button
              type="button"
              onClick={createAll}
              disabled={!chosen.length || invalid || createDrafts.isPending}
            >
              {createDrafts.isPending && <Loader2 className="animate-spin" />}
              Create {chosen.length} task{chosen.length === 1 ? '' : 's'}
            </Button>
          </>
        ) : (
          <>
            <ModelPicker value={model} onChange={setPicked} disabled={notConfigured} />
            <div className="flex-1" />
            <Button
              type="button"
              onClick={generate}
              disabled={!canGenerate || notConfigured}
              className={cn(draft.isPending && 'cursor-progress')}
            >
              {draft.isPending ? <Loader2 className="animate-spin" /> : <Sparkles />}
              {draft.isPending ? 'Drafting…' : 'Generate'}
              {!draft.isPending && <Kbd shortcut="mod+enter" className="text-current opacity-60" />}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

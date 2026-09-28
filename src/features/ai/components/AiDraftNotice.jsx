import { Sparkles } from 'lucide-react'
import { AI_MODEL_MAP } from '@/features/ai/constants'
import { formatCost } from '@/features/ai/utils'

/** Above the form after a single AI draft: which model wrote it and what it cost. */
export function AiDraftNotice({ info }) {
  return (
    <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
      <Sparkles className="size-3.5" aria-hidden />
      Drafted by {AI_MODEL_MAP[info.model]?.label ?? info.model} · {formatCost(info.costUsd)} ·
      review before saving
    </p>
  )
}

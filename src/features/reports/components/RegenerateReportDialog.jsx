import { useState } from 'react'
import { toast } from 'sonner'
import { useSpace } from '@/context/SpaceContext'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useAiStatus } from '@/features/ai/api'
import { ModelPicker } from '@/features/ai/components/ModelPicker'
import { availableModels, modelFor } from '@/features/ai/utils'
import { useGenerateReport } from '@/features/reports/api'
import { buildReportRequest, reportJob, reportPeriod } from '@/features/reports/utils'
import { usePreferences } from '@/features/settings/api'

/**
 * "Replace the report with a new draft?": regenerates `report` for the same period and scope with
 * the chosen model (the job's default until changed). `beforeRun` (the editor's autosave flush)
 * runs first. The function updates the row; the new `generated_at` remounts the editor.
 */
export function RegenerateReportDialog({ open, onOpenChange, report, beforeRun }) {
  const { activeSpaces } = useSpace()
  const { fyStartMonth, timezone, aiSettings } = usePreferences()
  const status = useAiStatus()
  const generate = useGenerateReport()
  const [model, setModel] = useState(null)

  const period = reportPeriod(report, fyStartMonth)
  const chosenModel = model ?? modelFor(reportJob(period), aiSettings, availableModels(status.data))

  const run = async () => {
    await beforeRun?.()
    generate.mutate(
      buildReportRequest({
        period,
        timezone,
        spaceIds: report.space_id ? [report.space_id] : activeSpaces.map((s) => s.id),
        spaceId: report.space_id,
        model: chosenModel,
        reportId: report.id,
      }),
      {
        onSuccess: () => {
          onOpenChange(false)
          toast.success('Report regenerated')
        },
      },
    )
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) generate.reset()
      }}
      title="Replace the report with a new draft?"
      description={`The AI reads ${period.label} again and rewrites the body. Your edits to it are replaced; the title stays.`}
      confirmLabel="Regenerate"
      destructive={false}
      pending={generate.isPending}
      onConfirm={run}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground">Model</span>
          <ModelPicker value={chosenModel} onChange={setModel} disabled={generate.isPending} />
        </div>
        {generate.isPending && (
          <p className="text-xs text-muted-foreground" role="status">
            Reading your work… this can take a minute on the free model.
          </p>
        )}
        {generate.error && (
          <p role="alert" className="text-xs text-destructive">
            {generate.error.message}
          </p>
        )}
      </div>
    </ConfirmDialog>
  )
}

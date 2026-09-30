import { useEffect, useRef, useState } from 'react'
import { CircleAlert, Loader2, X } from 'lucide-react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { todayISO } from '@/lib/dates'
import { useSpace } from '@/context/SpaceContext'
import { Kbd } from '@/components/shared/Kbd'
import { SpaceIcon } from '@/components/shared/SpaceIcon'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAiStatus } from '@/features/ai/api'
import { AiNotConfigured } from '@/features/ai/components/AiNotConfigured'
import { ModelPicker } from '@/features/ai/components/ModelPicker'
import { availableModels, modelFor } from '@/features/ai/utils'
import { useGenerateReport } from '@/features/reports/api'
import { ReportFieldRow } from '@/features/reports/components/ReportFieldRow'
import { ReportPeriodFields } from '@/features/reports/components/ReportPeriodFields'
import { useReportPeriod } from '@/features/reports/hooks/useReportPeriod'
import { buildReportRequest, reportJob } from '@/features/reports/utils'
import { usePreferences } from '@/features/settings/api'
import { useSpacePaths } from '@/features/spaces/hooks/useSpacePaths'

/**
 * Generate report (Feature 17 Phase 5): pick a fiscal quarter, a week or a custom range, and a
 * model, then the `ai` function reads the period's work and saves the report. The mutation lives
 * here (outside the dialog body), so closing the dialog mid-generation doesn't lose the result:
 * it opens the report if the dialog is still open, or offers it in a toast.
 */
export function GenerateReportDialog({ open, onOpenChange }) {
  const navigate = useNavigate()
  const p = useSpacePaths()
  const generate = useGenerateReport()
  const openRef = useRef(open)
  useEffect(() => {
    openRef.current = open
  }, [open])

  const submit = (payload, label) =>
    generate.mutate(payload, {
      onSuccess: ({ report }) => {
        if (openRef.current) {
          onOpenChange(false)
          navigate(p.report(report.id))
        } else {
          toast.success('Report ready', {
            description: label,
            action: { label: 'Open', onClick: () => navigate(p.report(report.id)) },
          })
        }
      },
      onError: (err) => {
        if (!openRef.current) toast.error(err.message ?? 'Could not generate the report')
      },
    })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-dialog flex-col gap-0 overflow-hidden p-0 will-change-transform sm:max-w-120"
      >
        <GenerateReportBody
          onClose={() => onOpenChange(false)}
          onSubmit={submit}
          pending={generate.isPending}
          error={generate.error}
          resetError={generate.reset}
        />
      </DialogContent>
    </Dialog>
  )
}

function GenerateReportBody({ onClose, onSubmit, pending, error, resetError }) {
  const { isGlobal, space, scopeSpaceIds } = useSpace()
  const { fyStartMonth, weekStartsOn, timezone, aiSettings } = usePreferences()
  const status = useAiStatus()
  const today = todayISO(timezone)
  const periodState = useReportPeriod({ today, fyStartMonth, weekStartsOn })
  const { period } = periodState
  const [model, setModel] = useState(null)

  // The job's default model until the user picks one.
  const chosenModel = model ?? modelFor(reportJob(period), aiSettings, availableModels(status.data))
  const notConfigured = status.data?.configured === false || error?.code === 'ai_not_configured'

  const run = () => {
    if (!period || pending) return
    resetError()
    onSubmit(
      buildReportRequest({
        period,
        timezone,
        spaceIds: scopeSpaceIds,
        spaceId: isGlobal ? null : space?.id,
        model: chosenModel,
      }),
      period.label,
    )
  }

  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault()
          run()
        }
      }}
    >
      <div className="flex shrink-0 items-start gap-3 px-5 pt-5 pb-1">
        <div className="min-w-0 flex-1">
          <DialogHeader>
            <DialogTitle>Generate report</DialogTitle>
            <DialogDescription>
              AI reads the period’s tasks, status changes and journal, and drafts a report you can
              edit.
            </DialogDescription>
          </DialogHeader>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
          <X />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-4 pb-5">
        {notConfigured ? (
          <AiNotConfigured />
        ) : (
          <div className="flex flex-col gap-4">
            <ReportPeriodFields state={periodState} weekStartsOn={weekStartsOn} />

            <ReportFieldRow label="Scope">
              {isGlobal ? (
                <span>All spaces</span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <SpaceIcon icon={space?.icon} size="xs" />
                  {space?.name}
                </span>
              )}
            </ReportFieldRow>

            <ReportFieldRow label="Model">
              <ModelPicker value={chosenModel} onChange={setModel} disabled={pending} />
            </ReportFieldRow>

            {pending && (
              <p className="text-xs text-muted-foreground" role="status">
                Reading your work for {period?.label}… this can take a minute on the free model. You
                can close this; the report is saved when it’s ready.
              </p>
            )}
            {error && !notConfigured && (
              <p role="alert" className="flex items-start gap-1.5 text-xs text-destructive">
                <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
                {error.message}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex h-13 shrink-0 items-center gap-2 border-t px-4">
        <div className="flex-1" />
        <Button type="button" variant="outline" onClick={onClose}>
          {pending ? 'Close' : 'Cancel'}
        </Button>
        <Button type="button" onClick={run} disabled={!period || pending || notConfigured}>
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          Generate
          <Kbd shortcut="mod+enter" className="text-current opacity-60" />
        </Button>
      </div>
    </div>
  )
}

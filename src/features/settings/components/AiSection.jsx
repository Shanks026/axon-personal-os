import { CircleCheck } from 'lucide-react'
import { todayISO, zonedInstant } from '@/lib/dates'
import { Skeleton } from '@/components/ui/skeleton'
import { useAiMonthUsage, useAiStatus } from '@/features/ai/api'
import { AiNotConfigured } from '@/features/ai/components/AiNotConfigured'
import { ModelPicker } from '@/features/ai/components/ModelPicker'
import { AI_JOBS } from '@/features/ai/constants'
import { formatCost, modelFor } from '@/features/ai/utils'
import { usePreferences, useUpdateMyProfile } from '@/features/settings/api'
import { SettingsCard, SettingsRow } from '@/features/settings/components/SettingsCard'

/**
 * Settings → AI & integrations (Feature 17): whether the Anthropic key is set, the default model
 * per job (saved in `profiles.ai_settings`), and this month's spend from `ai_usage`. Jira joins
 * this page in Phase 2.
 */
export function AiSection() {
  const { timezone, aiSettings } = usePreferences()
  const update = useUpdateMyProfile()
  const status = useAiStatus()
  const since = zonedInstant(`${todayISO(timezone).slice(0, 8)}01`, '00:00', timezone).toISOString()
  const usage = useAiMonthUsage({ since })

  const setModel = (job, model) =>
    update.mutate({
      ai_settings: { ...aiSettings, models: { ...aiSettings.models, [job]: model } },
    })

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h2 className="font-medium">Claude</h2>
        {status.isLoading ? (
          <Skeleton className="h-16 rounded-xl" />
        ) : status.data?.configured ? (
          <SettingsCard>
            <SettingsRow
              label="Status"
              description="Requests go from a Supabase Edge Function to Anthropic; the key never reaches the browser."
            >
              <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                <CircleCheck className="size-4" aria-hidden />
                Connected
              </span>
            </SettingsRow>
            <SettingsRow label="This month" description="Cost of your AI requests so far.">
              <span className="font-mono text-sm tabular-nums">
                {usage.data
                  ? `${formatCost(usage.data.costUsd)} · ${usage.data.requests} request${usage.data.requests === 1 ? '' : 's'}`
                  : '—'}
              </span>
            </SettingsRow>
          </SettingsCard>
        ) : status.error && status.error.code !== 'ai_not_configured' ? (
          <p className="text-sm text-destructive">{status.error.message}</p>
        ) : (
          <AiNotConfigured showSettingsLink={false} />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium">Default models</h2>
        <SettingsCard>
          {AI_JOBS.map((job) => (
            <SettingsRow key={job.id} label={job.label} description={job.description}>
              <ModelPicker
                value={modelFor(job.id, aiSettings)}
                onChange={(model) => setModel(job.id, model)}
                size="default"
                label={`${job.label} model`}
              />
            </SettingsRow>
          ))}
        </SettingsCard>
        <p className="text-xs text-muted-foreground">
          AI requests send what you type, plus the space’s tag and version names, to Anthropic. You
          can still pick another model on each request.
        </p>
      </section>
    </div>
  )
}

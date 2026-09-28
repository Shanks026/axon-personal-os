import { CircleCheck, CircleDashed } from 'lucide-react'
import { todayISO, zonedInstant } from '@/lib/dates'
import { Skeleton } from '@/components/ui/skeleton'
import { useAiMonthUsage, useAiStatus } from '@/features/ai/api'
import { AiNotConfigured } from '@/features/ai/components/AiNotConfigured'
import { ModelPicker } from '@/features/ai/components/ModelPicker'
import { AI_JOBS, AI_PROVIDERS } from '@/features/ai/constants'
import { availableModels, formatCost, modelFor } from '@/features/ai/utils'
import { JiraSettings } from '@/features/jira/components/JiraSettings'
import { usePreferences, useUpdateMyProfile } from '@/features/settings/api'
import { SettingsCard, SettingsRow } from '@/features/settings/components/SettingsCard'

const PROVIDER_NOTES = {
  gemini:
    'Free tier: no card needed, with per-minute and daily limits. Google may use free-tier prompts to improve its products.',
  anthropic: 'Not set up (the card payment failed). Add ANTHROPIC_API_KEY later to enable Claude.',
}

function ProviderStatus({ connected }) {
  return connected ? (
    <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
      <CircleCheck className="size-4" aria-hidden />
      Connected
    </span>
  ) : (
    <span className="flex items-center gap-1.5 text-muted-foreground">
      <CircleDashed className="size-4" aria-hidden />
      No key
    </span>
  )
}

/**
 * Settings → AI & integrations (Feature 17): each provider's key status (Gemini on the free tier
 * now; Claude until its key is added), the default model per job (saved in `profiles.ai_settings`;
 * models without a key are disabled), this month's usage from `ai_usage`, and the Jira settings
 * (Phase 2).
 */
export function AiSection() {
  const { timezone, aiSettings } = usePreferences()
  const update = useUpdateMyProfile()
  const status = useAiStatus()
  const since = zonedInstant(`${todayISO(timezone).slice(0, 8)}01`, '00:00', timezone).toISOString()
  const usage = useAiMonthUsage({ since })
  const available = availableModels(status.data)

  const setModel = (job, model) =>
    update.mutate({
      ai_settings: { ...aiSettings, models: { ...aiSettings.models, [job]: model } },
    })

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h2 className="font-medium">Providers</h2>
        {status.isLoading ? (
          <Skeleton className="h-32 rounded-xl" />
        ) : status.error ? (
          <p className="text-sm text-destructive">{status.error.message}</p>
        ) : (
          <>
            {!status.data?.configured && <AiNotConfigured showSettingsLink={false} />}
            <SettingsCard>
              {Object.entries(AI_PROVIDERS).map(([id, p]) => (
                <SettingsRow key={id} label={p.label} description={PROVIDER_NOTES[id]}>
                  <ProviderStatus connected={!!status.data?.providers?.[id]} />
                </SettingsRow>
              ))}
              <SettingsRow
                label="This month"
                description="Requests so far. Keys stay in a Supabase Edge Function and never reach the browser."
              >
                <span className="font-mono text-sm whitespace-nowrap tabular-nums">
                  {usage.data
                    ? `${formatCost(usage.data.costUsd)} · ${usage.data.requests} request${usage.data.requests === 1 ? '' : 's'}`
                    : '—'}
                </span>
              </SettingsRow>
            </SettingsCard>
          </>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-medium">Default models</h2>
        <SettingsCard>
          {AI_JOBS.map((job) => (
            <SettingsRow key={job.id} label={job.label} description={job.description}>
              <ModelPicker
                value={modelFor(job.id, aiSettings, available)}
                onChange={(model) => setModel(job.id, model)}
                size="default"
                label={`${job.label} model`}
              />
            </SettingsRow>
          ))}
        </SettingsCard>
        <p className="text-xs text-muted-foreground">
          AI requests send what you type, plus the space’s tag and version names, to the chosen
          provider. You can still pick another model on each request.
        </p>
      </section>

      <JiraSettings />
    </div>
  )
}

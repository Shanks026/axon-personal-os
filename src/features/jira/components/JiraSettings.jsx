import { useState } from 'react'
import { CircleCheck, CircleDashed, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { usePreferences, useUpdateMyProfile } from '@/features/settings/api'
import { SettingsCard, SettingsRow } from '@/features/settings/components/SettingsCard'
import { TASK_PRIORITIES, TASK_STATUSES } from '@/features/tasks/constants'
import { useJiraMeta, useJiraStatus, useTestJiraConnection } from '@/features/jira/api'
import { JiraTagKeywords } from '@/features/jira/components/JiraTagKeywords'
import { JIRA_SITE_PLACEHOLDER } from '@/features/jira/constants'
import { mapPriority, mapStatus } from '@/features/jira/utils'

const SITE = /^https:\/\/[a-z0-9-]+\.atlassian\.net$/i
const NO_FIELD = '__none__'

function MapSelect({ value, onChange, options, label }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger size="sm" aria-label={label} className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end" position="popper">
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/**
 * Settings → AI & integrations → Jira (Feature 17 Phase 2): the Jira Cloud site, whether the
 * account secrets are set, "Test connection", the start-date field, and how Jira statuses and
 * priorities map onto Axon's (saved in `profiles.jira_settings`; unset rows use the defaults), and
 * the tag keywords that tag imported tickets.
 */
export function JiraSettings() {
  const { jiraSettings } = usePreferences()
  const update = useUpdateMyProfile()
  const status = useJiraStatus({ site: jiraSettings.site })
  const test = useTestJiraConnection()
  const configured = !!status.data?.configured
  const meta = useJiraMeta({ site: jiraSettings.site, enabled: configured })
  const [site, setSite] = useState(jiraSettings.site ?? '')
  const [siteError, setSiteError] = useState(null)

  const save = (patch) => update.mutate({ jira_settings: { ...jiraSettings, ...patch } })

  const saveSite = () => {
    const value = site.trim().replace(/\/+$/, '')
    if (value === (jiraSettings.site ?? '')) return
    if (value && !SITE.test(value)) {
      setSiteError('Use your Jira Cloud address, like https://your-company.atlassian.net')
      return
    }
    setSiteError(null)
    setSite(value)
    save({ site: value || null })
  }

  const setMapEntry = (mapName, jiraName, axonValue) =>
    save({ [mapName]: { ...(jiraSettings[mapName] ?? {}), [jiraName]: axonValue } })

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-medium">Jira</h2>
      <SettingsCard>
        <SettingsRow
          label="Site"
          htmlFor="jira-site"
          description="Your Jira Cloud address. Import is read-only. A ticket's attachments are copied into Axon after the task is saved (they count toward the free plan's 1 GB); videos and files over 50 MB stay in Jira as links."
        >
          <div className="flex w-72 flex-col items-end gap-1">
            <Input
              id="jira-site"
              value={site}
              onChange={(e) => setSite(e.target.value)}
              onBlur={saveSite}
              onKeyDown={(e) => e.key === 'Enter' && saveSite()}
              placeholder={JIRA_SITE_PLACEHOLDER}
              aria-invalid={!!siteError || undefined}
              className="font-mono text-sm"
            />
            {siteError && <p className="text-xs text-destructive">{siteError}</p>}
          </div>
        </SettingsRow>
        <SettingsRow
          label="Account"
          description={
            status.data?.hasCredentials
              ? 'JIRA_EMAIL and JIRA_API_TOKEN are set in Supabase (Edge Functions → Secrets).'
              : 'Add JIRA_EMAIL and JIRA_API_TOKEN in Supabase → Edge Functions → Secrets.'
          }
        >
          {status.isLoading ? (
            <Skeleton className="h-5 w-20" />
          ) : status.data?.hasCredentials ? (
            <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
              <CircleCheck className="size-4" aria-hidden />
              Set
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <CircleDashed className="size-4" aria-hidden />
              Not set
            </span>
          )}
        </SettingsRow>
        <SettingsRow
          label="Connection"
          description={
            test.data?.account
              ? `Connected as ${test.data.account.name ?? 'your account'}${test.data.account.email ? ` (${test.data.account.email})` : ''}.`
              : test.error
                ? test.error.message
                : 'Checks the site, email and token against Jira.'
          }
        >
          <Button
            variant="outline"
            size="sm"
            disabled={!configured || test.isPending}
            onClick={() => test.mutate()}
          >
            {test.isPending && <Loader2 className="animate-spin" />}
            Test connection
          </Button>
        </SettingsRow>
        {configured && (
          <SettingsRow
            label="Start date field"
            description="Jira has no built-in start date; pick the custom field your site uses."
          >
            {meta.isLoading ? (
              <Skeleton className="h-7 w-40" />
            ) : (
              <MapSelect
                label="Start date field"
                value={jiraSettings.startDateField ?? NO_FIELD}
                onChange={(v) => save({ startDateField: v === NO_FIELD ? null : v })}
                options={[
                  { value: NO_FIELD, label: 'None' },
                  ...(meta.data?.dateFields ?? []).map((f) => ({ value: f.id, label: f.name })),
                ]}
              />
            )}
          </SettingsRow>
        )}
      </SettingsCard>
      {meta.error && <p className="text-sm text-destructive">{meta.error.message}</p>}

      {configured && meta.data && (
        <>
          <h3 className="mt-2 text-sm font-medium">Statuses</h3>
          <SettingsCard>
            {meta.data.statuses.map((s) => (
              <SettingsRow key={s.name} label={s.name}>
                <MapSelect
                  label={`${s.name} maps to`}
                  value={mapStatus(s, jiraSettings.statusMap)}
                  onChange={(v) => setMapEntry('statusMap', s.name, v)}
                  options={TASK_STATUSES.map((t) => ({ value: t.value, label: t.label }))}
                />
              </SettingsRow>
            ))}
          </SettingsCard>
          <h3 className="mt-2 text-sm font-medium">Priorities</h3>
          <SettingsCard>
            {meta.data.priorities.map((name) => (
              <SettingsRow key={name} label={name}>
                <MapSelect
                  label={`${name} maps to`}
                  value={mapPriority(name, jiraSettings.priorityMap)}
                  onChange={(v) => setMapEntry('priorityMap', name, v)}
                  options={TASK_PRIORITIES.map((t) => ({ value: t.value, label: t.label }))}
                />
              </SettingsRow>
            ))}
          </SettingsCard>
        </>
      )}
      <JiraTagKeywords />
    </section>
  )
}

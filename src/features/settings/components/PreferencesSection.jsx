import { useMemo } from 'react'
import { format } from 'date-fns'
import { formatQuarter, getFiscalQuarter, quarterMonthsLabel } from '@/lib/fiscal'
import { cn } from '@/lib/utils'
import { SegmentedControl } from '@/components/shared/SegmentedControl'
import { useTheme } from '@/components/theme/useTheme'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { usePreferences, useUpdateMyProfile } from '@/features/settings/api'
import { SettingsCard, SettingsRow } from '@/features/settings/components/SettingsCard'
import { ThemePicker } from '@/features/settings/components/ThemePicker'
import { TimezonePicker } from '@/features/settings/components/TimezonePicker'

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: format(new Date(2000, i, 1), 'MMMM'),
}))

const WEEK_STARTS = [
  { value: '1', label: 'Monday' },
  { value: '0', label: 'Sunday' },
]

/** Quarter tiles for the chosen start month; the current quarter is outlined (design 15a). */
function QuarterPreview({ fyStartMonth }) {
  const current = useMemo(() => getFiscalQuarter(new Date(), fyStartMonth), [fyStartMonth])
  return (
    <div className="bg-muted px-5 pt-3.5 pb-4.5" aria-live="polite">
      <div className="grid grid-cols-4 gap-1.5">
        {[1, 2, 3, 4].map((q) => {
          const isCurrent = q === current.quarter
          return (
            <div
              key={q}
              className={cn(
                'rounded-lg border px-2.5 py-2',
                isCurrent ? 'border-foreground bg-card' : 'border-transparent',
              )}
            >
              <p className="font-semibold">Q{q}</p>
              <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                {quarterMonthsLabel(q, fyStartMonth)}
              </p>
            </div>
          )
        })}
      </div>
      <p className="mt-2.5 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="size-1.5 rounded-full bg-foreground" aria-hidden />
        Today is in{' '}
        <span className="font-medium text-foreground">{formatQuarter(current, fyStartMonth)}</span>
      </p>
    </div>
  )
}

export function PreferencesSection() {
  const prefs = usePreferences()
  const update = useUpdateMyProfile()
  const { theme, setTheme } = useTheme()

  return (
    <SettingsCard>
      <SettingsRow
        label="Fiscal year starts in"
        description="Quarters and reports follow this."
        htmlFor="fy-start"
        className="items-start"
      >
        <Select
          value={String(prefs.fyStartMonth)}
          onValueChange={(v) => update.mutate({ fy_start_month: Number(v) })}
        >
          <SelectTrigger id="fy-start" className="w-50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingsRow>
      <QuarterPreview fyStartMonth={prefs.fyStartMonth} />

      <SettingsRow label="Week starts on">
        <SegmentedControl
          label="Week starts on"
          value={String(prefs.weekStartsOn === 0 ? 0 : 1)}
          onChange={(v) => update.mutate({ week_starts_on: Number(v) })}
          options={WEEK_STARTS}
        />
      </SettingsRow>

      <SettingsRow label="Time zone" htmlFor="timezone">
        <TimezonePicker
          id="timezone"
          value={prefs.timezone}
          onChange={(tz) => update.mutate({ timezone: tz })}
        />
      </SettingsRow>

      <div className="px-5 py-4.5">
        <p className="font-medium">Theme</p>
        {/* ProfileThemeSync persists the change to the profile. */}
        <ThemePicker value={theme} onChange={setTheme} />
      </div>
    </SettingsCard>
  )
}

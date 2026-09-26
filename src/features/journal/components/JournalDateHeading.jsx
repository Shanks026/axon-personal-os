import { LayoutTemplate } from 'lucide-react'
import { parseISODate } from '@/lib/dates'
import { getFiscalQuarter, getFiscalWeek } from '@/lib/fiscal'
import { usePreferences } from '@/features/settings/api'
import { journalHeading } from '@/features/journal/utils'

/**
 * The day's title (design Journal.dc): "Tuesday, 23 September" with the fiscal "Q2 · W13" beside
 * it, then a muted "Standup template" line (`children` adds to it, e.g. the Global note).
 */
export function JournalDateHeading({ date, children }) {
  const { fyStartMonth, weekStartsOn } = usePreferences()
  const d = parseISODate(date)
  const { quarter } = getFiscalQuarter(d, fyStartMonth)
  const week = getFiscalWeek(d, fyStartMonth, weekStartsOn)

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">{journalHeading(date)}</h1>
        <span className="font-mono text-xs text-faint">
          Q{quarter} · W{week}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
        {children ?? (
          <>
            <LayoutTemplate className="size-3.5" aria-hidden />
            Standup template
          </>
        )}
      </div>
    </div>
  )
}

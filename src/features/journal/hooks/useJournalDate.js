import { useCallback } from 'react'
import { addDays } from 'date-fns'
import { useNavigate, useParams } from 'react-router'
import { parseISODate, todayISO, toISODate } from '@/lib/dates'
import { useSpacePaths } from '@/features/spaces/hooks/useSpacePaths'
import { usePreferences } from '@/features/settings/api'
import { parseJournalDateParam } from '@/features/journal/utils'

/**
 * The journal's day, from the `:date` param (no param = today in the profile time zone; the URL
 * then stays `/journal`). `invalid` is true for a param that isn't a real date: the page
 * redirects. `goTo(today)` goes to the bare `/journal`.
 */
export function useJournalDate() {
  const { date: param } = useParams()
  const navigate = useNavigate()
  const p = useSpacePaths()
  const { timezone } = usePreferences()
  const today = todayISO(timezone)
  const parsed = param ? parseJournalDateParam(param) : today
  const date = parsed ?? today

  const goTo = useCallback(
    (iso) => navigate(iso === today ? p.journal() : p.journal(iso)),
    [navigate, p, today],
  )
  const step = useCallback((n) => goTo(toISODate(addDays(parseISODate(date), n))), [goTo, date])

  return {
    date,
    today,
    isToday: date === today,
    invalid: parsed === null,
    goTo,
    goPrev: () => step(-1),
    goNext: () => step(1),
    goToday: () => goTo(today),
  }
}

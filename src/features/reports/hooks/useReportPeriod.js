import { useMemo, useState } from 'react'
import { daysAgoISO } from '@/lib/dates'
import { customPeriod, quarterOptions, quarterPeriod, weekPeriod } from '@/features/reports/utils'

/**
 * The Generate dialog's period choice: the kind (quarter, week, custom) and each kind's inputs,
 * plus the resulting `period` (`null` while a custom range is invalid). `today` is 'yyyy-MM-dd'
 * in the profile time zone.
 */
export function useReportPeriod({ today, fyStartMonth, weekStartsOn }) {
  const quarters = useMemo(() => quarterOptions(today, fyStartMonth), [today, fyStartMonth])
  const [kind, setKind] = useState('quarter')
  const [quarter, setQuarter] = useState(quarters[0].value)
  const [weekDay, setWeekDay] = useState(today)
  const [start, setStart] = useState(() => daysAgoISO(today, 13))
  const [end, setEnd] = useState(today)

  const period = useMemo(() => {
    if (kind === 'quarter') {
      return quarterPeriod(quarters.find((q) => q.value === quarter) ?? quarters[0])
    }
    if (kind === 'week') return weekPeriod(weekDay, weekStartsOn)
    return customPeriod(start, end)
  }, [kind, quarter, quarters, weekDay, weekStartsOn, start, end])

  return {
    kind,
    setKind,
    quarters,
    quarter,
    setQuarter,
    weekDay,
    setWeekDay,
    start,
    setStart,
    end,
    setEnd,
    period,
  }
}

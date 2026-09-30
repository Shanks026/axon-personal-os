import { addDays, differenceInCalendarDays, format, isSameYear, startOfWeek } from 'date-fns'
import { parseISODate, toISODate, zonedInstant } from '@/lib/dates'
import { formatQuarter, getFiscalQuarter, shiftQuarter } from '@/lib/fiscal'

// A report period is `{ kind, start, end, label, fiscalYear?, fiscalQuarter? }` with 'yyyy-MM-dd'
// dates (inclusive), the shape the `ai` function's `report` action takes.

export const MAX_CUSTOM_DAYS = 366

/** "1 Sep – 15 Sep 2026", or "28 Dec 2025 – 3 Jan 2026" across years. */
export function rangeLabel(start, end) {
  const s = parseISODate(start)
  const e = parseISODate(end)
  if (!s || !e) return ''
  return isSameYear(s, e)
    ? `${format(s, 'd MMM')} – ${format(e, 'd MMM yyyy')}`
    : `${format(s, 'd MMM yyyy')} – ${format(e, 'd MMM yyyy')}`
}

/**
 * The quarter containing `today` ('yyyy-MM-dd') and the `count - 1` before it, newest first, as
 * `{ value: '2026-Q2', label: 'Q2 FY 2026–27', start, end, fiscalYear, quarter }`.
 */
export function quarterOptions(today, fyStartMonth, count = 6) {
  const current = getFiscalQuarter(parseISODate(today), fyStartMonth)
  return Array.from({ length: count }, (_, i) => {
    const q = shiftQuarter(current, -i, fyStartMonth)
    return {
      value: `${q.fiscalYear}-Q${q.quarter}`,
      label: formatQuarter(q, fyStartMonth),
      start: toISODate(q.start),
      end: toISODate(q.end),
      fiscalYear: q.fiscalYear,
      quarter: q.quarter,
    }
  })
}

/** A quarter option → a report period. */
export function quarterPeriod(option) {
  return {
    kind: 'quarter',
    start: option.start,
    end: option.end,
    label: option.label,
    fiscalYear: option.fiscalYear,
    fiscalQuarter: option.quarter,
  }
}

/** The week containing `anyDate` ('yyyy-MM-dd'): "Week of 21 Sep 2026". */
export function weekPeriod(anyDate, weekStartsOn = 1) {
  const day = parseISODate(anyDate)
  if (!day) return null
  const start = startOfWeek(day, { weekStartsOn })
  return {
    kind: 'week',
    start: toISODate(start),
    end: toISODate(addDays(start, 6)),
    label: `Week of ${format(start, 'd MMM yyyy')}`,
  }
}

/** A custom range, or `null` when a date is missing, the end is first, or it's over a year. */
export function customPeriod(start, end) {
  const s = parseISODate(start)
  const e = parseISODate(end)
  if (!s || !e) return null
  const days = differenceInCalendarDays(e, s) + 1
  if (days < 1 || days > MAX_CUSTOM_DAYS) return null
  return { kind: 'custom', start: toISODate(s), end: toISODate(e), label: rangeLabel(start, end) }
}

/**
 * The period as UTC instants in `timezone`: `{ from, to }` from the first day's midnight to the
 * midnight after the last day (half-open), for `completed_at` and other timestamps.
 */
export function periodRange(period, timezone) {
  const after = toISODate(addDays(parseISODate(period.end), 1))
  return {
    from: zonedInstant(period.start, '00:00', timezone).toISOString(),
    to: zonedInstant(after, '00:00', timezone).toISOString(),
  }
}

/** A saved report's period, rebuilt from its row (Regenerate keeps it). */
export function reportPeriod(report, fyStartMonth) {
  const base = { kind: report.period_kind, start: report.period_start, end: report.period_end }
  if (report.period_kind === 'quarter' && report.fiscal_year && report.fiscal_quarter) {
    return {
      ...base,
      label: formatQuarter(
        { fiscalYear: report.fiscal_year, quarter: report.fiscal_quarter },
        fyStartMonth,
      ),
      fiscalYear: report.fiscal_year,
      fiscalQuarter: report.fiscal_quarter,
    }
  }
  if (report.period_kind === 'week') {
    return { ...base, label: `Week of ${format(parseISODate(report.period_start), 'd MMM yyyy')}` }
  }
  return { ...base, label: rangeLabel(report.period_start, report.period_end) }
}

/** "q2-fy-2026-27-report-thmp.md" */
export function reportFileName(report) {
  const slug = String(report?.title ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/, '')
  return `${slug || 'report'}.md`
}

/** The AI job (and so the default model): weeks and ranges up to 14 days are "weekly". */
export function reportJob(period) {
  if (!period) return 'report_quarterly'
  const days = differenceInCalendarDays(parseISODate(period.end), parseISODate(period.start)) + 1
  return period.kind === 'week' || (period.kind === 'custom' && days <= 14)
    ? 'report_weekly'
    : 'report_quarterly'
}

/** The `report` action's payload (the range computed in the profile time zone). */
export function buildReportRequest({ period, timezone, spaceIds, spaceId, model, reportId }) {
  return {
    period,
    range: periodRange(period, timezone),
    timezone,
    spaceIds,
    spaceId: spaceId ?? null,
    model,
    ...(reportId && { reportId }),
  }
}

/** A plain-text excerpt of a report's Markdown text: headings dropped, list markers and emphasis removed. */
export function reportExcerpt(text, max = 240) {
  const plain = String(text ?? '')
    .split('\n')
    .filter((line) => !/^\s*#/.test(line))
    .map((line) => line.replace(/^\s*(?:[-*+]|\d+\.)\s+/, '').replace(/[*_`~]/g, ''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
  return plain.length > max ? `${plain.slice(0, max - 1).trimEnd()}…` : plain
}

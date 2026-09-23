import { addMonths, differenceInCalendarWeeks, endOfMonth, format, startOfMonth } from 'date-fns'

// Fiscal-year maths. `fyStartMonth` is 1–12 (profiles.fy_start_month; 4 = April → Q1 is Apr–Jun).
// A fiscal year is named by its START year: FY 2026–27 → fiscalYear 2026.

export const DEFAULT_FY_START_MONTH = 4

/** Fiscal year (start year) containing `date`. */
export function getFiscalYear(date, fyStartMonth = DEFAULT_FY_START_MONTH) {
  const month = date.getMonth() + 1
  return month >= fyStartMonth ? date.getFullYear() : date.getFullYear() - 1
}

/** First and last day of a fiscal quarter. */
export function getQuarterRange(fiscalYear, quarter, fyStartMonth = DEFAULT_FY_START_MONTH) {
  const start = new Date(fiscalYear, fyStartMonth - 1 + (quarter - 1) * 3, 1)
  return { start: startOfMonth(start), end: endOfMonth(addMonths(start, 2)) }
}

/** `{ fiscalYear, quarter, start, end }` for the quarter containing `date`. */
export function getFiscalQuarter(date, fyStartMonth = DEFAULT_FY_START_MONTH) {
  const fiscalYear = getFiscalYear(date, fyStartMonth)
  const offset = (date.getMonth() + 1 - fyStartMonth + 12) % 12
  const quarter = Math.floor(offset / 3) + 1
  return { fiscalYear, quarter, ...getQuarterRange(fiscalYear, quarter, fyStartMonth) }
}

/** The quarter `n` quarters away (negative = earlier). */
export function shiftQuarter({ fiscalYear, quarter }, n, fyStartMonth = DEFAULT_FY_START_MONTH) {
  const index = fiscalYear * 4 + (quarter - 1) + n
  const fy = Math.floor(index / 4)
  const q = (((index % 4) + 4) % 4) + 1
  return { fiscalYear: fy, quarter: q, ...getQuarterRange(fy, q, fyStartMonth) }
}

/** "FY 2026–27", or "FY 2026" when the fiscal year is the calendar year. */
export function formatFiscalYear(fiscalYear, fyStartMonth = DEFAULT_FY_START_MONTH) {
  if (fyStartMonth === 1) return `FY ${fiscalYear}`
  return `FY ${fiscalYear}–${String(fiscalYear + 1).slice(-2)}`
}

/** "Q2 FY 2026–27" */
export function formatQuarter({ fiscalYear, quarter }, fyStartMonth = DEFAULT_FY_START_MONTH) {
  return `Q${quarter} ${formatFiscalYear(fiscalYear, fyStartMonth)}`
}

/** "Apr–Jun" for a quarter number under a given start month. */
export function quarterMonthsLabel(quarter, fyStartMonth = DEFAULT_FY_START_MONTH) {
  const { start, end } = getQuarterRange(2000, quarter, fyStartMonth)
  return `${format(start, 'MMM')}–${format(end, 'MMM')}`
}

/** Every quarter overlapping [from, to], oldest first. */
export function listQuarters(from, to, fyStartMonth = DEFAULT_FY_START_MONTH) {
  const out = []
  let q = getFiscalQuarter(from, fyStartMonth)
  const last = getFiscalQuarter(to, fyStartMonth)
  while (q.fiscalYear * 4 + q.quarter <= last.fiscalYear * 4 + last.quarter) {
    out.push(q)
    q = shiftQuarter(q, 1, fyStartMonth)
  }
  return out
}

/**
 * Week number within the fiscal quarter (W1 = the week containing the quarter's first day),
 * as shown in Calendar and Journal headers ("Q2 · W13").
 */
export function getFiscalWeek(date, fyStartMonth = DEFAULT_FY_START_MONTH, weekStartsOn = 1) {
  const { start } = getFiscalQuarter(date, fyStartMonth)
  return differenceInCalendarWeeks(date, start, { weekStartsOn }) + 1
}

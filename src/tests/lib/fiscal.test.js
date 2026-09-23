import { describe, expect, it } from 'vitest'
import {
  formatFiscalYear,
  formatQuarter,
  getFiscalQuarter,
  getFiscalWeek,
  getFiscalYear,
  getQuarterRange,
  listQuarters,
  quarterMonthsLabel,
  shiftQuarter,
} from '@/lib/fiscal'
import { toISODate } from '@/lib/dates'

const d = (y, m, day) => new Date(y, m - 1, day)
const range = (r) => [toISODate(r.start), toISODate(r.end)]

describe('April fiscal year (the default)', () => {
  it('puts 31 Mar and 1 Apr in different fiscal years', () => {
    expect(getFiscalYear(d(2026, 3, 31), 4)).toBe(2025)
    expect(getFiscalYear(d(2026, 4, 1), 4)).toBe(2026)
  })

  it('maps quarters to Apr–Jun, Jul–Sep, Oct–Dec, Jan–Mar', () => {
    expect(getFiscalQuarter(d(2026, 4, 1), 4).quarter).toBe(1)
    expect(getFiscalQuarter(d(2026, 6, 30), 4).quarter).toBe(1)
    expect(getFiscalQuarter(d(2026, 7, 1), 4).quarter).toBe(2)
    expect(getFiscalQuarter(d(2026, 12, 31), 4).quarter).toBe(3)
    const q4 = getFiscalQuarter(d(2027, 1, 1), 4)
    expect([q4.fiscalYear, q4.quarter]).toEqual([2026, 4])
    expect(getFiscalQuarter(d(2027, 3, 31), 4).quarter).toBe(4)
  })

  it('gives 23 Sep 2026 as Q2 FY 2026–27 (Jul–Sep)', () => {
    const q = getFiscalQuarter(d(2026, 9, 23), 4)
    expect(formatQuarter(q, 4)).toBe('Q2 FY 2026–27')
    expect(range(q)).toEqual(['2026-07-01', '2026-09-30'])
  })

  it('handles leap-year Q4 ranges', () => {
    expect(range(getQuarterRange(2027, 4, 4))).toEqual(['2028-01-01', '2028-03-31'])
  })
})

describe('every start month', () => {
  it.each(Array.from({ length: 12 }, (_, i) => i + 1))(
    'start month %i: first day is Q1, the day before is Q4 of the previous year',
    (m) => {
      const first = d(2026, m, 1)
      const q1 = getFiscalQuarter(first, m)
      expect([q1.fiscalYear, q1.quarter]).toEqual([2026, 1])
      expect(toISODate(q1.start)).toBe(toISODate(first))

      const dayBefore = new Date(2026, m - 1, 0)
      const q4 = getFiscalQuarter(dayBefore, m)
      expect([q4.fiscalYear, q4.quarter]).toEqual([2025, 4])
      expect(toISODate(q4.end)).toBe(toISODate(dayBefore))
    },
  )

  it.each(Array.from({ length: 12 }, (_, i) => i + 1))(
    'start month %i: four quarters tile the year without gaps',
    (m) => {
      const qs = [1, 2, 3, 4].map((q) => getQuarterRange(2026, q, m))
      for (let i = 1; i < 4; i++) {
        const gap = (qs[i].start - qs[i - 1].end) / 86_400_000
        expect(gap).toBeGreaterThan(0)
        expect(gap).toBeLessThanOrEqual(1.05) // DST-safe "next day"
      }
      expect(toISODate(qs[0].start)).toBe(toISODate(d(2026, m, 1)))
    },
  )
})

describe('calendar fiscal year (January start)', () => {
  it('matches calendar quarters and labels without a range', () => {
    const q = getFiscalQuarter(d(2026, 12, 31), 1)
    expect([q.fiscalYear, q.quarter]).toEqual([2026, 4])
    expect(getFiscalQuarter(d(2027, 1, 1), 1).fiscalYear).toBe(2027)
    expect(formatFiscalYear(2026, 1)).toBe('FY 2026')
    expect(formatQuarter({ fiscalYear: 2026, quarter: 3 }, 1)).toBe('Q3 FY 2026')
  })
})

describe('labels', () => {
  it('formats fiscal years that span two calendar years', () => {
    expect(formatFiscalYear(2026, 4)).toBe('FY 2026–27')
    expect(formatFiscalYear(2099, 7)).toBe('FY 2099–00')
  })

  it('labels quarter months', () => {
    expect([1, 2, 3, 4].map((q) => quarterMonthsLabel(q, 4))).toEqual([
      'Apr–Jun',
      'Jul–Sep',
      'Oct–Dec',
      'Jan–Mar',
    ])
    expect(quarterMonthsLabel(1, 1)).toBe('Jan–Mar')
    expect(quarterMonthsLabel(4, 11)).toBe('Aug–Oct')
  })
})

describe('shifting and listing quarters', () => {
  it('shifts across fiscal-year boundaries', () => {
    const q = { fiscalYear: 2026, quarter: 1 }
    expect(shiftQuarter(q, -1, 4)).toMatchObject({ fiscalYear: 2025, quarter: 4 })
    expect(shiftQuarter(q, 4, 4)).toMatchObject({ fiscalYear: 2027, quarter: 1 })
    expect(shiftQuarter(q, -5, 4)).toMatchObject({ fiscalYear: 2024, quarter: 4 })
    expect(range(shiftQuarter(q, -1, 4))).toEqual(['2026-01-01', '2026-03-31'])
  })

  it('lists quarters across a year boundary, inclusive', () => {
    const qs = listQuarters(d(2025, 11, 15), d(2026, 5, 2), 4)
    expect(qs.map((q) => formatQuarter(q, 4))).toEqual([
      'Q3 FY 2025–26',
      'Q4 FY 2025–26',
      'Q1 FY 2026–27',
    ])
  })

  it('lists a single quarter when both dates share it', () => {
    expect(listQuarters(d(2026, 7, 1), d(2026, 9, 30), 4)).toHaveLength(1)
  })
})

describe('fiscal weeks', () => {
  it('numbers weeks within the quarter (Monday start)', () => {
    // Q2 FY 2026–27 starts Wed 1 Jul 2026, so that whole week is W1
    expect(getFiscalWeek(d(2026, 7, 1), 4, 1)).toBe(1)
    expect(getFiscalWeek(d(2026, 7, 5), 4, 1)).toBe(1) // Sun
    expect(getFiscalWeek(d(2026, 7, 6), 4, 1)).toBe(2) // Mon
    expect(getFiscalWeek(d(2026, 9, 23), 4, 1)).toBe(13)
  })

  it('respects a Sunday week start', () => {
    expect(getFiscalWeek(d(2026, 7, 5), 4, 0)).toBe(2) // Sun starts W2
  })
})

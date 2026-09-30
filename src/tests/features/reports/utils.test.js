import { describe, expect, it } from 'vitest'
import {
  buildReportRequest,
  customPeriod,
  periodRange,
  quarterOptions,
  quarterPeriod,
  rangeLabel,
  reportExcerpt,
  reportFileName,
  reportJob,
  reportPeriod,
  weekPeriod,
} from '@/features/reports/utils'

describe('quarterOptions', () => {
  it('lists the current quarter first, then earlier ones (April start)', () => {
    const q = quarterOptions('2026-09-29', 4, 3)
    expect(q.map((o) => o.label)).toEqual(['Q2 FY 2026–27', 'Q1 FY 2026–27', 'Q4 FY 2025–26'])
    expect(q[0]).toMatchObject({
      value: '2026-Q2',
      start: '2026-07-01',
      end: '2026-09-30',
      fiscalYear: 2026,
      quarter: 2,
    })
    expect(q[2]).toMatchObject({ start: '2026-01-01', end: '2026-03-31' })
  })

  it('follows a calendar-year fiscal year', () => {
    const [current] = quarterOptions('2026-02-10', 1, 1)
    expect(current).toMatchObject({ label: 'Q1 FY 2026', start: '2026-01-01', end: '2026-03-31' })
  })

  it('defaults to six options', () => {
    expect(quarterOptions('2026-09-29', 4)).toHaveLength(6)
  })
})

describe('quarterPeriod', () => {
  it('maps an option to a quarter period', () => {
    const [option] = quarterOptions('2026-09-29', 4, 1)
    expect(quarterPeriod(option)).toEqual({
      kind: 'quarter',
      start: '2026-07-01',
      end: '2026-09-30',
      label: 'Q2 FY 2026–27',
      fiscalYear: 2026,
      fiscalQuarter: 2,
    })
  })
})

describe('weekPeriod', () => {
  it('finds the Monday-start week of any day', () => {
    expect(weekPeriod('2026-09-24', 1)).toEqual({
      kind: 'week',
      start: '2026-09-21',
      end: '2026-09-27',
      label: 'Week of 21 Sep 2026',
    })
  })

  it('honours a Sunday week start', () => {
    expect(weekPeriod('2026-09-24', 0)).toMatchObject({ start: '2026-09-20', end: '2026-09-26' })
  })

  it('returns null for a bad date', () => {
    expect(weekPeriod('nope')).toBeNull()
  })
})

describe('customPeriod', () => {
  it('builds a labelled range', () => {
    expect(customPeriod('2026-09-01', '2026-09-15')).toEqual({
      kind: 'custom',
      start: '2026-09-01',
      end: '2026-09-15',
      label: '1 Sep – 15 Sep 2026',
    })
  })

  it('allows a single day', () => {
    expect(customPeriod('2026-09-01', '2026-09-01')).not.toBeNull()
  })

  it('rejects an end before the start, missing dates and ranges over a year', () => {
    expect(customPeriod('2026-09-15', '2026-09-01')).toBeNull()
    expect(customPeriod(null, '2026-09-01')).toBeNull()
    expect(customPeriod('2025-01-01', '2026-06-01')).toBeNull()
  })
})

describe('rangeLabel', () => {
  it('shows both years across a new year', () => {
    expect(rangeLabel('2025-12-28', '2026-01-03')).toBe('28 Dec 2025 – 3 Jan 2026')
  })
})

describe('periodRange', () => {
  it('spans local midnight to the midnight after the last day, in UTC', () => {
    const period = { start: '2026-07-01', end: '2026-09-30' }
    expect(periodRange(period, 'Asia/Kolkata')).toEqual({
      from: '2026-06-30T18:30:00.000Z',
      to: '2026-09-30T18:30:00.000Z',
    })
  })

  it('follows DST in the profile zone', () => {
    const period = { start: '2026-03-01', end: '2026-03-31' }
    expect(periodRange(period, 'Europe/London')).toEqual({
      from: '2026-03-01T00:00:00.000Z',
      to: '2026-03-31T23:00:00.000Z',
    })
  })
})

describe('reportJob', () => {
  it('treats weeks and short custom ranges as weekly', () => {
    expect(reportJob({ kind: 'week', start: '2026-09-21', end: '2026-09-27' })).toBe(
      'report_weekly',
    )
    expect(reportJob({ kind: 'custom', start: '2026-09-01', end: '2026-09-14' })).toBe(
      'report_weekly',
    )
    expect(reportJob({ kind: 'custom', start: '2026-09-01', end: '2026-09-15' })).toBe(
      'report_quarterly',
    )
    expect(reportJob({ kind: 'quarter', start: '2026-07-01', end: '2026-09-30' })).toBe(
      'report_quarterly',
    )
  })
})

describe('reportPeriod', () => {
  it('rebuilds a quarter period from a saved row', () => {
    const row = {
      period_kind: 'quarter',
      period_start: '2026-07-01',
      period_end: '2026-09-30',
      fiscal_year: 2026,
      fiscal_quarter: 2,
    }
    expect(reportPeriod(row, 4)).toEqual({
      kind: 'quarter',
      start: '2026-07-01',
      end: '2026-09-30',
      label: 'Q2 FY 2026–27',
      fiscalYear: 2026,
      fiscalQuarter: 2,
    })
  })

  it('rebuilds week and custom labels', () => {
    expect(
      reportPeriod({ period_kind: 'week', period_start: '2026-09-21', period_end: '2026-09-27' })
        .label,
    ).toBe('Week of 21 Sep 2026')
    expect(
      reportPeriod({ period_kind: 'custom', period_start: '2026-09-01', period_end: '2026-09-15' })
        .label,
    ).toBe('1 Sep – 15 Sep 2026')
  })
})

describe('buildReportRequest', () => {
  it('adds the UTC range and only includes reportId when regenerating', () => {
    const period = { kind: 'week', start: '2026-09-21', end: '2026-09-27', label: 'W' }
    const req = buildReportRequest({
      period,
      timezone: 'UTC',
      spaceIds: ['a'],
      spaceId: 'a',
      model: 'gemini-3.8-flash',
    })
    expect(req).toEqual({
      period,
      range: { from: '2026-09-21T00:00:00.000Z', to: '2026-09-28T00:00:00.000Z' },
      timezone: 'UTC',
      spaceIds: ['a'],
      spaceId: 'a',
      model: 'gemini-3.8-flash',
    })
    expect(
      buildReportRequest({ period, timezone: 'UTC', spaceIds: [], reportId: 'r' }),
    ).toMatchObject({ spaceId: null, reportId: 'r' })
  })
})

describe('reportFileName', () => {
  it('slugs the title', () => {
    expect(reportFileName({ title: 'Q2 FY 2026–27 report · THMP' })).toBe(
      'q2-fy-2026-27-report-thmp.md',
    )
  })

  it('falls back when the title has no letters', () => {
    expect(reportFileName({ title: '···' })).toBe('report.md')
  })
})

describe('reportExcerpt', () => {
  it('drops headings and Markdown markers', () => {
    const md = '## Summary\nShipped **RFQ** pagination [MP-1].\n\n- Fixed `filters`\n## Highlights'
    expect(reportExcerpt(md)).toBe('Shipped RFQ pagination [MP-1]. Fixed filters')
  })

  it('truncates long text', () => {
    expect(reportExcerpt('word '.repeat(100), 20)).toHaveLength(20)
  })
})

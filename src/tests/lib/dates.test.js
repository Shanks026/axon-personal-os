import { describe, expect, it } from 'vitest'
import {
  daysAgoISO,
  dueTone,
  formatDate,
  formatDateShort,
  formatDueLabel,
  formatRelative,
  formatTime,
  formatWeekdayDate,
  formatTimeRange,
  isOverdue,
  parseISODate,
  toISODate,
  todayISO,
  zonedDayRange,
  zonedInstant,
  zonedParts,
} from '@/lib/dates'

// Wed 23 Sep 2026, 14:00 local
const now = new Date(2026, 8, 23, 14, 0)

describe('ISO date conversion', () => {
  it('parses yyyy-MM-dd as local midnight', () => {
    const d = parseISODate('2026-09-23')
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 8, 23, 0])
  })

  it('round-trips and rejects junk', () => {
    expect(toISODate(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(toISODate('2026-09-23')).toBe('2026-09-23')
    expect(parseISODate('nope')).toBeNull()
    expect(toISODate(null)).toBeNull()
  })
})

describe('formatting', () => {
  it('formats full and short dates', () => {
    expect(formatDate('2026-09-23')).toBe('23 Sep 2026')
    expect(formatDateShort('2026-09-23')).toBe('23 Sep')
    expect(formatDate(null)).toBe('')
  })

  it('formats relative times', () => {
    expect(formatRelative(new Date(2026, 8, 23, 13, 59, 40), now)).toBe('just now')
    expect(formatRelative(new Date(2026, 8, 23, 13, 55), now)).toBe('5m ago')
    expect(formatRelative(new Date(2026, 8, 23, 12, 0), now)).toBe('2h ago')
    expect(formatRelative(new Date(2026, 8, 22, 18, 0), now)).toBe('yesterday')
    expect(formatRelative(new Date(2026, 8, 20, 9, 0), now)).toBe('3d ago')
    expect(formatRelative(new Date(2026, 7, 12), now)).toBe('12 Aug')
    expect(formatRelative(new Date(2025, 7, 12), now)).toBe('12 Aug 2025')
  })
})

describe('due dates', () => {
  it('labels due dates', () => {
    expect(formatDueLabel('2026-09-23', now)).toBe('Today')
    expect(formatDueLabel('2026-09-24', now)).toBe('Tomorrow')
    expect(formatDueLabel('2026-09-20', now)).toBe('Overdue · 3d')
    expect(formatDueLabel('2026-09-26', now)).toBe('Sat 26 Sep')
    expect(formatDueLabel('2027-01-08', now)).toBe('Fri 8 Jan 2027')
    expect(formatDueLabel(null, now)).toBe('No due date')
  })

  it('assigns tones and overdue state', () => {
    expect(dueTone('2026-09-22', now)).toBe('overdue')
    expect(dueTone('2026-09-23', now)).toBe('today')
    expect(dueTone('2026-09-30', now)).toBe('default')
    expect(dueTone(undefined, now)).toBe('none')
    expect(isOverdue('2026-09-22', now)).toBe(true)
    expect(isOverdue('2026-09-23', now)).toBe(false)
  })
})

describe('daysAgoISO', () => {
  it('crosses month boundaries', () => {
    expect(daysAgoISO('2026-10-05', 30)).toBe('2026-09-05')
  })
})

describe('time-zone helpers', () => {
  it('todayISO reads the date in the given zone, not the browser zone', () => {
    const instant = new Date('2026-09-23T20:00:00Z')
    expect(todayISO('Asia/Kolkata', instant)).toBe('2026-09-24') // 01:30 next day
    expect(todayISO('America/New_York', instant)).toBe('2026-09-23')
  })

  it('zonedDayRange covers the local day as UTC instants', () => {
    expect(zonedDayRange('2026-09-23', 'Asia/Kolkata')).toEqual({
      from: '2026-09-22T18:30:00.000Z',
      to: '2026-09-23T18:30:00.000Z',
    })
    expect(zonedDayRange('2026-12-01', 'Europe/London')).toEqual({
      from: '2026-12-01T00:00:00.000Z',
      to: '2026-12-02T00:00:00.000Z',
    })
  })

  it('a DST change day is 23 or 25 hours long', () => {
    const spring = zonedDayRange('2026-03-29', 'Europe/London')
    expect(new Date(spring.to) - new Date(spring.from)).toBe(23 * 3600_000)
    const autumn = zonedDayRange('2026-10-25', 'Europe/London')
    expect(new Date(autumn.to) - new Date(autumn.from)).toBe(25 * 3600_000)
  })

  it('zonedInstant and zonedParts round-trip across BST and GMT', () => {
    const summer = zonedInstant('2026-07-01', '09:30', 'Europe/London')
    expect(summer.toISOString()).toBe('2026-07-01T08:30:00.000Z')
    expect(zonedParts(summer, 'Europe/London')).toEqual({ isoDate: '2026-07-01', time: '09:30' })
    const winter = zonedInstant('2026-12-01', '09:30', 'Europe/London')
    expect(winter.toISOString()).toBe('2026-12-01T09:30:00.000Z')
    expect(zonedParts(winter, 'Asia/Kolkata')).toEqual({ isoDate: '2026-12-01', time: '15:00' })
  })

  it('formats times and ranges in the zone', () => {
    const start = '2026-09-23T03:30:00Z'
    const end = '2026-09-23T05:00:00Z'
    expect(formatTime(start, 'Asia/Kolkata')).toBe('09:00')
    expect(formatTimeRange(start, end, 'Asia/Kolkata')).toBe('09:00–10:30')
    expect(formatTime(null, 'UTC')).toBe('')
  })
})

describe('formatWeekdayDate', () => {
  it('shows the weekday, and the year only outside this year', () => {
    expect(formatWeekdayDate('2026-09-25', now)).toBe('Fri 25 Sep')
    expect(formatWeekdayDate('2027-01-05', now)).toBe('Tue 5 Jan 2027')
    expect(formatWeekdayDate(null, now)).toBe('')
  })
})

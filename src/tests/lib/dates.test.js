import { describe, expect, it } from 'vitest'
import {
  dueTone,
  formatDate,
  formatDateShort,
  formatDueLabel,
  formatRelative,
  isOverdue,
  parseISODate,
  toISODate,
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

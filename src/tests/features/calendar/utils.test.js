import { describe, expect, it } from 'vitest'
import {
  addTime,
  buildMonthGrid,
  endAfter,
  formatAgendaDay,
  formatRangeTitle,
  fromEvent,
  getViewRange,
  groupItemsByDay,
  minutesBetween,
  shiftDate,
  toEventTimestamps,
  weekdayLabels,
} from '@/features/calendar/utils'

describe('buildMonthGrid', () => {
  it('always has 42 cells starting on the week-start day', () => {
    const grid = buildMonthGrid('2026-09-23', 1, '2026-09-23')
    expect(grid).toHaveLength(42)
    expect(grid[0].isoDate).toBe('2026-08-31') // a Monday
    expect(grid.find((c) => c.isToday).isoDate).toBe('2026-09-23')
    expect(grid.filter((c) => c.inMonth)).toHaveLength(30)
  })

  it('a month that starts on the week-start day begins in its own first cell', () => {
    // 1 June 2026 is a Monday
    const grid = buildMonthGrid('2026-06-10', 1)
    expect(grid[0]).toMatchObject({ isoDate: '2026-06-01', inMonth: true })
  })

  it('handles Sunday week starts', () => {
    const grid = buildMonthGrid('2026-09-01', 0)
    expect(grid[0].isoDate).toBe('2026-08-30') // a Sunday
    expect(grid[0].isWeekend).toBe(true)
  })

  it('counts February in leap and non-leap years', () => {
    expect(buildMonthGrid('2028-02-10', 1).filter((c) => c.inMonth)).toHaveLength(29)
    expect(buildMonthGrid('2026-02-10', 1).filter((c) => c.inMonth)).toHaveLength(28)
  })

  it('December spills into January', () => {
    const grid = buildMonthGrid('2026-12-15', 1)
    expect(grid[41].isoDate.startsWith('2027-01')).toBe(true)
    expect(grid[41].inMonth).toBe(false)
  })
})

describe('weekdayLabels', () => {
  it('rotates by week start', () => {
    expect(weekdayLabels(1)[0]).toBe('Mon')
    expect(weekdayLabels(0)[0]).toBe('Sun')
    expect(weekdayLabels(0)[6]).toBe('Sat')
  })
})

describe('getViewRange', () => {
  const opts = { weekStartsOn: 1, timeZone: 'Asia/Kolkata' }

  it('month covers the whole 42-day grid in the profile zone', () => {
    const r = getViewRange('month', '2026-09-23', opts)
    expect(r.days).toHaveLength(42)
    expect(r.startDate).toBe('2026-08-31')
    expect(r.endDate).toBe('2026-10-11')
    expect(r.from).toBe('2026-08-30T18:30:00.000Z')
    expect(r.to).toBe('2026-10-11T18:30:00.000Z')
  })

  it('week, day and agenda', () => {
    expect(getViewRange('week', '2026-09-23', opts).days).toEqual([
      '2026-09-21',
      '2026-09-22',
      '2026-09-23',
      '2026-09-24',
      '2026-09-25',
      '2026-09-26',
      '2026-09-27',
    ])
    expect(getViewRange('day', '2026-09-23', opts).days).toEqual(['2026-09-23'])
    const agenda = getViewRange('agenda', '2026-09-23', opts)
    expect(agenda.days).toHaveLength(30)
    expect(agenda.endDate).toBe('2026-10-22')
  })
})

describe('shiftDate', () => {
  it('steps by the view', () => {
    expect(shiftDate('month', '2026-01-31', 1)).toBe('2026-02-28')
    expect(shiftDate('month', '2026-01-15', -1)).toBe('2025-12-15')
    expect(shiftDate('week', '2026-09-23', 1)).toBe('2026-09-30')
    expect(shiftDate('day', '2026-09-23', -1)).toBe('2026-09-22')
    expect(shiftDate('agenda', '2026-09-23', 1)).toBe('2026-10-23')
  })
})

describe('formatRangeTitle', () => {
  it('formats each view', () => {
    expect(formatRangeTitle('month', '2026-09-23')).toBe('September 2026')
    expect(formatRangeTitle('week', '2026-09-23', 1)).toBe('21 – 27 Sep 2026')
    expect(formatRangeTitle('week', '2026-09-30', 1)).toBe('28 Sep – 4 Oct 2026')
    expect(formatRangeTitle('week', '2026-12-30', 1)).toBe('28 Dec 2026 – 3 Jan 2027')
    expect(formatRangeTitle('day', '2026-09-23')).toBe('Wed 23 Sep 2026')
    expect(formatRangeTitle('agenda', '2026-09-23')).toBe('From 23 Sep 2026')
  })
})

describe('groupItemsByDay', () => {
  const tz = 'UTC'
  const days = ['2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25']
  const ev = (id, start, end, allDay = false) => ({ kind: 'event', id, start, end, allDay })

  it('puts a multi-day event on every day it touches, with start/end flags', () => {
    const map = groupItemsByDay([ev('a', '2026-09-22T10:00:00Z', '2026-09-24T09:00:00Z')], days, tz)
    expect(map.get('2026-09-22')[0]).toMatchObject({ isStart: true, isEnd: false })
    expect(map.get('2026-09-23')[0]).toMatchObject({ isStart: false, isEnd: false })
    expect(map.get('2026-09-24')[0]).toMatchObject({ isStart: false, isEnd: true })
    expect(map.get('2026-09-25')).toEqual([])
  })

  it('an event ending exactly at midnight does not spill into the next day', () => {
    const map = groupItemsByDay([ev('a', '2026-09-23T22:00:00Z', '2026-09-24T00:00:00Z')], days, tz)
    expect(map.get('2026-09-23')).toHaveLength(1)
    expect(map.get('2026-09-24')).toHaveLength(0)
  })

  it('an event crossing midnight shows on both days', () => {
    const map = groupItemsByDay([ev('a', '2026-09-23T23:00:00Z', '2026-09-24T01:00:00Z')], days, tz)
    expect(map.get('2026-09-23')).toHaveLength(1)
    expect(map.get('2026-09-24')).toHaveLength(1)
  })

  it('uses the given time zone for the day', () => {
    // 20:00 UTC on the 23rd is 01:30 on the 24th in Kolkata
    const map = groupItemsByDay(
      [ev('a', '2026-09-23T20:00:00Z', '2026-09-23T21:00:00Z')],
      days,
      'Asia/Kolkata',
    )
    expect(map.get('2026-09-23')).toHaveLength(0)
    expect(map.get('2026-09-24')).toHaveLength(1)
  })

  it('orders all-day events, timed events by start, tasks, then todos', () => {
    const items = [
      { kind: 'todo', id: 'todo', dueDate: '2026-09-23' },
      ev('late', '2026-09-23T15:00:00Z', '2026-09-23T16:00:00Z'),
      { kind: 'task', id: 'task', dueDate: '2026-09-23' },
      ev('early', '2026-09-23T09:00:00Z', '2026-09-23T10:00:00Z'),
      ev('allday', '2026-09-23T00:00:00Z', '2026-09-23T23:59:59.999Z', true),
      { kind: 'task', id: 'elsewhere', dueDate: '2026-12-01' },
    ]
    const ids = groupItemsByDay(items, days, tz)
      .get('2026-09-23')
      .map((e) => e.item.id)
    expect(ids).toEqual(['allday', 'early', 'late', 'task', 'todo'])
  })
})

describe('event timestamps', () => {
  it('timed events convert through the zone and back (BST)', () => {
    const values = {
      all_day: false,
      start_date: '2026-07-01',
      end_date: '2026-07-01',
      start_time: '09:00',
      end_time: '10:30',
    }
    const ts = toEventTimestamps(values, 'Europe/London')
    expect(ts).toEqual({
      all_day: false,
      starts_at: '2026-07-01T08:00:00.000Z',
      ends_at: '2026-07-01T09:30:00.000Z',
    })
    expect(fromEvent(ts, 'Europe/London')).toEqual(values)
  })

  it('an event across the October DST change keeps its local times', () => {
    const values = {
      all_day: false,
      start_date: '2026-10-24',
      end_date: '2026-10-26',
      start_time: '09:00',
      end_time: '09:00',
    }
    const ts = toEventTimestamps(values, 'Europe/London')
    expect(ts.starts_at).toBe('2026-10-24T08:00:00.000Z') // BST
    expect(ts.ends_at).toBe('2026-10-26T09:00:00.000Z') // GMT
    expect(fromEvent(ts, 'Europe/London')).toEqual(values)
  })

  it('all-day events run 00:00 → 23:59:59.999 local (no DST zone)', () => {
    const ts = toEventTimestamps(
      { all_day: true, start_date: '2026-09-23', end_date: '2026-09-24' },
      'Asia/Kolkata',
    )
    expect(ts).toEqual({
      all_day: true,
      starts_at: '2026-09-22T18:30:00.000Z',
      ends_at: '2026-09-24T18:29:59.999Z',
    })
    expect(fromEvent(ts, 'Asia/Kolkata')).toMatchObject({
      all_day: true,
      start_date: '2026-09-23',
      end_date: '2026-09-24',
    })
  })
})

describe('time helpers', () => {
  it('addTime wraps past midnight', () => {
    expect(addTime('09:00', 60)).toBe('10:00')
    expect(addTime('23:30', 60)).toBe('00:30')
  })

  it('minutesBetween and endAfter keep a duration across days', () => {
    expect(minutesBetween('2026-09-23', '23:00', '2026-09-24', '01:00')).toBe(120)
    expect(endAfter('2026-09-23', '23:30', 90)).toEqual({
      end_date: '2026-09-24',
      end_time: '01:00',
    })
  })

  it('formatAgendaDay', () => {
    expect(formatAgendaDay('2026-09-23', '2026-09-23')).toBe('Today')
    expect(formatAgendaDay('2026-09-24', '2026-09-23')).toBe('Tomorrow')
    expect(formatAgendaDay('2026-09-25', '2026-09-23')).toBe('Fri 25 Sep')
    expect(formatAgendaDay('2027-01-05', '2026-09-23')).toBe('Tue 5 Jan 2027')
  })
})

import { describe, expect, it } from 'vitest'
import {
  addTime,
  applyMove,
  applyResize,
  buildMonthGrid,
  eventMinutesOnDay,
  endAfter,
  formatAgendaDay,
  formatRangeTitle,
  fromEvent,
  getViewRange,
  groupItemsByDay,
  layoutDayEvents,
  minutesBetween,
  minutesFromOffset,
  rescheduleTask,
  shiftDate,
  slotToFormValues,
  snapModifier,
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

describe('layoutDayEvents', () => {
  const ev = (id, startMin, endMin) => ({ id, startMin, endMin })
  const byId = (out) => Object.fromEntries(out.map((o) => [o.id, o]))

  it('non-overlapping events take the full width', () => {
    const out = byId(layoutDayEvents([ev('a', 540, 600), ev('b', 600, 660)]))
    expect(out.a).toMatchObject({ left: 0, width: 100 })
    expect(out.b).toMatchObject({ left: 0, width: 100 })
    expect(out.a.top).toBeCloseTo((540 / 1440) * 100)
    expect(out.a.height).toBeCloseTo((60 / 1440) * 100)
  })

  it('two overlapping events sit side by side', () => {
    const out = byId(layoutDayEvents([ev('a', 540, 600), ev('b', 570, 630)]))
    expect(out.a).toMatchObject({ left: 0, width: 50 })
    expect(out.b).toMatchObject({ left: 50, width: 50 })
  })

  it('a chain A–B–C where A and C do not overlap uses two columns', () => {
    const out = byId(layoutDayEvents([ev('a', 540, 600), ev('b', 570, 630), ev('c', 600, 660)]))
    expect(out.a).toMatchObject({ left: 0, width: 50 })
    expect(out.b).toMatchObject({ left: 50, width: 50 })
    expect(out.c).toMatchObject({ left: 0, width: 50 })
  })

  it('a nested event and identical times', () => {
    const nested = byId(layoutDayEvents([ev('outer', 540, 720), ev('inner', 600, 630)]))
    expect(nested.outer).toMatchObject({ left: 0, width: 50 })
    expect(nested.inner).toMatchObject({ left: 50, width: 50 })
    const same = layoutDayEvents([ev('a', 540, 600), ev('b', 540, 600), ev('c', 540, 600)])
    expect(same.map((o) => Math.round(o.left))).toEqual([0, 33, 67])
  })

  it('widens into free columns to the right', () => {
    // a and b overlap (2 columns); c starts after b ends, so it reuses column 1 beside a
    const out = byId(
      layoutDayEvents([ev('a', 540, 720), ev('b', 540, 570), ev('c', 600, 630), ev('d', 660, 690)]),
    )
    expect(out.a.width).toBe(50)
    expect(out.c).toMatchObject({ left: 50, width: 50 })
  })

  it('gives very short events the minimum height and clips at midnight', () => {
    const [short] = layoutDayEvents([ev('a', 600, 600)])
    expect(short.height).toBeCloseTo((15 / 1440) * 100)
    const [late] = layoutDayEvents([ev('b', 1430, 1440)])
    expect(late.top + late.height).toBeCloseTo(100)
  })
})

describe('eventMinutesOnDay', () => {
  it('clips an event crossing midnight to each day', () => {
    const e = { start: '2026-09-23T22:00:00Z', end: '2026-09-24T01:30:00Z' }
    expect(eventMinutesOnDay(e, '2026-09-23', 'UTC')).toEqual({ startMin: 1320, endMin: 1440 })
    expect(eventMinutesOnDay(e, '2026-09-24', 'UTC')).toEqual({ startMin: 0, endMin: 90 })
  })

  it('uses wall-clock minutes on a DST change day', () => {
    // 29 Mar 2026, London: clocks jump 01:00 → 02:00; a 09:00 BST event is 08:00 UTC
    const e = { start: '2026-03-29T08:00:00Z', end: '2026-03-29T09:00:00Z' }
    expect(eventMinutesOnDay(e, '2026-03-29', 'Europe/London')).toEqual({
      startMin: 540,
      endMin: 600,
    })
  })
})

describe('snapping', () => {
  it('minutesFromOffset snaps to 15 minutes and clamps', () => {
    expect(minutesFromOffset(56 * 9 + 20, 56)).toBe(9 * 60 + 15)
    expect(minutesFromOffset(-10, 56)).toBe(0)
    expect(minutesFromOffset(56 * 30, 56)).toBe(1440)
  })

  it('snapModifier rounds the vertical transform', () => {
    expect(snapModifier(14)({ transform: { x: 5, y: 20, scaleX: 1, scaleY: 1 } })).toEqual({
      x: 5,
      y: 14,
      scaleX: 1,
      scaleY: 1,
    })
  })
})

describe('applyMove / applyResize', () => {
  const timed = {
    all_day: false,
    starts_at: '2026-09-23T09:00:00.000Z',
    ends_at: '2026-09-23T10:30:00.000Z',
  }

  it('moves by minutes and days, keeping the duration', () => {
    expect(applyMove(timed, { minuteDelta: 45 }, 'UTC')).toEqual({
      starts_at: '2026-09-23T09:45:00.000Z',
      ends_at: '2026-09-23T11:15:00.000Z',
    })
    expect(applyMove(timed, { dayDelta: -2 }, 'UTC')).toEqual({
      starts_at: '2026-09-21T09:00:00.000Z',
      ends_at: '2026-09-21T10:30:00.000Z',
    })
  })

  it('keeps the wall-clock time when a day move crosses DST', () => {
    const e = {
      all_day: false,
      starts_at: '2026-10-24T08:00:00.000Z',
      ends_at: '2026-10-24T09:00:00.000Z',
    }
    // 09:00 BST on Sat → 09:00 GMT on Mon
    expect(applyMove(e, { dayDelta: 2 }, 'Europe/London')).toEqual({
      starts_at: '2026-10-26T09:00:00.000Z',
      ends_at: '2026-10-26T10:00:00.000Z',
    })
  })

  it('moves all-day events by days and keeps the all-day bounds', () => {
    const e = {
      all_day: true,
      starts_at: '2026-09-22T18:30:00.000Z',
      ends_at: '2026-09-23T18:29:59.999Z',
    }
    expect(applyMove(e, { dayDelta: 1 }, 'Asia/Kolkata')).toEqual({
      starts_at: '2026-09-23T18:30:00.000Z',
      ends_at: '2026-09-24T18:29:59.999Z',
    })
  })

  it('resizes with a 15-minute minimum', () => {
    expect(applyResize(timed, 30)).toEqual({ ends_at: '2026-09-23T11:00:00.000Z' })
    expect(applyResize(timed, -600)).toEqual({ ends_at: '2026-09-23T09:15:00.000Z' })
  })
})

describe('slot and task helpers', () => {
  it('slotToFormValues rolls a 24:00 end into the next day', () => {
    expect(slotToFormValues('2026-09-23', 1380, 1440)).toEqual({
      start_date: '2026-09-23',
      start_time: '23:00',
      end_date: '2026-09-24',
      end_time: '00:00',
      all_day: false,
    })
  })

  it('rescheduleTask shifts a start date that would pass the new due date', () => {
    expect(rescheduleTask({ start_date: null, due_date: '2026-09-25' }, '2026-09-20')).toEqual({
      due_date: '2026-09-20',
    })
    expect(
      rescheduleTask({ start_date: '2026-09-22', due_date: '2026-09-25' }, '2026-09-20'),
    ).toEqual({ due_date: '2026-09-20', start_date: '2026-09-17' })
    expect(
      rescheduleTask({ start_date: '2026-09-22', due_date: '2026-09-25' }, '2026-09-28'),
    ).toEqual({ due_date: '2026-09-28' })
  })
})

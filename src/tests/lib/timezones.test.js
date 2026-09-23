import { describe, expect, it } from 'vitest'
import { formatGmtOffset, listTimeZones } from '@/lib/timezones'

describe('timezones', () => {
  it('formats GMT offsets', () => {
    expect(formatGmtOffset('Asia/Kolkata')).toBe('GMT+5:30')
    expect(formatGmtOffset('UTC')).toBe('GMT')
    expect(formatGmtOffset('Not/AZone')).toBe('')
  })

  it('lists zones sorted by offset, including UTC and Kolkata', () => {
    const zones = listTimeZones(new Date(Date.UTC(2026, 0, 15)))
    const names = zones.map((z) => z.value)
    expect(names).toContain('UTC')
    expect(names.indexOf('America/New_York')).toBeLessThan(names.indexOf('Europe/London'))
  })

  it('always includes requested zones, such as a saved Asia/Kolkata', () => {
    const zones = listTimeZones(new Date(), ['Asia/Kolkata'])
    expect(zones.find((z) => z.value === 'Asia/Kolkata')?.offset).toBe('GMT+5:30')
    expect(new Set(zones.map((z) => z.value)).size).toBe(zones.length)
  })
})

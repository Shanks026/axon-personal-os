/** "GMT+5:30" for an IANA zone at a given instant ("GMT" for UTC). */
export function formatGmtOffset(timeZone, at = new Date()) {
  try {
    const part = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'shortOffset' })
      .formatToParts(at)
      .find((p) => p.type === 'timeZoneName')
    return part?.value ?? ''
  } catch {
    return ''
  }
}

/** Minutes east of UTC, parsed from the GMT label (used for sorting). */
function offsetMinutes(label) {
  const m = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(label)
  if (!m) return 0
  const minutes = Number(m[2]) * 60 + Number(m[3] ?? 0)
  return m[1] === '-' ? -minutes : minutes
}

/**
 * Every IANA zone the browser knows, as `{ value, offset }`, sorted by offset then name.
 * `include` guarantees extra zones are listed (browsers may only know a legacy alias,
 * e.g. Asia/Calcutta instead of Asia/Kolkata, and the saved value must stay selectable).
 */
export function listTimeZones(at = new Date(), include = []) {
  const zones =
    typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : []
  const all = [...new Set(['UTC', ...zones, ...include.filter(Boolean)])]
  return all
    .map((value) => ({ value, offset: formatGmtOffset(value, at) }))
    .sort(
      (a, b) => offsetMinutes(a.offset) - offsetMinutes(b.offset) || a.value.localeCompare(b.value),
    )
}

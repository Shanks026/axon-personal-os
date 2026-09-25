import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { parseISODate, toISODate, todayISO, zonedParts } from '@/lib/dates'
import { paths } from '@/lib/paths'
import { useSpace } from '@/context/SpaceContext'
import { useEvent } from '@/features/calendar/api'
import { DEFAULT_VIEW, ENABLED_VIEWS } from '@/features/calendar/constants'
import { getViewRange, isInRange, shiftDate } from '@/features/calendar/utils'
import { usePreferences } from '@/features/settings/api'

const isISODate = (v) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v) && toISODate(parseISODate(v)) === v

/**
 * The calendar's URL state: `?view=month|agenda` (Week and Day in Phase 2; anything else means
 * Month), `?date=yyyy-MM-dd` (missing or invalid means today in the profile time zone) and
 * `?event=<id>` (the open event). Navigation pushes history, so Back steps through months.
 *
 * A deep-linked `?event=<id>` jumps to the event's date once it loads (when that date isn't
 * already shown), redirects to the event's own space when it's outside the current scope, and
 * drops the param when the event is missing or in Trash. `linkedEvent` is the fetched row.
 */
export function useCalendarState() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { scopeSpaceIds, activeSpaces } = useSpace()
  const { weekStartsOn, timezone } = usePreferences()
  const today = todayISO(timezone)

  const rawView = params.get('view')
  const view = ENABLED_VIEWS.includes(rawView) ? rawView : DEFAULT_VIEW
  const rawDate = params.get('date')
  const date = isISODate(rawDate) ? rawDate : today
  const eventId = params.get('event')
  // Which way the last step went (-1 back, 1 forward, 0 a jump): drives the month slide.
  const [direction, setDirection] = useState(0)

  const range = useMemo(
    () => getViewRange(view, date, { weekStartsOn, timeZone: timezone }),
    [view, date, weekStartsOn, timezone],
  )

  const update = useCallback(
    (patch, { replace = false } = {}) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [key, value] of Object.entries(patch)) {
            if (value == null) next.delete(key)
            else next.set(key, value)
          }
          return next
        },
        { replace },
      ),
    [setParams],
  )

  const setView = useCallback((v) => update({ view: v === DEFAULT_VIEW ? null : v }), [update])
  const setDate = useCallback(
    (d, opts) => update({ date: d === today ? null : d }, opts),
    [update, today],
  )
  const step = useCallback(
    (dir) => {
      setDirection(dir)
      setDate(shiftDate(view, date, dir))
    },
    [setDate, view, date],
  )
  const goPrev = useCallback(() => step(-1), [step])
  const goNext = useCallback(() => step(1), [step])
  const goToday = useCallback(() => {
    setDirection(today < date ? -1 : today > date ? 1 : 0)
    setDate(today)
  }, [setDate, today, date])
  const openEvent = useCallback((id) => update({ event: id }), [update])
  const closeEvent = useCallback(() => update({ event: null }, { replace: true }), [update])

  const { data: linkedEvent } = useEvent(eventId)
  const handled = useRef(null)
  useEffect(() => {
    if (!eventId || linkedEvent === undefined || handled.current === eventId) return
    handled.current = eventId
    if (linkedEvent === null) {
      closeEvent()
      return
    }
    if (!scopeSpaceIds.includes(linkedEvent.space_id)) {
      const home = activeSpaces.find((s) => s.id === linkedEvent.space_id)
      if (home)
        navigate(paths.space(home.slug).calendar(Object.fromEntries(params)), { replace: true })
      else closeEvent()
      return
    }
    const start = zonedParts(linkedEvent.starts_at, timezone).isoDate
    if (!isInRange(range, start)) {
      update({ date: start === today ? null : start }, { replace: true })
    }
  }, [
    eventId,
    linkedEvent,
    scopeSpaceIds,
    activeSpaces,
    navigate,
    params,
    timezone,
    range,
    today,
    update,
    closeEvent,
  ])

  return {
    view,
    date,
    today,
    eventId,
    linkedEvent: linkedEvent ?? null,
    range,
    direction,
    weekStartsOn,
    timeZone: timezone,
    setView,
    setDate,
    goToday,
    goPrev,
    goNext,
    openEvent,
    closeEvent,
  }
}

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DEFAULT_EVENT_MINUTES,
  HOUR_HEIGHT,
  MIN_EVENT_MINUTES,
  SNAP_MINUTES,
} from '@/features/calendar/constants'

const DAY_MINUTES = 1440
const snapDown = (m) => Math.floor(m / SNAP_MINUTES) * SNAP_MINUTES
const snapNearest = (m) => Math.round(m / SNAP_MINUTES) * SNAP_MINUTES
const clamp = (m) => Math.min(DAY_MINUTES, Math.max(0, m))

/**
 * Click-drag on an empty part of a day column to pick a time range. Pointer down (on the column
 * itself, not on an event) snaps the start down to 15 minutes; moving tracks the end; pointer up
 * calls `onSelect(startMin, endMin)`. A plain click picks `DEFAULT_EVENT_MINUTES`. Esc cancels.
 * Returns `{ ghost, onPointerDown }`; `ghost` is `{ startMin, endMin }` while selecting.
 */
export function useSlotSelection({ onSelect }) {
  const [selection, setSelection] = useState(null)
  const cleanup = useRef(null)

  useEffect(() => () => cleanup.current?.(), [])

  const onPointerDown = useCallback(
    (e) => {
      if (e.button !== 0 || e.target !== e.currentTarget) return
      const column = e.currentTarget
      const top = column.getBoundingClientRect().top
      const toMinutes = (clientY) => clamp(((clientY - top) / HOUR_HEIGHT) * 60)
      const anchor = Math.min(DAY_MINUTES - SNAP_MINUTES, snapDown(toMinutes(e.clientY)))
      let current = anchor
      let moved = false
      setSelection({ anchor, current })

      const onMove = (ev) => {
        const next = snapNearest(toMinutes(ev.clientY))
        if (next === current) return
        moved = true
        current = next
        setSelection({ anchor, current })
      }
      const finish = (commit) => {
        cleanup.current?.()
        setSelection(null)
        if (!commit) return
        if (!moved || current === anchor) {
          onSelect(anchor, Math.min(DAY_MINUTES, anchor + DEFAULT_EVENT_MINUTES))
          return
        }
        const start = Math.min(anchor, current)
        const end = Math.max(Math.max(anchor, current), start + MIN_EVENT_MINUTES)
        onSelect(start, Math.min(DAY_MINUTES, end))
      }
      const onUp = () => finish(true)
      const onKey = (ev) => ev.key === 'Escape' && finish(false)

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointercancel', onUp)
      window.addEventListener('keydown', onKey)
      cleanup.current = () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        window.removeEventListener('pointercancel', onUp)
        window.removeEventListener('keydown', onKey)
        cleanup.current = null
      }
    },
    [onSelect],
  )

  const ghost = selection
    ? {
        startMin: Math.min(selection.anchor, selection.current),
        endMin: Math.max(
          Math.max(selection.anchor, selection.current),
          Math.min(selection.anchor, selection.current) + SNAP_MINUTES,
        ),
      }
    : null

  return { ghost, onPointerDown }
}

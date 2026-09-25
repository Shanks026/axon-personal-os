import { useCallback } from 'react'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { DEFAULT_LAYERS, LAYERS_STORAGE_KEY } from '@/features/calendar/constants'

/** Which extra layers the calendar shows (tasks / todos with a due date), remembered per device. */
export function useCalendarLayers() {
  const [stored, setStored] = useLocalStorage(LAYERS_STORAGE_KEY, DEFAULT_LAYERS)
  const layers = { ...DEFAULT_LAYERS, ...stored }
  const toggle = useCallback(
    (key) => setStored((prev) => ({ ...DEFAULT_LAYERS, ...prev, [key]: !(prev?.[key] ?? true) })),
    [setStored],
  )
  return { layers, toggle }
}

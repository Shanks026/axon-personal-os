import { useCallback } from 'react'
import { useSearchParams } from 'react-router'

export const GLOBAL_DIALOG_KINDS = ['task', 'todo', 'note', 'event', 'capture']

/**
 * The app-wide create dialogs, driven by `?new=<kind>` (Feature 12), so the palette (and later
 * shortcuts) can open one from any page without a React context. `open(kind, extra)` adds the
 * param (plus `extra`, e.g. `{ title }`) without a history entry; `close()` removes them again.
 */
export function useGlobalDialog() {
  const [params, setParams] = useSearchParams()
  const raw = params.get('new')
  const kind = GLOBAL_DIALOG_KINDS.includes(raw) ? raw : null

  const open = useCallback(
    (next, extra = {}) =>
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev)
          p.set('new', next)
          for (const [key, value] of Object.entries(extra)) {
            if (value) p.set(key, value)
          }
          return p
        },
        { replace: true },
      ),
    [setParams],
  )

  const close = useCallback(
    () =>
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev)
          p.delete('new')
          p.delete('title')
          return p
        },
        { replace: true },
      ),
    [setParams],
  )

  return { kind, raw, title: params.get('title') ?? '', open, close }
}

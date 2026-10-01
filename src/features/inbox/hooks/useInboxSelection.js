import { useCallback, useMemo, useState } from 'react'

/**
 * The inbox's multi-selection for bulk actions: `toggle(id)` (a click or X), `toggleRange(id)`
 * (Shift+click: every row from the last toggled one to `id`, in `ids` display order), `clear()`.
 * Ids no longer in `ids` (processed, moved away) drop out of `selectedIds` on their own.
 */
export function useInboxSelection(ids) {
  const [picked, setPicked] = useState(() => new Set())
  const [anchor, setAnchor] = useState(null)

  const selectedIds = useMemo(() => new Set(ids.filter((id) => picked.has(id))), [ids, picked])

  const toggle = useCallback((id) => {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setAnchor(id)
  }, [])

  const toggleRange = useCallback(
    (id) => {
      const from = anchor == null ? -1 : ids.indexOf(anchor)
      const to = ids.indexOf(id)
      if (from === -1 || to === -1) {
        toggle(id)
        return
      }
      const [a, b] = from < to ? [from, to] : [to, from]
      setPicked((prev) => {
        const next = new Set(prev)
        for (const rowId of ids.slice(a, b + 1)) next.add(rowId)
        return next
      })
      setAnchor(id)
    },
    [anchor, ids, toggle],
  )

  const clear = useCallback(() => {
    setPicked(new Set())
    setAnchor(null)
  }, [])

  return {
    selectedIds,
    count: selectedIds.size,
    isSelected: (id) => selectedIds.has(id),
    toggle,
    toggleRange,
    clear,
  }
}

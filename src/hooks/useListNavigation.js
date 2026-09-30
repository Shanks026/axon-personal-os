import { useCallback, useRef, useState } from 'react'
import { useShortcut } from '@/hooks/useShortcut'
import { useShortcutScope } from '@/hooks/useShortcutScope'

/**
 * Keyboard selection for a list (Feature 12): `j` / `k` (or the arrows) move a selection through
 * `items` in display order, scrolling it into view; the row actions (`lib/shortcuts.js`, group
 * Lists) act on the selected row, and Esc clears it. Only the ids in `actions` are bound, e.g.
 * `{ 'list.open': (row) => …, 'list.toggle': … }`.
 *
 * - `j` / `k` work while the list is on screen (scope `listNav`); the actions only while a row is
 *   selected (scope `list`), and then their keys win over the global ones (`e` edits, not New
 *   event).
 * - A selected row that disappears (deleted, filtered) hands the selection to its neighbour.
 * - Rows spread `getRowProps(id)`: `data-selected` (the style hook) and a ref for scrolling.
 *   Selection is keyboard-only, so there's no row click handler.
 */
export function useListNavigation({
  items,
  getId = (row) => row.id,
  actions = {},
  enabled = true,
}) {
  // The selection and where it was, so a row that goes away can hand over to its neighbour.
  const [selection, setSelection] = useState({ id: null, index: -1 })
  const rows = useRef(new Map())

  const ids = items.map(getId)
  let current = selection.id
  if (current != null && !ids.includes(current)) {
    // Adjusting state during render (React's pattern for props-driven updates), not in an effect.
    const fallback = ids[Math.min(selection.index, ids.length - 1)] ?? null
    setSelection({ id: fallback, index: fallback == null ? -1 : ids.indexOf(fallback) })
    current = fallback
  }
  const row = current == null ? null : items[ids.indexOf(current)]

  useShortcutScope('listNav', enabled)
  useShortcutScope('list', enabled && row != null)

  const select = useCallback((id, index) => {
    setSelection({ id, index })
    requestAnimationFrame(() => rows.current.get(id)?.scrollIntoView({ block: 'nearest' }))
  }, [])

  const move = (step) => {
    if (!ids.length) return
    const at = current == null ? -1 : ids.indexOf(current)
    const next = at === -1 ? (step > 0 ? 0 : ids.length - 1) : at + step
    if (next >= 0 && next < ids.length) select(ids[next], next)
  }

  const run = (id) => () => {
    if (row && actions[id]) actions[id](row)
  }

  useShortcut('list.next', () => move(1), { enabled })
  useShortcut('list.prev', () => move(-1), { enabled })
  useShortcut('list.open', run('list.open'), { enabled: enabled && !!actions['list.open'] })
  useShortcut('list.toggle', run('list.toggle'), { enabled: enabled && !!actions['list.toggle'] })
  useShortcut('list.edit', run('list.edit'), { enabled: enabled && !!actions['list.edit'] })
  useShortcut('list.status', run('list.status'), { enabled: enabled && !!actions['list.status'] })
  useShortcut('list.priority', run('list.priority'), {
    enabled: enabled && !!actions['list.priority'],
  })
  useShortcut('list.delete', run('list.delete'), { enabled: enabled && !!actions['list.delete'] })
  useShortcut('list.clear', () => setSelection({ id: null, index: -1 }), {
    enabled: enabled && row != null,
  })

  const getRowProps = useCallback(
    (id) => ({
      'data-selected': id === current || undefined,
      ref: (el) => {
        if (el) rows.current.set(id, el)
        else rows.current.delete(id)
      },
    }),
    [current],
  )

  return { selectedId: current, select: (id) => select(id, ids.indexOf(id)), getRowProps }
}

import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'

/**
 * Todos page state in the URL: `checklist` ('all' | 'hide', whether checklist items show) and
 * `highlight` (a todo id to scroll to and flash, consumed once by `useHighlightTodo`).
 */
export function useTodoFilters() {
  const [params, setParams] = useSearchParams()

  const filters = useMemo(
    () => ({
      checklist: params.get('checklist') === 'hide' ? 'hide' : 'all',
      highlight: params.get('highlight') ?? '',
    }),
    [params],
  )

  const setFilter = useCallback(
    (key, value) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (!value || (key === 'checklist' && value === 'all')) next.delete(key)
          else next.set(key, value)
          return next
        },
        { replace: true },
      )
    },
    [setParams],
  )

  const clearHighlight = useCallback(() => setFilter('highlight', ''), [setFilter])

  return { filters, setFilter, clearHighlight }
}

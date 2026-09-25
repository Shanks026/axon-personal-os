import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { NOTE_VIEWS } from '@/features/notes/constants'

/**
 * Notes page state in the URL: view (grid | table), q and tag[] (any-of). The last view is
 * also remembered per device; clearing filters keeps the view. There's no sort: notes are always
 * newest edit first.
 */
export function useNoteFilters() {
  const [params, setParams] = useSearchParams()
  const [lastView, setLastView] = useLocalStorage('axon:notes:view', 'grid')

  const filters = useMemo(() => {
    const view = params.get('view') ?? lastView
    return {
      view: NOTE_VIEWS.includes(view) ? view : 'grid',
      q: params.get('q') ?? '',
      tag: params.getAll('tag'),
    }
  }, [params, lastView])

  const setFilter = useCallback(
    (key, value) => {
      if (key === 'view') setLastView(value)
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.delete(key)
          const values = Array.isArray(value) ? value : [value]
          values.filter((v) => v !== '' && v != null).forEach((v) => next.append(key, v))
          return next
        },
        { replace: true },
      )
    },
    [setParams, setLastView],
  )

  const clear = useCallback(
    () =>
      setParams(
        (prev) => {
          const next = new URLSearchParams()
          if (prev.get('view')) next.set('view', prev.get('view'))
          return next
        },
        { replace: true },
      ),
    [setParams],
  )

  return { filters, setFilter, clear }
}

import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { TASK_TABS, TASK_VIEWS } from '@/features/tasks/constants'

const TABS = TASK_TABS.map((t) => t.value)

/**
 * Tasks page state in the URL (shareable, survives reloads): tab, view, status[], priority[],
 * tag[], due, q, and the table view's sort. The last view is also remembered per device and used
 * when the URL has none. Clearing filters keeps tab, view and sort.
 */
export function useTaskFilters() {
  const [params, setParams] = useSearchParams()
  const [lastView, setLastView] = useLocalStorage('axon:tasks:view', 'grid')

  const filters = useMemo(() => {
    const tab = params.get('tab')
    const view = params.get('view') ?? lastView
    return {
      tab: TABS.includes(tab) ? tab : 'all',
      view: TASK_VIEWS.includes(view) ? view : 'grid',
      status: params.getAll('status'),
      priority: params.getAll('priority'),
      tag: params.getAll('tag'),
      due: params.get('due') ?? '',
      q: params.get('q') ?? '',
      sort: params.get('sort') ?? '', // table view: 'due' or '-due' (descending)
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
          values
            .filter((v) => v !== '' && v != null && !(key === 'tab' && v === 'all'))
            .forEach((v) => next.append(key, v))
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
          for (const key of ['tab', 'view', 'sort']) if (prev.get(key)) next.set(key, prev.get(key))
          return next
        },
        { replace: true },
      ),
    [setParams],
  )

  const hasFilters =
    filters.status.length > 0 ||
    filters.priority.length > 0 ||
    filters.tag.length > 0 ||
    !!filters.due ||
    !!filters.q

  return { filters, setFilter, clear, hasFilters }
}

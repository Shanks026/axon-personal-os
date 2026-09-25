import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { DEFAULT_TASK_SORT, TASK_TABS, TASK_VIEWS } from '@/features/tasks/constants'

const TABS = TASK_TABS.map((t) => t.value)

/**
 * Tasks page state in the URL (shareable, survives reloads): tab, view, status[], priority[],
 * tag[], version[], due, q and sort. The last view and the last sort are also remembered per device
 * (localStorage) and used when the URL has none; the default sort is newest created first.
 * Clearing filters keeps tab, view and sort.
 */
export function useTaskFilters() {
  const [params, setParams] = useSearchParams()
  const [lastView, setLastView] = useLocalStorage('axon:tasks:view', 'grid')
  const [lastSort, setLastSort] = useLocalStorage('axon:tasks:sort', DEFAULT_TASK_SORT)

  const filters = useMemo(() => {
    const tab = params.get('tab')
    const view = params.get('view') ?? lastView
    return {
      tab: TABS.includes(tab) ? tab : 'all',
      view: TASK_VIEWS.includes(view) ? view : 'grid',
      status: params.getAll('status'),
      priority: params.getAll('priority'),
      tag: params.getAll('tag'),
      version: params.getAll('version'),
      due: params.get('due') ?? '',
      q: params.get('q') ?? '',
      // 'due' or '-due' (descending); 'manual' is the drag order. URL first, then this device's last choice.
      sort: params.get('sort') || lastSort || DEFAULT_TASK_SORT,
    }
  }, [params, lastView, lastSort])

  const setFilter = useCallback(
    (key, value) => {
      if (key === 'view') setLastView(value)
      // Clearing the sort (a table header's third click) means the default, which stays out of the URL.
      if (key === 'sort') {
        value = value || DEFAULT_TASK_SORT
        setLastSort(value)
        if (value === DEFAULT_TASK_SORT) value = ''
      }
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
    [setParams, setLastView, setLastSort],
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
    filters.version.length > 0 ||
    !!filters.due ||
    !!filters.q

  return { filters, setFilter, clear, hasFilters }
}

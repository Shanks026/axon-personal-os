import { useCallback } from 'react'
import { useSearchParams } from 'react-router'

/** The inbox tab in the URL: `?tab=processed`, else Open (the default stays out of the URL). */
export function useInboxTab() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'processed' ? 'processed' : 'open'
  const setTab = useCallback(
    (next) =>
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev)
          if (next === 'processed') p.set('tab', 'processed')
          else p.delete('tab')
          return p
        },
        { replace: true },
      ),
    [setParams],
  )
  return { tab, setTab }
}

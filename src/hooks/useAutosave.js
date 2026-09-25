import { useCallback, useEffect, useRef, useState } from 'react'
import { useDebouncedCallback } from 'use-debounce'

/**
 * Debounced autosave for editor surfaces (notes now; task pages, journal and reports later).
 * `schedule(patch)` merges the patch into the pending one (last write per key wins) and saves
 * after `delay` ms of quiet. Saves run one at a time, in order, so an older patch can never land
 * after a newer one. A failed save keeps its patch (newer edits win) and the next edit or
 * `flush()` retries it. Pending work is flushed on unmount and on `beforeunload`.
 *
 * @param {{ save: (patch: object) => Promise<unknown>, delay?: number }} options
 * @returns {{ schedule: (patch: object) => void, flush: () => Promise<void>, status: 'idle' | 'saving' | 'saved' | 'error' }}
 */
export function useAutosave({ save, delay = 800 }) {
  const [status, setStatus] = useState('idle')
  const saveRef = useRef(save)
  const pending = useRef({})
  const chain = useRef(Promise.resolve())

  useEffect(() => {
    saveRef.current = save
  }, [save])

  const run = useCallback(() => {
    chain.current = chain.current.then(async () => {
      const patch = pending.current
      if (!Object.keys(patch).length) return
      pending.current = {}
      setStatus('saving')
      try {
        await saveRef.current(patch)
        if (!Object.keys(pending.current).length) setStatus('saved')
      } catch {
        pending.current = { ...patch, ...pending.current }
        setStatus('error')
      }
    })
    return chain.current
  }, [])

  const debounced = useDebouncedCallback(run, delay)

  const schedule = useCallback(
    (patch) => {
      pending.current = { ...pending.current, ...patch }
      debounced()
    },
    [debounced],
  )

  const flush = useCallback(() => {
    debounced.cancel()
    return run()
  }, [debounced, run])

  useEffect(() => {
    const onBeforeUnload = () => {
      flush()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      flush()
    }
  }, [flush])

  return { schedule, flush, status }
}

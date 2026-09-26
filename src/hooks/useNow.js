import { useEffect, useState } from 'react'

/**
 * The current time, refreshed every `intervalMs` (default a minute). The first tick is aligned to
 * the next whole interval, so a minute clock changes on the minute. Shared: Dashboard reuses it.
 */
export function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    let interval
    const timeout = setTimeout(
      () => {
        setNow(new Date())
        interval = setInterval(() => setNow(new Date()), intervalMs)
      },
      intervalMs - (Date.now() % intervalMs),
    )
    return () => {
      clearTimeout(timeout)
      clearInterval(interval)
    }
  }, [intervalMs])
  return now
}

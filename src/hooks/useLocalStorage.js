import { useCallback, useState } from 'react'

function read(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key)
    return raw == null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

/**
 * useState persisted to localStorage (per-viewer conveniences only). Every read and write is
 * guarded, so a blocked or full storage just falls back to in-memory state.
 */
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => read(key, initialValue))

  const set = useCallback(
    (next) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next
        try {
          window.localStorage.setItem(key, JSON.stringify(resolved))
        } catch {
          // storage unavailable: keep the in-memory value
        }
        return resolved
      })
    },
    [key],
  )

  return [value, set]
}

/** One-off guarded helpers for code outside React state. */
export const storage = {
  get: read,
  set(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // ignore
    }
  },
}

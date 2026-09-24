import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'

const FLASH_MS = 900

/**
 * Scrolls to and flashes `?highlight=<id>` once the todo is in the loaded data (used by search
 * results and inbox triage links). Expands the Done group first if it's a done todo. Clears the
 * param when the flash finishes, or silently if the id never shows up once loading settles.
 */
export function useHighlightTodo({ todos, isLoading, highlightId, expandDone, clearHighlight }) {
  const [flashId, setFlashId] = useState(null)
  const reducedMotion = useReducedMotion()
  const startedFor = useRef(null)

  useEffect(() => {
    if (!highlightId || isLoading || startedFor.current === highlightId) return
    startedFor.current = highlightId
    const todo = todos.find((t) => t.id === highlightId)
    if (!todo) {
      clearHighlight()
      return
    }
    if (todo.is_done) expandDone()
    const raf = requestAnimationFrame(() => {
      document
        .getElementById(`todo-${highlightId}`)
        ?.scrollIntoView({ block: 'center', behavior: reducedMotion ? 'auto' : 'smooth' })
      setFlashId(highlightId)
    })
    return () => cancelAnimationFrame(raf)
  }, [todos, isLoading, highlightId, expandDone, clearHighlight, reducedMotion])

  useEffect(() => {
    if (!flashId) return
    const timer = setTimeout(() => {
      setFlashId(null)
      clearHighlight()
    }, FLASH_MS)
    return () => clearTimeout(timer)
  }, [flashId, clearHighlight])

  return flashId
}

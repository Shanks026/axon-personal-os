import { useEffect, useRef, useState } from 'react'

/**
 * Controlled open state for a Popover/DropdownMenu that should also open on hover, so a pointer
 * user can preview a chip's menu without a click (the user's request, 2026-09-25) while a
 * keyboard or touch user still opens it with a click or Enter, since the trigger's own click
 * behaviour is untouched. Spread `hoverProps` onto both the trigger and the content: entering
 * either cancels a pending close, so moving from one to the other doesn't flicker shut.
 */
export function useHoverOpen({ openDelay = 150, closeDelay = 250 } = {}) {
  const [open, setOpen] = useState(false)
  const timer = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  const schedule = (next, delay) => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setOpen(next), delay)
  }

  const hoverProps = {
    onMouseEnter: () => schedule(true, openDelay),
    onMouseLeave: () => schedule(false, closeDelay),
  }

  return { open, setOpen, hoverProps }
}

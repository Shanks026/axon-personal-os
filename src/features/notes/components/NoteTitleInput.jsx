import { useLayoutEffect, useRef } from 'react'

/**
 * The note's display-size title: a textarea that grows with its text, never wraps a newline in
 * (Enter calls `onEnter`, which moves focus into the body instead), capped at 300 characters.
 */
export function NoteTitleInput({ value, onChange, onEnter, autoFocus }) {
  const ref = useRef(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      maxLength={300}
      autoFocus={autoFocus}
      onChange={(e) => onChange(e.target.value.replace(/\n/g, ' '))}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
          e.preventDefault()
          onEnter?.()
        }
      }}
      placeholder="Untitled"
      aria-label="Note title"
      className="w-full resize-none overflow-hidden bg-transparent text-4xl font-semibold tracking-tight outline-none placeholder:text-faint"
    />
  )
}

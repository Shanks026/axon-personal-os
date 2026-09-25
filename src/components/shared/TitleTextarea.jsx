import { useCallback, useLayoutEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

/**
 * A large entity title (note editor, task detail): a textarea that grows with its text and
 * never takes a newline (Enter calls `onEnter` instead; Esc calls `onEscape`). Moved here from
 * the notes feature when the task detail page became its second user. `ref` reaches the
 * textarea (react-hook-form's `setFocus`); extra props (`aria-invalid`, `name`) pass through.
 */
export function TitleTextarea({
  value,
  onChange,
  onEnter,
  onEscape,
  onBlur,
  autoFocus,
  label,
  placeholder = 'Untitled',
  maxLength = 300,
  className,
  ref: outerRef,
  ...props
}) {
  const ref = useRef(null)
  const setRef = useCallback(
    (el) => {
      ref.current = el
      if (typeof outerRef === 'function') outerRef(el)
      else if (outerRef) outerRef.current = el
    },
    [outerRef],
  )

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  return (
    <textarea
      {...props}
      ref={setRef}
      rows={1}
      value={value}
      maxLength={maxLength}
      autoFocus={autoFocus}
      onChange={(e) => onChange(e.target.value.replace(/\n/g, ' '))}
      onBlur={onBlur}
      onKeyDown={(e) => {
        if (e.nativeEvent.isComposing) return
        if (e.key === 'Enter') {
          e.preventDefault()
          onEnter?.(e)
        }
        if (e.key === 'Escape') onEscape?.(e)
      }}
      placeholder={placeholder}
      aria-label={label}
      className={cn(
        'w-full resize-none overflow-hidden bg-transparent font-semibold tracking-tight text-pretty outline-none placeholder:text-faint',
        className,
      )}
    />
  )
}

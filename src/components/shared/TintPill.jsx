import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

/**
 * Filled pill in the tint recipe (design-system.md): 14% hue fill, 72% hue text, a leading dot.
 * Used for task/todo status. `tone` is any CSS colour (e.g. 'var(--warn)'). Renders a <button>
 * when `onClick` or `asButton` is given, so it can open a menu.
 */
export const TintPill = forwardRef(function TintPill(
  { tone, children, className, asButton, ...props },
  ref,
) {
  const Comp = asButton || props.onClick ? 'button' : 'span'
  return (
    <Comp
      ref={ref}
      type={Comp === 'button' ? 'button' : undefined}
      className={cn(
        'inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full tint px-2.25 text-xs font-medium whitespace-nowrap',
        Comp === 'button' &&
          'transition-opacity outline-none hover:opacity-85 focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
      style={{ '--tint': tone }}
      {...props}
    >
      <span className="size-1.5 shrink-0 rounded-full" style={{ background: tone }} aria-hidden />
      {children}
    </Comp>
  )
})

/** Outlined pill with a coloured dot (design: priority). */
export const DotPill = forwardRef(function DotPill(
  { tone, children, className, asButton, ...props },
  ref,
) {
  const Comp = asButton || props.onClick ? 'button' : 'span'
  return (
    <Comp
      ref={ref}
      type={Comp === 'button' ? 'button' : undefined}
      className={cn(
        'inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border px-2.25 text-xs font-medium whitespace-nowrap',
        Comp === 'button' &&
          'transition-colors outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
      {...props}
    >
      <span className="size-1.5 shrink-0 rounded-full" style={{ background: tone }} aria-hidden />
      {children}
    </Comp>
  )
})

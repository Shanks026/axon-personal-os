import { forwardRef } from 'react'
import { badgeClasses, dotClasses } from '@/lib/tint'
import { cn } from '@/lib/utils'

/**
 * Filled pill: a Tailwind colour-scale badge (`bg-{color}-100 text-{color}-700`, with a dark
 * variant), plus a solid dot in the same colour (the user's request, 2026-09-25 — no CSS colour
 * variables for badges). `color` is a colour key (e.g. 'blue'); see `lib/tint.js`. Renders a
 * <button> when `onClick` or `asButton` is given, so it can open a menu.
 */
export const TintPill = forwardRef(function TintPill(
  { color, children, className, asButton, ...props },
  ref,
) {
  const Comp = asButton || props.onClick ? 'button' : 'span'
  return (
    <Comp
      ref={ref}
      type={Comp === 'button' ? 'button' : undefined}
      className={cn(
        'inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.25 text-xs font-medium whitespace-nowrap',
        badgeClasses(color),
        Comp === 'button' &&
          'transition-opacity outline-none hover:opacity-85 focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
      {...props}
    >
      <span className={cn('size-1.5 shrink-0 rounded-full', dotClasses(color))} aria-hidden />
      {children}
    </Comp>
  )
})

/** Outlined pill with a coloured dot (design: priority). Same `color` key as `TintPill`. */
export const DotPill = forwardRef(function DotPill(
  { color, children, className, asButton, ...props },
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
      <span className={cn('size-1.5 shrink-0 rounded-full', dotClasses(color))} aria-hidden />
      {children}
    </Comp>
  )
})

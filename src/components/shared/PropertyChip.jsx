import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

/**
 * Compact property button for create/edit dialogs (design 04f): icon + value, 28px tall.
 * `empty` renders the label in faint text (e.g. "Due date" before one is picked).
 */
export const PropertyChip = forwardRef(function PropertyChip(
  { icon: Icon, iconStyle, children, empty = false, className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        'inline-flex h-7 max-w-full items-center gap-1.5 rounded-md border px-2.5 text-xs whitespace-nowrap transition-colors outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-accent',
        empty ? 'text-muted-foreground' : 'text-foreground',
        className,
      )}
      {...props}
    >
      {Icon && <Icon className="size-3.5 shrink-0" style={iconStyle} aria-hidden />}
      <span className="truncate">{children}</span>
    </button>
  )
})

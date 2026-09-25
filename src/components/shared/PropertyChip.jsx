import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

/**
 * Compact property button for create/edit dialogs (design 04f): icon + value, 32px tall, text-sm.
 * `empty` renders the label in faint text (e.g. "Due date" before one is picked).
 */
export const PropertyChip = forwardRef(function PropertyChip(
  {
    icon: Icon,
    iconStyle,
    iconClassName,
    iconProps,
    children,
    empty = false,
    className,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        'inline-flex h-8 max-w-full items-center gap-1.5 rounded-md border px-2.5 text-sm whitespace-nowrap transition-colors outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-accent',
        empty ? 'text-muted-foreground' : 'text-foreground',
        className,
      )}
      {...props}
    >
      {Icon && (
        <Icon
          className={cn('size-3.5 shrink-0', iconClassName)}
          style={iconStyle}
          aria-hidden
          {...iconProps}
        />
      )}
      <span className="truncate">{children}</span>
    </button>
  )
})

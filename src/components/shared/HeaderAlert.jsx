import { cn } from '@/lib/utils'

/** Page-header alert (design 04a): a red dot, "2 overdue", and an underlined action. */
export function HeaderAlert({ children, actionLabel, onAction, className }) {
  return (
    <span className={cn('flex items-center gap-2 text-sm font-medium text-destructive', className)}>
      <span className="size-1.75 rounded-full bg-destructive" aria-hidden />
      {children}
      {onAction && (
        <button
          type="button"
          onClick={onAction}
          className="rounded-sm underline underline-offset-3 outline-none hover:no-underline focus-visible:ring-2 focus-visible:ring-ring"
        >
          {actionLabel}
        </button>
      )}
    </span>
  )
}

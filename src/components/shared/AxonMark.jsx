import { cn } from '@/lib/utils'

/** Axon logo mark: a rounded foreground tile with a ring (from the design splash). */
export function AxonMark({ className }) {
  return (
    <div
      aria-hidden
      className={cn('flex size-8 items-center justify-center rounded-lg bg-foreground', className)}
    >
      <div className="size-2/5 rounded-full border-3 border-background" />
    </div>
  )
}

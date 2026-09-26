import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

/** The template's shape while a day loads: four section headings, each with a line under it. */
export function JournalSkeleton({ className }) {
  return (
    <div className={cn('flex flex-col gap-7', className)} aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <div key={i}>
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-3 h-4 w-3/4" />
        </div>
      ))}
    </div>
  )
}

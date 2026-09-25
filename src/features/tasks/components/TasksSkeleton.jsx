import { Skeleton } from '@/components/ui/skeleton'

/** Card-shaped skeletons (design 04e); the table view gets row-shaped ones. */
export function TasksSkeleton({ view }) {
  if (view === 'board') {
    return (
      <div className="flex gap-3.5 overflow-hidden" aria-hidden>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex w-67.5 shrink-0 flex-col gap-2.5 rounded-2xl bg-muted p-2.5">
            <Skeleton className="h-6 w-24 rounded-full bg-card" />
            {Array.from({ length: 3 - (i % 3) }, (_, j) => (
              <Skeleton key={j} className="h-28 rounded-xl bg-card" />
            ))}
          </div>
        ))}
      </div>
    )
  }
  if (view === 'table') {
    return (
      <div className="overflow-hidden rounded-xl border" aria-hidden>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex h-11 items-center gap-3 border-b px-3">
            <Skeleton className="size-4 rounded-full" />
            <Skeleton className="h-3 flex-1" style={{ maxWidth: `${40 + ((i * 17) % 40)}%` }} />
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" aria-hidden>
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-52 rounded-xl" />
      ))}
    </div>
  )
}

import { Skeleton } from '@/components/ui/skeleton'

/** Card-shaped skeletons for the grid; row-shaped ones for the table. */
export function NotesSkeleton({ view }) {
  if (view === 'table') {
    return (
      <div className="overflow-hidden rounded-xl border" aria-hidden>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex h-14 flex-col justify-center gap-2 border-b px-3">
            <Skeleton className="h-3" style={{ width: `${30 + ((i * 17) % 30)}%` }} />
            <Skeleton className="h-2.5" style={{ width: `${45 + ((i * 13) % 30)}%` }} />
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" aria-hidden>
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-40 rounded-xl" />
      ))}
    </div>
  )
}

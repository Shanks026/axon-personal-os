import { Skeleton } from '@/components/ui/skeleton'

/** Group-shaped skeleton for the Todos page: a header bar, then a few row placeholders. */
export function TodoListSkeleton() {
  return (
    <div className="mt-7 flex flex-col gap-5" aria-hidden>
      {[3, 2].map((rows, g) => (
        <div key={g}>
          <Skeleton className="h-4 w-20 rounded-sm" />
          <div className="mt-4 flex flex-col gap-3">
            {Array.from({ length: rows }, (_, i) => (
              <div key={i} className="flex h-10 items-center gap-3">
                <Skeleton className="size-4.25 rounded-md" />
                <Skeleton className="h-3 flex-1" style={{ maxWidth: `${50 + ((i * 23) % 35)}%` }} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

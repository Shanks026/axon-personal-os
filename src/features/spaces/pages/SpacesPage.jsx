import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { GLOBAL_SLUG, paths } from '@/lib/paths'
import { ErrorState } from '@/components/shared/ErrorState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useSpaces, useUpdateSpace } from '@/features/spaces/api'
import { ArchivedSpaces } from '@/features/spaces/components/ArchivedSpaces'
import { DeleteSpaceDialog } from '@/features/spaces/components/DeleteSpaceDialog'
import { GalleryHeader } from '@/features/spaces/components/GalleryHeader'
import { GlobalCard, NewSpaceCard } from '@/features/spaces/components/SpaceCard'
import { SpaceDialog } from '@/features/spaces/components/SpaceDialog'
import { SpaceGrid } from '@/features/spaces/components/SpaceGrid'
import { SpacesEmptyState } from '@/features/spaces/components/SpacesEmptyState'
import { splitSpaces } from '@/features/spaces/utils'

/** Full-screen space gallery (design 02a/02b): the first screen after signing in. */
export default function SpacesPage() {
  const navigate = useNavigate()
  const { data: spaces, isLoading, error, refetch } = useSpaces()
  const update = useUpdateSpace()
  const [dialog, setDialog] = useState({ open: false, space: null })
  const [deleting, setDeleting] = useState(null)
  // Set while entering the first space: keeps the first-run screen up until the route changes,
  // instead of flashing the populated gallery for a frame.
  const [enteringFirst, setEnteringFirst] = useState(false)

  const { active, archived } = splitSpaces(spaces)
  const isEmpty = enteringFirst || (!isLoading && !error && spaces?.length === 0)

  const openCreate = () => setDialog({ open: true, space: null })

  function toggleArchive(space) {
    const archiving = !space.archived_at
    update.mutate(
      { id: space.id, patch: { archived_at: archiving ? new Date().toISOString() : null } },
      {
        onSuccess: () =>
          toast(archiving ? `${space.name} archived` : `${space.name} restored`, {
            action: archiving
              ? {
                  label: 'Undo',
                  onClick: () => update.mutate({ id: space.id, patch: { archived_at: null } }),
                }
              : undefined,
          }),
      },
    )
  }

  const cardProps = (space) => ({
    to: paths.space(space.slug).dashboard(),
    onEdit: () => setDialog({ open: true, space }),
    onArchive: () => toggleArchive(space),
    onDelete: () => setDeleting(space),
  })

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <GalleryHeader />

      {isEmpty ? (
        <main className="flex flex-1 items-center justify-center px-4 pb-14">
          <SpacesEmptyState onCreate={openCreate} />
        </main>
      ) : (
        <main className="flex-1 px-4 py-10 md:px-10">
          <div className="mx-auto max-w-260">
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <h1 className="text-3xl font-semibold tracking-tight">Your spaces</h1>
                <p className="mt-1.5 text-muted-foreground">Pick where to work. Drag to reorder.</p>
              </div>
              <Button onClick={openCreate}>
                <Plus />
                New space
              </Button>
            </div>

            <div className="mt-7">
              {isLoading && <GallerySkeleton />}
              {error && <ErrorState error={error} onRetry={refetch} title="Couldn’t load spaces" />}
              {spaces && (
                <>
                  <SpaceGrid
                    spaces={active}
                    cardProps={cardProps}
                    onReorder={(id, position) => update.mutate({ id, patch: { position } })}
                    leading={
                      active.length > 0 && (
                        <GlobalCard
                          to={paths.space(GLOBAL_SLUG).dashboard()}
                          spaceCount={active.length}
                        />
                      )
                    }
                    trailing={<NewSpaceCard onClick={openCreate} />}
                  />
                  <ArchivedSpaces spaces={archived} cardProps={cardProps} />
                </>
              )}
            </div>
          </div>
        </main>
      )}

      <SpaceDialog
        open={dialog.open}
        space={dialog.space}
        onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
        onSuccess={(row) => {
          // First space ever: go straight in. SpaceBoundary records it as the last space.
          if (!spaces?.length) {
            setEnteringFirst(true)
            navigate(paths.space(row.slug).dashboard())
          }
        }}
      />
      <DeleteSpaceDialog
        space={deleting}
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
      />
    </div>
  )
}

function GallerySkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-44 rounded-2xl" />
      ))}
    </div>
  )
}

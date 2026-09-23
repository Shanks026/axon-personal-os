import { TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { useDeleteSpace } from '@/features/spaces/api'

/**
 * Permanent delete (design 02d): type the space's name to confirm. Everything inside cascades.
 * Per-type count tiles arrive with the features that own those tables (delta 03).
 */
export function DeleteSpaceDialog({ space, open, onOpenChange }) {
  const del = useDeleteSpace()

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        <span className="flex flex-col gap-3.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <TriangleAlert className="size-4.5" aria-hidden />
          </span>
          Delete “{space?.name}”?
        </span>
      }
      description="This permanently deletes the space and everything in it: tasks, todos, notes, journal entries, events and reports. It can’t be undone, and nothing goes to Trash."
      confirmLabel="Delete space"
      requireText={space?.name}
      pending={del.isPending}
      onConfirm={() =>
        del.mutate(space.id, {
          onSuccess: () => {
            onOpenChange(false)
            toast.success(`${space.name} deleted`)
          },
        })
      }
    />
  )
}

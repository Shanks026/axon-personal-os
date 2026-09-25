import { Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCreateAndOpenNote } from '@/features/notes/hooks/useCreateAndOpenNote'

/**
 * Creates an empty note and opens the editor at once. In Global the note goes to the default
 * space without asking (decision B); the editor shows which space it's in.
 */
export function NewNoteButton({ children = 'New note', ...props }) {
  const { createAndOpen, isPending, canCreate } = useCreateAndOpenNote()
  return (
    <Button
      className="h-9"
      onClick={() => createAndOpen()}
      disabled={isPending || !canCreate}
      {...props}
    >
      {isPending ? <Loader2 className="animate-spin" /> : <Plus />}
      {children}
    </Button>
  )
}

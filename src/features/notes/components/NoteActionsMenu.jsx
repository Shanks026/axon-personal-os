import { Copy, Ellipsis, Pin, PinOff, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

/**
 * Card, row and editor "⋮" menu: Pin/Unpin (unless `showPin` is off, as in the editor header,
 * which has its own pin button), Copy as Markdown (when `onCopyMarkdown` is given: the editor,
 * which has the full content) and Move to Trash.
 */
export function NoteActionsMenu({
  note,
  onTogglePin,
  onDelete,
  onCopyMarkdown,
  showPin = true,
  vertical = true,
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          className="text-faint"
          aria-label={`${note.title || 'Untitled'} options`}
        >
          <Ellipsis className={vertical ? 'rotate-90' : undefined} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {showPin && (
          <>
            <DropdownMenuItem onSelect={onTogglePin}>
              {note.pinned_at ? <PinOff /> : <Pin />}
              {note.pinned_at ? 'Unpin' : 'Pin'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {onCopyMarkdown && (
          <>
            <DropdownMenuItem onSelect={onCopyMarkdown}>
              <Copy />
              Copy as Markdown
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem variant="destructive" onSelect={onDelete}>
          <Trash2 />
          Move to Trash
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

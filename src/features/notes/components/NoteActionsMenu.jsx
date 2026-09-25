import { Ellipsis, Pin, PinOff, Trash2 } from 'lucide-react'
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
 * which has its own pin button) and Move to Trash. Phase 2 adds Copy as Markdown and Shortcuts.
 */
export function NoteActionsMenu({ note, onTogglePin, onDelete, showPin = true, vertical = true }) {
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
        <DropdownMenuItem variant="destructive" onSelect={onDelete}>
          <Trash2 />
          Move to Trash
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

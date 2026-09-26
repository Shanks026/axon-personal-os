import { Ellipsis, Eraser } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

/** The page header's "…" for a written day: Clear entry (to Trash, with Undo). */
export function JournalEntryMenu({ onClear }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground"
          aria-label="Entry options"
        >
          <Ellipsis />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem variant="destructive" onSelect={onClear}>
          <Eraser />
          Clear entry
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

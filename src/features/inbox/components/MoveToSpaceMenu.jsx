import { Check, Layers } from 'lucide-react'
import { useSpace } from '@/context/SpaceContext'
import { SpaceIcon } from '@/components/shared/SpaceIcon'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

/**
 * "Move to space" for an inbox item: the active spaces, plus Unsorted in Global. `children` is
 * the trigger (asChild). `onMove(spaceId | null)`; `current` (a space id, `null` for Unsorted, or
 * `undefined` for none: the bulk bar) is checked.
 */
export function MoveToSpaceMenu({ current, onMove, children, open, onOpenChange }) {
  const { isGlobal, activeSpaces } = useSpace()
  const controlled = open !== undefined ? { open, onOpenChange } : {}
  return (
    <DropdownMenu {...controlled}>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs text-faint">Move to</DropdownMenuLabel>
        {activeSpaces.map((s) => (
          <DropdownMenuItem key={s.id} onSelect={() => onMove(s.id)}>
            <SpaceIcon icon={s.icon} size="xs" />
            <span className="flex-1 truncate">{s.name}</span>
            {current === s.id && <Check className="size-3.5" aria-label="Current" />}
          </DropdownMenuItem>
        ))}
        {isGlobal && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onMove(null)}>
              <Layers className="size-4 text-muted-foreground" aria-hidden />
              <span className="flex-1">Unsorted</span>
              {current === null && <Check className="size-3.5" aria-label="Current" />}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

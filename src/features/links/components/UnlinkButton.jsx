import { AtSign, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/**
 * The unlink control on a linked note or task. A manual link gets a hover ✕ ("Unlink"). A
 * mention link gets a small @ instead (no word, the user's request): it follows the note's text,
 * so it can't be removed here; the tooltip says so.
 */
export function UnlinkButton({ source, label, onUnlink, className }) {
  if (source === 'mention') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            tabIndex={0}
            role="img"
            aria-label="Mentioned in the note"
            className={cn(
              'pointer-events-auto inline-flex size-6 shrink-0 items-center justify-center rounded-md text-faint outline-none hover:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring',
              className,
            )}
          >
            <AtSign className="size-3.5" aria-hidden />
          </span>
        </TooltipTrigger>
        <TooltipContent>Mentioned in the note · remove the mention to unlink</TooltipContent>
      </Tooltip>
    )
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onUnlink}
          aria-label={`Unlink ${label}`}
          className={cn(
            'pointer-events-auto text-faint opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
            className,
          )}
        >
          <X />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Unlink</TooltipContent>
    </Tooltip>
  )
}

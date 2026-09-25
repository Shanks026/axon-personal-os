import { AtSign, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/**
 * The unlink control on a linked note or task. A manual link gets a hover ✕ ("Unlink"). A
 * mention link gets a "Mentioned" badge instead: it follows the note's text, so it can't be
 * removed here ("Remove the mention in the note").
 */
export function UnlinkButton({ source, label, onUnlink, className }) {
  if (source === 'mention') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            tabIndex={0}
            className={cn(
              'pointer-events-auto inline-flex h-5 shrink-0 items-center gap-0.5 rounded-sm bg-muted px-1.5 text-xs text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring',
              className,
            )}
          >
            <AtSign className="size-3" aria-hidden />
            Mentioned
          </span>
        </TooltipTrigger>
        <TooltipContent>Remove the mention in the note to unlink</TooltipContent>
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

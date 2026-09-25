import { GitPullRequestArrow } from 'lucide-react'
import { useHoverOpen } from '@/hooks/useHoverOpen'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { linkHost } from '@/features/tasks/utils'

/**
 * A task's links (rows, cards, board): one icon, hover to preview every link (the user's
 * request, 2026-09-25 — a task can have more than one). Renders nothing without any links.
 */
export function TaskLinksButton({
  links,
  size = 'size-6.5',
  iconSize = 'size-3.25',
  className,
  triggerProps,
}) {
  const { open, setOpen, hoverProps } = useHoverOpen()
  if (!links?.length) return null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          {...hoverProps}
          {...triggerProps}
          aria-label={
            links.length === 1 ? `Open link (${linkHost(links[0].url)})` : `${links.length} links`
          }
          className={cn(
            'flex shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:text-foreground',
            size,
            // Several links: widen into a pill with the count beside the icon.
            links.length > 1 && 'w-auto gap-1 px-2',
            className,
          )}
        >
          <GitPullRequestArrow className={iconSize} />
          {links.length > 1 && (
            <span aria-hidden className="font-mono text-xs tabular-nums">
              {links.length}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-1.5" {...hoverProps}>
        <ul className="flex flex-col gap-0.5">
          {links.map((link) => (
            <li key={link.id}>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block truncate rounded-sm px-2 py-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                {link.label || linkHost(link.url)}
              </a>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}

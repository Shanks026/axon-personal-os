import { Settings } from 'lucide-react'
import { Link } from 'react-router'
import { paths } from '@/lib/paths'
import { UserMenu } from '@/components/layout/UserMenu'
import { AxonMark } from '@/components/shared/AxonMark'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/** Full-screen gallery header (design 02a): logo, settings, account menu. */
export function GalleryHeader() {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2.5 px-4 md:px-7">
      <AxonMark className="size-5.5" />
      <span className="text-base font-semibold tracking-tight">Axon</span>
      <div className="flex-1" />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button asChild variant="ghost" size="icon" aria-label="Settings">
            <Link to={paths.settings()}>
              <Settings />
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Settings</TooltipContent>
      </Tooltip>
      <UserMenu />
    </header>
  )
}

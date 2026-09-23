import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { paths } from '@/lib/paths'
import { useSpace } from '@/context/SpaceContext'
import { usePageHeaderState } from '@/components/layout/PageHeaderContext'
import { SpaceIcon } from '@/components/shared/SpaceIcon'
import { SidebarTrigger } from '@/components/ui/sidebar'

/** 48px breadcrumb bar (design delta G4): sidebar toggle · space › page title · actions. */
export function PageHeader() {
  const { title, actions } = usePageHeaderState()
  const { space, isGlobal, spaceSlug, activeSpaces } = useSpace()

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-background px-3 md:px-4">
      <SidebarTrigger className="text-muted-foreground" />
      {/* Plain divider: shadcn's vertical Separator forces self-stretch, which pinned it to the top. */}
      <span aria-hidden className="mx-1 h-4 w-px shrink-0 bg-border" />
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5">
        <Link
          to={paths.space(spaceSlug).dashboard()}
          className="flex min-w-0 items-center gap-1.5 rounded-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <SpaceIcon global={isGlobal} icon={space?.icon} size="xs" />
          <span className="truncate">{isGlobal ? 'Global' : space?.name}</span>
          {isGlobal && (
            <span className="font-mono text-xs text-faint">
              {activeSpaces.length} {activeSpaces.length === 1 ? 'space' : 'spaces'}
            </span>
          )}
        </Link>
        {title && (
          <>
            <ChevronRight className="size-3.5 shrink-0 text-faint" aria-hidden />
            <h1 className="truncate font-medium">{title}</h1>
          </>
        )}
      </nav>
      <div className="flex-1" />
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  )
}

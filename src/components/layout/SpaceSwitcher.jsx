import { useState } from 'react'
import { Check, ChevronsUpDown, LayoutGrid, Plus } from 'lucide-react'
import { Link } from 'react-router'
import { GLOBAL_SLUG, paths } from '@/lib/paths'
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
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar'
import { SpaceDialog } from '@/features/spaces/components/SpaceDialog'
import { useSwitchSpace } from '@/features/spaces/hooks/useSwitchSpace'

/** Sidebar header switcher (design Foundations → Space switcher): Global first, then spaces. */
export function SpaceSwitcher() {
  const { space, isGlobal, activeSpaces } = useSpace()
  const switchTo = useSwitchSpace()
  const [creating, setCreating] = useState(false)

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="h-10 data-[state=open]:bg-sidebar-accent"
              tooltip={isGlobal ? 'Global' : space?.name}
            >
              <SpaceIcon
                global={isGlobal}
                icon={space?.icon}
                color={space?.color}
                size="sm"
                className="size-6"
              />
              <span className="flex-1 truncate font-semibold tracking-tight">
                {isGlobal ? 'Global' : space?.name}
              </span>
              <ChevronsUpDown className="size-3.5 text-faint" aria-hidden />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-60" sideOffset={6}>
            <DropdownMenuLabel className="text-xs text-faint">Switch space</DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => switchTo(GLOBAL_SLUG)} className="h-8">
              <SpaceIcon global size="sm" />
              <span className="flex-1">Global</span>
              {isGlobal && <Check className="size-3.5" aria-label="Current" />}
            </DropdownMenuItem>
            {activeSpaces.map((s) => (
              <DropdownMenuItem key={s.id} onSelect={() => switchTo(s.slug)} className="h-8">
                <SpaceIcon icon={s.icon} color={s.color} size="sm" />
                <span className="flex-1 truncate">{s.name}</span>
                {s.id === space?.id && <Check className="size-3.5" aria-label="Current" />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setCreating(true)} className="text-muted-foreground">
              <Plus />
              New space…
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="text-muted-foreground">
              <Link to={paths.spaces()}>
                <LayoutGrid />
                Manage spaces…
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
      <SpaceDialog
        open={creating}
        onOpenChange={setCreating}
        onSuccess={(row) => switchTo(row.slug)}
      />
    </SidebarMenu>
  )
}

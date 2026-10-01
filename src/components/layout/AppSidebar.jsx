import { Monitor, Moon, Search, Settings, SquarePen, Sun, Trash2 } from 'lucide-react'
import { NavLink, useLocation } from 'react-router'
import { paths } from '@/lib/paths'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { useGlobalDialog } from '@/hooks/useGlobalDialog'
import { NAV_ITEMS } from '@/components/layout/navItems'
import { SpaceSwitcher } from '@/components/layout/SpaceSwitcher'
import { UserMenu } from '@/components/layout/UserMenu'
import { Kbd } from '@/components/shared/Kbd'
import { ShortcutKeys } from '@/components/shared/ShortcutKeys'
import { useTheme } from '@/components/theme/useTheme'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import { useMyProfile } from '@/features/auth/api'
import { useInboxCount } from '@/features/inbox/api'
import { useInboxScope } from '@/features/inbox/hooks/useInboxScope'
import { initials } from '@/features/settings/utils'
import { useSpacePaths } from '@/features/spaces/hooks/useSpacePaths'
import { sectionFromPath } from '@/features/spaces/utils'

const THEME_ICON = { light: Sun, dark: Moon, system: Monitor }

/**
 * App shell sidebar (design Sidebar.dc): switcher, search, capture, nav, pinned, footer.
 * `onOpenSearch` opens the command palette and `onOpenHelp` the shortcuts (the shell owns both).
 */
export function AppSidebar({ onOpenSearch, onOpenHelp }) {
  const { open: openDialog } = useGlobalDialog()
  // Open inbox items in this scope (Feature 13); optimistic on process, discard and move.
  const { data: inboxCount = 0 } = useInboxCount(useInboxScope())
  const p = useSpacePaths()
  const { pathname } = useLocation()
  const current = sectionFromPath(pathname)

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="gap-2 pt-2.5">
        <SpaceSwitcher />
        <SidebarMenu className="gap-1">
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Search"
              onClick={onOpenSearch}
              className="border bg-card text-muted-foreground group-data-[collapsible=icon]:border-transparent group-data-[collapsible=icon]:bg-transparent"
            >
              <Search />
              <span className="flex-1">Search</span>
              <Kbd shortcut="mod+k" />
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Quick capture"
              onClick={() => openDialog('capture')}
              className="text-muted-foreground"
            >
              <SquarePen />
              <span className="flex-1">Quick capture</span>
              <ShortcutKeys id="capture.open" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="pt-1">
          <SidebarGroupContent>
            <SidebarMenu className="gap-px">
              {NAV_ITEMS.map(({ section, label, icon: Icon }) => {
                const active = current === section
                return (
                  <SidebarMenuItem key={section}>
                    <SidebarMenuButton asChild isActive={active} tooltip={label}>
                      <NavLink to={p[section]()}>
                        <Icon className={cn(active ? 'text-space' : 'text-muted-foreground')} />
                        <span>{label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                    {section === 'inbox' && inboxCount > 0 && (
                      <SidebarMenuBadge className="text-muted-foreground tabular-nums">
                        {inboxCount > 99 ? '99+' : inboxCount}
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel className="text-faint">Pinned</SidebarGroupLabel>
          <SidebarGroupContent>
            <p className="px-2 text-xs text-faint">
              Pin tasks, notes and reports to keep them here.
            </p>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarSeparator className="mx-0" />
      <SidebarFooter className="gap-1">
        <SidebarMenu className="gap-px">
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={current === 'trash'} tooltip="Trash">
              <NavLink to={p.trash()}>
                <Trash2 className="text-muted-foreground" />
                <span>Trash</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Settings">
              <NavLink to={paths.settings()}>
                <Settings className="text-muted-foreground" />
                <span>Settings</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <UserRow onOpenHelp={onOpenHelp} />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

/** Footer user row: initials, name, current theme icon; opens the shared UserMenu. */
function UserRow({ onOpenHelp }) {
  const { user } = useAuth()
  const { data: profile } = useMyProfile()
  const { theme } = useTheme()
  const ThemeIcon = THEME_ICON[theme] ?? Monitor

  return (
    <UserMenu align="start" onOpenHelp={onOpenHelp}>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton size="lg" className="h-10" tooltip="Account">
          <Avatar className="size-6 border">
            <AvatarFallback className="bg-muted text-xs font-semibold">
              {initials(profile?.full_name, user?.email)}
            </AvatarFallback>
          </Avatar>
          <span className="flex-1 truncate font-medium">{profile?.full_name || user?.email}</span>
          <ThemeIcon className="size-3.5 text-faint" aria-hidden />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
    </UserMenu>
  )
}

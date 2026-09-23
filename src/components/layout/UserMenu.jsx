import { LogOut, Monitor, Moon, Settings, Sun } from 'lucide-react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { paths } from '@/lib/paths'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/components/theme/useTheme'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useMyProfile } from '@/features/auth/api'
import { initials } from '@/features/settings/utils'

/** Avatar menu: name/email, theme, Settings, Sign out. Used by the gallery header and the sidebar. */
export function UserMenu({ align = 'end', children }) {
  const { user, signOut } = useAuth()
  const { data: profile } = useMyProfile()
  const { theme, setTheme } = useTheme()
  const name = profile?.full_name || user?.email

  return (
    <DropdownMenu>
      {children ?? <DropdownMenuTriggerAvatar label={initials(profile?.full_name, user?.email)} />}
      <DropdownMenuContent align={align} className="w-56">
        <DropdownMenuLabel className="flex flex-col">
          <span className="truncate font-medium">{name}</span>
          {profile?.full_name && (
            <span className="truncate text-xs font-normal text-muted-foreground">
              {user?.email}
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            {theme === 'dark' ? <Moon /> : theme === 'light' ? <Sun /> : <Monitor />}
            Theme
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
              <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="system">System</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem asChild>
          <Link to={paths.settings()}>
            <Settings />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={() =>
            signOut().catch((err) => toast.error(err.message ?? 'Could not sign out'))
          }
        >
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function DropdownMenuTriggerAvatar({ label }) {
  return (
    <DropdownMenuTrigger
      className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label="Account menu"
    >
      <Avatar className="size-7 border">
        <AvatarFallback className="bg-muted text-xs font-semibold">{label}</AvatarFallback>
      </Avatar>
    </DropdownMenuTrigger>
  )
}

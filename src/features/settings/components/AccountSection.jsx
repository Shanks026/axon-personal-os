import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useMyProfile } from '@/features/auth/api'
import { useUpdateMyProfile } from '@/features/settings/api'
import { ChangePasswordDialog } from '@/features/settings/components/ChangePasswordDialog'
import { SettingsCard, SettingsRow } from '@/features/settings/components/SettingsCard'
import { initials } from '@/features/settings/utils'

/** Saves on blur or Enter; Esc reverts. Keyed by the saved name so it resets when that changes. */
function NameInput({ savedName }) {
  const update = useUpdateMyProfile()
  const [draft, setDraft] = useState(savedName)

  function commit() {
    const next = draft.trim()
    if (next === savedName) return
    if (next.length > 120) return toast.error('Names can be up to 120 characters')
    update.mutate({ full_name: next || null })
  }

  return (
    <Input
      id="full-name"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') setDraft(savedName)
      }}
      placeholder="Your name"
      autoComplete="name"
      className="w-65"
    />
  )
}

export function AccountSection() {
  const { user, signOut } = useAuth()
  const { data: profile } = useMyProfile()
  const [passwordOpen, setPasswordOpen] = useState(false)
  const savedName = profile?.full_name ?? ''

  return (
    <>
      <SettingsCard>
        <SettingsRow label="Initials avatar" description="Generated from your name.">
          <Avatar className="order-first size-12 border">
            <AvatarFallback className="bg-muted text-base font-semibold">
              {initials(savedName, user?.email)}
            </AvatarFallback>
          </Avatar>
        </SettingsRow>
        <SettingsRow label="Name" htmlFor="full-name">
          <NameInput key={savedName} savedName={savedName} />
        </SettingsRow>
        <SettingsRow label="Email">
          <span className="text-muted-foreground">{user?.email}</span>
        </SettingsRow>
        <SettingsRow label="Password" description="Choose a new one any time.">
          <Button variant="outline" onClick={() => setPasswordOpen(true)}>
            Change password
          </Button>
        </SettingsRow>
        <SettingsRow label="Sign out of Axon">
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={() =>
              signOut().catch((err) => toast.error(err.message ?? 'Could not sign out'))
            }
          >
            <LogOut />
            Sign out
          </Button>
        </SettingsRow>
      </SettingsCard>
      <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
    </>
  )
}

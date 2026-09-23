import { useEffect, useRef } from 'react'
import { useTheme } from '@/components/theme/useTheme'
import { useMyProfile } from '@/features/auth/api'
import { useUpdateMyProfile } from '@/features/settings/api'

/**
 * Keeps next-themes (per device) and profiles.theme (per account) in step. Renders nothing.
 * - When the profile first loads for a user, the profile wins.
 * - After that, any theme change anywhere (settings, toggle button) is saved to the profile.
 */
export function ProfileThemeSync() {
  const { theme, setTheme } = useTheme()
  const { data: profile } = useMyProfile()
  const { mutate } = useUpdateMyProfile()
  const syncedFor = useRef(null)

  useEffect(() => {
    if (!profile) return
    if (syncedFor.current !== profile.id) {
      syncedFor.current = profile.id
      if (profile.theme && profile.theme !== theme) setTheme(profile.theme)
      return
    }
    if (theme && theme !== profile.theme) mutate({ theme })
    // profile.theme is deliberately not a dependency: the optimistic update would re-trigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, theme])

  return null
}

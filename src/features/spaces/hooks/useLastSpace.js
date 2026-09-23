import { useCallback } from 'react'
import { GLOBAL_SLUG } from '@/lib/paths'
import { storage } from '@/hooks/useLocalStorage'
import { useMyProfile } from '@/features/auth/api'
import { useSetLastSpace, useSpaces } from '@/features/spaces/api'
import { splitSpaces } from '@/features/spaces/utils'

export const LAST_SPACE_KEY = 'axon:lastSpaceSlug'

/**
 * Where "home" is. Resolution order: this device's last slug (it's the most recent, and may be
 * Global), then the profile's last_space_id (cross-device), then the first active space.
 * `slug` is null when the user has no active spaces. `ready` is false while data loads.
 */
export function useLastSpace() {
  const { data: spaces, isLoading: spacesLoading } = useSpaces()
  const { data: profile, isLoading: profileLoading } = useMyProfile()
  const { active } = splitSpaces(spaces)

  let slug = null
  let space = null
  if (active.length) {
    const local = storage.get(LAST_SPACE_KEY, null)
    const fromProfile = active.find((s) => s.id === profile?.last_space_id)
    if (local === GLOBAL_SLUG) slug = GLOBAL_SLUG
    else space = active.find((s) => s.slug === local) ?? fromProfile ?? active[0]
    slug ??= space.slug
  }

  return { slug, space, ready: !spacesLoading && !profileLoading }
}

/** Records the current space on this device and (for real spaces) on the profile. */
export function useRememberSpace() {
  const setLastSpace = useSetLastSpace()
  return useCallback(
    (spaceSlug, spaceId) => {
      storage.set(LAST_SPACE_KEY, spaceSlug)
      if (spaceId) setLastSpace(spaceId)
    },
    [setLastSpace],
  )
}

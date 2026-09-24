import { useSpace } from '@/context/SpaceContext'
import { useMyProfile } from '@/features/auth/api'

/**
 * Default space for a create dialog (design 04f): the given `initial` value if any, else the
 * current space, else the profile's last active space, else the first active space. Shared by
 * `TaskDialog` and `TodoDialog` (moved here once the second one needed it).
 */
export function useDefaultSpaceId(initial) {
  const { space, activeSpaces } = useSpace()
  const { data: profile } = useMyProfile()
  const lastActive = activeSpaces.find((s) => s.id === profile?.last_space_id)?.id
  return initial ?? space?.id ?? lastActive ?? activeSpaces[0]?.id ?? ''
}

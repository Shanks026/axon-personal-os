import { useMemo } from 'react'
import { useSpace } from '@/context/SpaceContext'

/**
 * The inbox's scope params: inside a space `{ spaceIds: [space.id], includeUnsorted: false }`;
 * in Global every active space plus Unsorted (`space_id` null), so Unsorted items show only there.
 */
export function useInboxScope() {
  const { isGlobal, scopeSpaceIds } = useSpace()
  return useMemo(
    () => ({ spaceIds: scopeSpaceIds, includeUnsorted: isGlobal }),
    [scopeSpaceIds, isGlobal],
  )
}

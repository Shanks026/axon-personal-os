import { paths } from '@/lib/paths'
import { useSpace } from '@/context/SpaceContext'

/** `paths.space(currentSlug)`: section URLs bound to the active space. */
export function useSpacePaths() {
  const { spaceSlug } = useSpace()
  return paths.space(spaceSlug)
}

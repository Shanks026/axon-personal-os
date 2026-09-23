import { createContext, useContext, useMemo } from 'react'
import { GLOBAL_SLUG } from '@/lib/paths'
import { splitSpaces } from '@/features/spaces/utils'

const SpaceContext = createContext(null)

/**
 * Active space identity, resolved from the `:spaceSlug` route param (SpaceBoundary provides it).
 * `scopeSpaceIds` is what every scoped query filters by: [space.id], or all active spaces in Global.
 */
export function SpaceProvider({ spaceSlug, spaces, children }) {
  const value = useMemo(() => {
    const { active } = splitSpaces(spaces)
    const isGlobal = spaceSlug === GLOBAL_SLUG
    const space = isGlobal ? null : (active.find((s) => s.slug === spaceSlug) ?? null)
    return {
      spaceSlug,
      isGlobal,
      space,
      spaces,
      activeSpaces: active,
      scopeSpaceIds: isGlobal ? active.map((s) => s.id) : space ? [space.id] : [],
      spaceById: new Map(spaces.map((s) => [s.id, s])),
    }
  }, [spaceSlug, spaces])

  return <SpaceContext.Provider value={value}>{children}</SpaceContext.Provider>
}

export function useSpace() {
  const ctx = useContext(SpaceContext)
  if (!ctx) throw new Error('useSpace must be used inside a /s/:spaceSlug route')
  return ctx
}

/** Like useSpace, but returns null outside the app shell (e.g. /settings). */
export function useOptionalSpace() {
  return useContext(SpaceContext)
}

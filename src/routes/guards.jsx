import { useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link, Navigate, Outlet, useLocation } from 'react-router'
import { paths } from '@/lib/paths'
import { useAuth } from '@/context/AuthContext'
import { useSpace } from '@/context/SpaceContext'
import { ErrorPage } from '@/components/shared/ErrorPage'
import { Button } from '@/components/ui/button'
import { useLastSpace, useRememberSpace } from '@/features/spaces/hooks/useLastSpace'

// While auth resolves we render a plain background, never a splash or a redirect: a splash that
// flashes for a few frames reads as flicker (the same choice Tercero makes).
const BLANK = <div className="h-svh bg-background" aria-busy="true" />

/** Protected routes: blank while the session resolves, then /login if there's no session. */
export function RequireAuth() {
  const { session, loading } = useAuth()
  const location = useLocation()
  if (loading) return BLANK
  if (!session) return <Navigate to={paths.login()} state={{ from: location }} replace />
  return <Outlet />
}

/**
 * Auth pages. A signed-in user goes where they were heading (`state.from`), else /spaces.
 * This is also how successful login and signup navigate: the session appears and this redirects.
 */
export function PublicOnly() {
  const { session, loading } = useAuth()
  const location = useLocation()
  if (loading) return BLANK
  if (session) return <Navigate to={location.state?.from ?? paths.spaces()} replace />
  return <Outlet />
}

/**
 * `/`: back to the last used space (see useLastSpace), or the gallery when there are none.
 * AppShell has already loaded spaces and the profile, so this resolves on the first render.
 */
export function RootRedirect() {
  const { slug } = useLastSpace()
  return <Navigate to={slug ? paths.space(slug).dashboard() : paths.spaces()} replace />
}

/**
 * `/s/:spaceSlug`: AppShell resolves the space and provides SpaceContext; this guard shows a
 * friendly 404 for unknown or archived slugs and remembers valid ones as the last space.
 */
export function SpaceBoundary() {
  const { spaceSlug, space, isGlobal, spaces, activeSpaces } = useSpace()
  const remember = useRememberSpace()
  const exists = isGlobal ? activeSpaces.length > 0 : !!space
  const archived = spaces.find((s) => s.slug === spaceSlug && s.archived_at)

  useEffect(() => {
    if (exists) remember(spaceSlug, space?.id)
  }, [exists, spaceSlug, space?.id, remember])

  if (!exists) {
    return (
      <ErrorPage
        code="404"
        title={archived ? `${archived.name} is archived` : 'No space here'}
        description={
          archived
            ? 'Unarchive it from the spaces page to open it again.'
            : isGlobal
              ? 'Global shows everything across your spaces. Create a space first.'
              : 'This space was renamed, deleted, or never existed.'
        }
        actions={
          <Button asChild size="lg">
            <Link to={paths.spaces()}>
              <ArrowLeft />
              Back to spaces
            </Link>
          </Button>
        }
      />
    )
  }

  return <Outlet />
}

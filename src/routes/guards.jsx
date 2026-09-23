import { useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link, Navigate, Outlet, useLocation, useParams } from 'react-router'
import { GLOBAL_SLUG, paths } from '@/lib/paths'
import { useAuth } from '@/context/AuthContext'
import { SpaceProvider } from '@/context/SpaceContext'
import { AppLayout } from '@/components/layout/AppLayout'
import { ErrorPage } from '@/components/shared/ErrorPage'
import { ErrorState } from '@/components/shared/ErrorState'
import { Splash } from '@/components/shared/Splash'
import { Button } from '@/components/ui/button'
import { useSpaces } from '@/features/spaces/api'
import { useLastSpace, useRememberSpace } from '@/features/spaces/hooks/useLastSpace'
import { splitSpaces } from '@/features/spaces/utils'

/** Protected routes: a splash while the session resolves, then /login if there's no session. */
export function RequireAuth() {
  const { session, loading } = useAuth()
  const location = useLocation()
  if (loading) return <Splash />
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
  if (loading) return <Splash />
  if (session) return <Navigate to={location.state?.from ?? paths.spaces()} replace />
  return <Outlet />
}

/** `/`: back to the last used space (see useLastSpace), or the gallery when there are none. */
export function RootRedirect() {
  const { slug, ready } = useLastSpace()
  if (!ready) return <Splash />
  return <Navigate to={slug ? paths.space(slug).dashboard() : paths.spaces()} replace />
}

/**
 * `/s/:spaceSlug`: resolves the slug against the user's spaces, remembers it as the last space,
 * provides SpaceContext and renders the app shell. Unknown or archived slugs get a friendly 404.
 */
export function SpaceBoundary() {
  const { spaceSlug } = useParams()
  const { data: spaces, isLoading, error, refetch } = useSpaces()
  const remember = useRememberSpace()

  const { active } = splitSpaces(spaces)
  const isGlobal = spaceSlug === GLOBAL_SLUG
  const space = active.find((s) => s.slug === spaceSlug)
  const archived = spaces?.find((s) => s.slug === spaceSlug && s.archived_at)
  const exists = isGlobal ? active.length > 0 : !!space

  useEffect(() => {
    if (exists) remember(spaceSlug, space?.id)
  }, [exists, spaceSlug, space?.id, remember])

  if (isLoading) return <Splash />
  if (error) {
    return (
      <main className="flex min-h-svh items-center justify-center p-6">
        <ErrorState error={error} onRetry={refetch} title="Couldn’t load your spaces" />
      </main>
    )
  }
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

  return (
    <SpaceProvider spaceSlug={spaceSlug} spaces={spaces}>
      <AppLayout />
    </SpaceProvider>
  )
}

/** `/s/:spaceSlug/todos` → the Todos tab of the Tasks & Todos module (design delta G1). */
export function TodosRedirect() {
  const { spaceSlug } = useParams()
  return <Navigate to={paths.space(spaceSlug).todos()} replace />
}

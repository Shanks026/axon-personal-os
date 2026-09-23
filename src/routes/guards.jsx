import { Navigate, Outlet, useLocation, useParams } from 'react-router'
import { paths } from '@/lib/paths'
import { useAuth } from '@/context/AuthContext'
import { Splash } from '@/components/shared/Splash'

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

/** `/`: Feature 03 resolves the last used space, falling back to /spaces. */
export function RootRedirect() {
  return <Navigate to={paths.spaces()} replace />
}

/** `/s/:spaceSlug`: Feature 03 resolves the slug, provides SpaceContext and renders AppLayout. */
export function SpaceBoundary() {
  return <Outlet />
}

/** `/s/:spaceSlug/todos` → the Todos tab of the Tasks & Todos module (design delta G1). */
export function TodosRedirect() {
  const { spaceSlug } = useParams()
  return <Navigate to={paths.space(spaceSlug).todos()} replace />
}

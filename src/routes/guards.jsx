import { Navigate, Outlet, useParams } from 'react-router'
import { paths } from '@/lib/paths'

// Stubs. Feature 02 adds the session checks, and Feature 03 adds space resolution and last-space memory.

/** Protected routes. Feature 02: splash while loading, redirect to /login without a session. */
export function RequireAuth() {
  return <Outlet />
}

/** Auth pages. Feature 02: redirect signed-in users to /. */
export function PublicOnly() {
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

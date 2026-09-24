import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '@/App'
import { queryClient } from '@/lib/queryClient'
import RouteErrorPage from '@/features/system/pages/RouteErrorPage'
import { routes } from '@/routes/router'

const auth = vi.hoisted(() => ({ state: { session: null, user: null, loading: false } }))

// Supabase: spaces come from db.spaces; the profile has no last space yet.
const db = vi.hoisted(() => ({ spaces: [] }))
vi.mock('@/lib/supabase', () => {
  const ok = (data) => Promise.resolve({ data, error: null })
  const from = () => ({
    select: () => ({
      order: () => ok(db.spaces),
      eq: () => ({ single: () => ok({ id: 'u1', last_space_id: null, theme: 'system' }) }),
    }),
    update: () => ({ eq: () => ok(null) }),
  })
  return { supabase: { from } }
})

const THMP = {
  id: 'sp1',
  name: 'THMP',
  slug: 'thmp',
  color: 'blue',
  icon: '💼',
  position: 1000,
  archived_at: null,
  created_at: '2026-09-01T00:00:00Z',
}

vi.mock('@/context/AuthContext', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => ({ ...auth.state, signOut: async () => {} }),
}))

const signedIn = () => {
  queryClient.clear()
  db.spaces = [THMP]
  localStorage.clear()
  const user = { id: 'u1', email: 'me@example.com' }
  auth.state = { session: { access_token: 't', user }, user, loading: false }
}
const signedOut = () => {
  queryClient.clear()
  auth.state = { session: null, user: null, loading: false }
}

function renderAt(path, routeTree = routes) {
  const router = createMemoryRouter(routeTree, { initialEntries: [path] })
  render(<App router={router} />)
  return router
}

describe('router (signed in)', () => {
  beforeEach(signedIn)

  it.each([
    ['/spaces', 'Your spaces'],
    ['/s/thmp/dashboard', 'Dashboard'],
    ['/s/thmp/inbox', 'Inbox'],
    ['/s/thmp/tasks', 'Tasks'],
    ['/s/thmp/todos', 'Todos'],
    ['/s/thmp/tasks/t1', 'Task'],
    ['/s/global/notes', 'Notes'],
    ['/s/thmp/notes/n1', 'Note'],
    ['/s/thmp/journal', 'Journal'],
    ['/s/thmp/journal/2026-09-23', 'Journal'],
    ['/s/thmp/calendar', 'Calendar'],
    ['/s/thmp/reports', 'Reports'],
    ['/s/thmp/reports/r1', 'Report'],
    ['/s/thmp/trash', 'Trash'],
  ])('%s renders its page', async (path, title) => {
    renderAt(path)
    // Level 1 is the shell breadcrumb title; some pages also repeat it as a large heading.
    expect(await screen.findByRole('heading', { level: 1, name: title })).toBeInTheDocument()
  })

  it('redirects / to the first space when nothing is remembered', async () => {
    const router = renderAt('/')
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/s/thmp/dashboard')
  })

  it('redirects / to the space remembered on this device (including Global)', async () => {
    localStorage.setItem('axon:lastSpaceSlug', JSON.stringify('global'))
    const router = renderAt('/')
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/s/global/dashboard')
  })

  it('redirects / to the gallery when there are no spaces', async () => {
    db.spaces = []
    const router = renderAt('/')
    expect(
      await screen.findByRole('heading', { name: 'Create your first space' }),
    ).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/spaces')
  })

  it('renders the shell: switcher, sections and breadcrumb', async () => {
    renderAt('/s/thmp/notes')
    expect(await screen.findByRole('heading', { name: 'Notes' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Tasks' })).toHaveAttribute('href', '/s/thmp/tasks')
    expect(screen.getByRole('link', { name: 'Notes' })).toHaveAttribute('data-active', 'true')
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toHaveTextContent('THMP')
    expect(localStorage.getItem('axon:lastSpaceSlug')).toBe('"thmp"')
  })

  it('switching space keeps the section and drops detail routes', async () => {
    const user = userEvent.setup()
    const router = renderAt('/s/thmp/tasks/t1')
    await screen.findByRole('heading', { name: 'Task' })
    await user.click(screen.getAllByRole('button', { name: /THMP/ })[0])
    await user.click(await screen.findByRole('menuitem', { name: /Global/ }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/s/global/tasks'))
    await waitFor(() =>
      expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toHaveTextContent(
        /Global\s*1 space/,
      ),
    )
  })

  it('shows a friendly 404 for unknown and archived spaces', async () => {
    db.spaces = [THMP, { ...THMP, id: 'sp2', name: 'Old', slug: 'old', archived_at: '2026-09-10' }]
    renderAt('/s/nope/tasks')
    expect(await screen.findByRole('heading', { name: 'No space here' })).toBeInTheDocument()
    cleanup()
    renderAt('/s/old/tasks')
    expect(await screen.findByRole('heading', { name: 'Old is archived' })).toBeInTheDocument()
  })

  it('shows a 404 for Global when there are no spaces', async () => {
    db.spaces = []
    renderAt('/s/global/dashboard')
    expect(await screen.findByRole('heading', { name: 'No space here' })).toBeInTheDocument()
  })

  it('redirects a space root to its dashboard', async () => {
    const router = renderAt('/s/thmp')
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/s/thmp/dashboard')
  })

  it.each(['/login', '/signup', '/forgot-password'])(
    'sends a signed-in user away from %s to /spaces',
    async (path) => {
      const router = renderAt(path)
      expect(await screen.findByRole('heading', { name: 'Your spaces' })).toBeInTheDocument()
      expect(router.state.location.pathname).toBe('/spaces')
    },
  )

  it('shows the reset form for a recovery session', async () => {
    renderAt('/reset-password')
    expect(
      await screen.findByRole('heading', { name: 'Choose a new password' }),
    ).toBeInTheDocument()
    expect(screen.getByText('For me@example.com')).toBeInTheDocument()
  })

  it('renders NotFoundPage for unknown URLs', async () => {
    renderAt('/definitely/not/here')
    expect(await screen.findByRole('heading', { name: 'Nothing here' })).toBeInTheDocument()
  })

  it('renders RouteErrorPage when a page throws', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    function Boom() {
      throw new Error('kaboom')
    }
    renderAt('/boom', [{ path: '/boom', Component: Boom, errorElement: <RouteErrorPage /> }])
    expect(
      await screen.findByRole('heading', { name: 'Something broke on our side' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/^ref /)).toBeInTheDocument()
  })
})

describe('router (signed out)', () => {
  beforeEach(signedOut)

  it.each(['/', '/spaces', '/settings', '/s/thmp/tasks'])(
    'redirects %s to /login and remembers where it was going',
    async (path) => {
      const router = renderAt(path)
      expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
      expect(router.state.location.pathname).toBe('/login')
      expect(router.state.location.state?.from?.pathname).toBe(path)
    },
  )

  it.each([
    ['/signup', 'Create your account'],
    ['/forgot-password', 'Reset your password'],
    ['/reset-password', 'This link has expired'],
    ['/auth/callback', 'That link didn’t work'],
  ])('%s renders without a session', async (path, title) => {
    renderAt(path)
    expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument()
  })

  it('shows a blank screen (no splash, no /login) while the session is loading', async () => {
    auth.state = { session: null, user: null, loading: true }
    const router = renderAt('/spaces')
    await waitFor(() => expect(document.querySelector('[aria-busy="true"]')).toBeInTheDocument())
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/spaces')
  })
})

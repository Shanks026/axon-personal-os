import { render, screen } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '@/App'
import RouteErrorPage from '@/features/system/pages/RouteErrorPage'
import { routes } from '@/routes/router'

const auth = vi.hoisted(() => ({ state: { session: null, user: null, loading: false } }))

vi.mock('@/context/AuthContext', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => ({ ...auth.state, signOut: async () => {} }),
}))

const signedIn = () => {
  const user = { id: 'u1', email: 'me@example.com' }
  auth.state = { session: { access_token: 't', user }, user, loading: false }
}
const signedOut = () => {
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
    ['/spaces', 'Spaces'],
    ['/s/thmp/dashboard', 'Dashboard'],
    ['/s/thmp/inbox', 'Inbox'],
    ['/s/thmp/tasks', 'Tasks & Todos'],
    ['/s/thmp/tasks/t1', 'Task'],
    ['/s/global/notes', 'Notes'],
    ['/s/thmp/notes/n1', 'Note'],
    ['/s/thmp/journal', 'Journal'],
    ['/s/thmp/journal/2026-09-23', 'Journal'],
    ['/s/thmp/calendar', 'Calendar'],
    ['/s/thmp/reports', 'Reports'],
    ['/s/thmp/reports/r1', 'Report'],
    ['/s/thmp/trash', 'Trash'],
  ])('%s renders its placeholder', async (path, title) => {
    renderAt(path)
    expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument()
  })

  it('redirects / to /spaces', async () => {
    const router = renderAt('/')
    expect(await screen.findByRole('heading', { name: 'Spaces' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/spaces')
  })

  it('redirects a space root to its dashboard', async () => {
    const router = renderAt('/s/thmp')
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/s/thmp/dashboard')
  })

  it('redirects todos to the Todos tab of Tasks & Todos', async () => {
    const router = renderAt('/s/thmp/todos')
    expect(await screen.findByRole('heading', { name: 'Tasks & Todos' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/s/thmp/tasks')
    expect(router.state.location.search).toBe('?tab=todos')
  })

  it.each(['/login', '/signup', '/forgot-password'])(
    'sends a signed-in user away from %s to /spaces',
    async (path) => {
      const router = renderAt(path)
      expect(await screen.findByRole('heading', { name: 'Spaces' })).toBeInTheDocument()
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

  it('shows the splash, not /login, while the session is loading', async () => {
    auth.state = { session: null, user: null, loading: true }
    const router = renderAt('/spaces')
    expect(await screen.findByRole('status')).toHaveTextContent('Syncing your spaces')
    expect(router.state.location.pathname).toBe('/spaces')
  })
})

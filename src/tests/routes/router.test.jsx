import { render, screen } from '@testing-library/react'
import { createMemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import App from '@/App'
import RouteErrorPage from '@/features/system/pages/RouteErrorPage'
import { routes } from '@/routes/router'

function renderAt(path, routeTree = routes) {
  const router = createMemoryRouter(routeTree, { initialEntries: [path] })
  render(<App router={router} />)
  return router
}

describe('router', () => {
  it.each([
    ['/login', 'Log in'],
    ['/signup', 'Sign up'],
    ['/forgot-password', 'Forgot password'],
    ['/reset-password', 'Reset password'],
    ['/spaces', 'Spaces'],
    ['/settings', 'Settings'],
    ['/settings/preferences', 'Settings'],
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

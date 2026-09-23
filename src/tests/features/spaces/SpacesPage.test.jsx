import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import SpacesPage from '@/features/spaces/pages/SpacesPage'

const db = vi.hoisted(() => ({ spaces: [], calls: [] }))

vi.mock('@/context/AuthContext', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => ({
    session: { access_token: 't' },
    user: { id: 'u1', email: 'me@example.com' },
    loading: false,
    signOut: vi.fn(async () => {}),
  }),
}))

// Fluent in-memory mock of the spaces table (plus profiles for last_space_id and the menu).
vi.mock('@/lib/supabase', () => {
  const ok = (data) => Promise.resolve({ data, error: null })
  const table = (name) => ({
    select: () => ({
      order: () => ok([...db.spaces].sort((a, b) => a.position - b.position)),
      eq: () => ({ single: () => ok({ id: 'u1', full_name: 'Aditya Rao', theme: 'system' }) }),
    }),
    insert: (values) => ({
      select: () => ({
        single: () => {
          db.calls.push(['insert', name, values])
          const row = {
            id: `s${db.spaces.length + 1}`,
            archived_at: null,
            created_at: '2026-09-23T10:00:00Z',
            ...values,
          }
          db.spaces.push(row)
          return ok(row)
        },
      }),
    }),
    update: (patch) => ({
      eq: (_col, id) => {
        db.calls.push(['update', name, id, patch])
        if (name === 'spaces')
          db.spaces = db.spaces.map((s) => (s.id === id ? { ...s, ...patch } : s))
        const res = ok(db.spaces.find((s) => s.id === id) ?? {})
        return Object.assign(res, { select: () => ({ single: () => res }) })
      },
    }),
    delete: () => ({
      eq: (_col, id) => {
        db.calls.push(['delete', name, id])
        db.spaces = db.spaces.filter((s) => s.id !== id)
        return ok(null)
      },
    }),
  })
  return { supabase: { from: table } }
})

const space = (id, name, slug, position, extra = {}) => ({
  id,
  name,
  slug,
  position,
  color: 'blue',
  icon: 'briefcase',
  description: null,
  archived_at: null,
  created_at: '2026-09-01T10:00:00Z',
  ...extra,
})

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(
    [
      { path: '/spaces', Component: SpacesPage },
      { path: '/s/:slug/dashboard', element: <p>dashboard</p> },
    ],
    { initialEntries: ['/spaces'] },
  )
  render(
    <ThemeProvider>
      <QueryClientProvider client={qc}>
        <TooltipProvider>
          <RouterProvider router={router} />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>,
  )
  return router
}

beforeEach(() => {
  db.spaces = []
  db.calls = []
})

describe('SpacesPage', () => {
  it('shows the first-run state and creates a first space, then goes into it', async () => {
    const user = userEvent.setup()
    const router = renderPage()

    await user.click(await screen.findByRole('button', { name: 'Create a space' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Name'), 'THMP Marketplace')
    expect(within(dialog).getByText('thmp-marketplace')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('radio', { name: 'teal' }))
    await user.click(within(dialog).getByRole('radio', { name: 'rocket' }))
    await user.click(within(dialog).getByRole('button', { name: /create space/i }))

    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/s/thmp-marketplace/dashboard'),
    )
    const insert = db.calls.find((c) => c[0] === 'insert')
    expect(insert[2]).toMatchObject({
      name: 'THMP Marketplace',
      slug: 'thmp-marketplace',
      color: 'teal',
      icon: 'rocket',
      description: null,
      position: 1000,
    })
    // last_space_id remembered
    expect(db.calls.some((c) => c[0] === 'update' && c[1] === 'profiles')).toBe(true)
  })

  it('lists Global first, then spaces in order, with archived ones collapsed', async () => {
    db.spaces = [
      space('a', 'Personal', 'personal', 2000, { color: 'green' }),
      space('b', 'THMP', 'thmp', 1000),
      space('c', 'Old', 'old', 3000, { archived_at: '2026-09-10T00:00:00Z' }),
    ]
    const user = userEvent.setup()
    renderPage()

    const links = await screen.findAllByRole('link', { name: /^Open / })
    expect(links.map((l) => l.getAttribute('aria-label'))).toEqual([
      'Open Global',
      'Open THMP',
      'Open Personal',
    ])
    expect(screen.getByText('2 spaces')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /archived/i }))
    expect(await screen.findByRole('link', { name: 'Open Old' })).toBeInTheDocument()
  })

  it('flags a slug that is already taken', async () => {
    db.spaces = [space('b', 'THMP', 'thmp', 1000)]
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /^new space$/i }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Name'), 'THMP')
    // Auto slug avoids the clash…
    expect(within(dialog).getByText('thmp-2')).toBeInTheDocument()
    // …but a hand-typed duplicate is rejected inline.
    await user.click(within(dialog).getByRole('button', { name: 'Edit URL name' }))
    const slugInput = within(dialog).getByLabelText('URL name')
    await user.clear(slugInput)
    await user.type(slugInput, 'thmp')
    await user.click(within(dialog).getByRole('button', { name: /create space/i }))
    expect(
      await within(dialog).findByText('You already have a space at this URL'),
    ).toBeInTheDocument()
    expect(db.calls.some((c) => c[0] === 'insert')).toBe(false)
  })

  it('archives a space from its menu', async () => {
    db.spaces = [space('b', 'THMP', 'thmp', 1000), space('a', 'Personal', 'personal', 2000)]
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Personal options' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Archive' }))

    await waitFor(() =>
      expect(db.calls).toContainEqual(expect.arrayContaining(['update', 'spaces', 'a'])),
    )
    const patch = db.calls.find((c) => c[0] === 'update' && c[2] === 'a')[3]
    expect(patch.archived_at).toBeTruthy()
    await waitFor(() =>
      expect(screen.queryByRole('link', { name: 'Open Personal' })).not.toBeInTheDocument(),
    )
  })

  it('only deletes after typing the exact name', async () => {
    db.spaces = [space('b', 'THMP', 'thmp', 1000)]
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'THMP options' }))
    await user.click(await screen.findByRole('menuitem', { name: /delete/i }))
    const dialog = await screen.findByRole('alertdialog')
    const confirm = within(dialog).getByRole('button', { name: 'Delete space' })
    expect(confirm).toBeDisabled()

    await user.type(within(dialog).getByLabelText(/to confirm/i), 'thmp')
    expect(confirm).toBeDisabled()
    await user.clear(within(dialog).getByLabelText(/to confirm/i))
    await user.type(within(dialog).getByLabelText(/to confirm/i), 'THMP')
    await user.click(confirm)

    await waitFor(() => expect(db.calls).toContainEqual(['delete', 'spaces', 'b']))
    expect(await screen.findByRole('button', { name: 'Create a space' })).toBeInTheDocument()
  })
})

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SpaceProvider } from '@/context/SpaceContext'
import { PageHeaderProvider } from '@/components/layout/PageHeaderContext'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import TasksPage from '@/features/tasks/pages/TasksPage'

const db = vi.hoisted(() => ({ tasks: [], calls: [] }))

vi.mock('@/context/AuthContext', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => ({ session: {}, user: { id: 'u1' }, loading: false, signOut: async () => {} }),
}))

// Chainable in-memory stand-in for supabase.from(...). Filters are ignored except space scoping.
vi.mock('@/lib/supabase', () => {
  const result = (data) => Promise.resolve({ data, error: null })
  function builder(table) {
    const state = { op: 'select', patch: null, id: null, single: false }
    const b = {
      select: () => b,
      in: () => b,
      is: () => b,
      order: () => b,
      lt: () => b,
      lte: () => b,
      gte: () => b,
      not: () => b,
      ilike: () => b,
      or: () => b,
      limit: () => b,
      eq: (col, val) => {
        if (col === 'id') state.id = val
        return b
      },
      insert: (values) => {
        state.op = 'insert'
        state.patch = values
        return b
      },
      update: (patch) => {
        state.op = 'update'
        state.patch = patch
        return b
      },
      single: () => ((state.single = true), b),
      maybeSingle: () => ((state.single = true), b),
      then: (resolve, reject) => run().then(resolve, reject),
    }
    function run() {
      if (table === 'profiles') return result({ id: 'u1', last_space_id: null, week_starts_on: 1 })
      if (state.op === 'insert') {
        const row = {
          id: `t${db.tasks.length + 1}`,
          completed_at: null,
          pinned_at: null,
          deleted_at: null,
          created_at: '2026-09-23T10:00:00Z',
          updated_at: '2026-09-23T10:00:00Z',
          ...state.patch,
        }
        db.calls.push(['insert', row])
        db.tasks.push(row)
        return result(row)
      }
      if (state.op === 'update') {
        db.calls.push(['update', state.id, state.patch])
        db.tasks = db.tasks.map((t) => (t.id === state.id ? { ...t, ...state.patch } : t))
        return result(db.tasks.find((t) => t.id === state.id))
      }
      const live = db.tasks.filter((t) => !t.deleted_at)
      return result(state.single ? (live.at(-1) ?? null) : live)
    }
    return b
  }
  return { supabase: { from: builder } }
})

const SPACE = {
  id: '6f1c2b58-2f0c-4a8e-9a1a-3c2b1d0e9f11',
  name: 'THMP',
  slug: 'thmp',
  color: 'blue',
  icon: '💼',
  description: 'Frontend work',
  position: 1000,
  archived_at: null,
}

const task = (id, title, status, extra = {}) => ({
  id,
  space_id: '6f1c2b58-2f0c-4a8e-9a1a-3c2b1d0e9f11',
  title,
  description_text: '',
  status,
  priority: 'none',
  start_date: null,
  due_date: null,
  completed_at: status === 'done' ? '2026-09-20T10:00:00Z' : null,
  external_url: null,
  position: Number(id.slice(1)) * 1000,
  pinned_at: null,
  deleted_at: null,
  created_at: '2026-09-01T10:00:00Z',
  updated_at: '2026-09-22T10:00:00Z',
  ...extra,
})

function renderPage(path = '/s/thmp/tasks') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const Shell = () => (
    <SpaceProvider spaceSlug="thmp" spaces={[SPACE]}>
      <PageHeaderProvider>
        <Outlet />
      </PageHeaderProvider>
    </SpaceProvider>
  )
  const router = createMemoryRouter(
    [{ element: <Shell />, children: [{ path: '/s/:spaceSlug/tasks', element: <TasksPage /> }] }],
    { initialEntries: [path] },
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
  localStorage.clear()
  db.calls = []
  db.tasks = [
    task('t1', 'Buyer portal: fix RFQ pagination', 'in_review', {
      priority: 'high',
      external_url: 'https://gitlab.com/thmp/buyer/-/merge_requests/1431',
      description_text: 'Reset page to 1 when the filter hash changes.',
    }),
    task('t2', 'Vendor portal: migrate product form', 'in_progress'),
    task('t3', 'Storefront: lazy-load images', 'todo'),
    task('t4', 'Onboarding: KYC upload UI', 'done'),
  ]
})

describe('TasksPage', () => {
  it('shows task cards and live tab counts', async () => {
    renderPage()
    expect(await screen.findByText('Buyer portal: fix RFQ pagination')).toBeInTheDocument()
    expect(screen.getByText('Reset page to 1 when the filter hash changes.')).toBeInTheDocument()
    const tabs = screen.getByRole('tablist', { name: 'Task views' })
    expect(within(tabs).getByRole('tab', { name: /All\s*4/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(within(tabs).getByRole('tab', { name: /In progress\s*2/ })).toBeInTheDocument()
    expect(within(tabs).getByRole('tab', { name: /Completed\s*1/ })).toBeInTheDocument()
  })

  it('filters by tab through the URL', async () => {
    const user = userEvent.setup()
    const router = renderPage()
    await screen.findByText('Storefront: lazy-load images')
    await user.click(screen.getByRole('tab', { name: /In progress/ }))
    expect(router.state.location.search).toBe('?tab=in_progress')
    await waitFor(() =>
      expect(screen.queryByText('Storefront: lazy-load images')).not.toBeInTheDocument(),
    )
    expect(screen.getByText('Vendor portal: migrate product form')).toBeInTheDocument()
  })

  it('changes status from the card pill (optimistic) and saves it', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Storefront: lazy-load images')
    const pills = screen.getAllByRole('button', { name: 'Change status' })
    await user.click(pills[2]) // t3: To do
    await user.click(await screen.findByRole('menuitem', { name: /Completed/ }))
    await waitFor(() => expect(db.calls).toContainEqual(['update', 't3', { status: 'done' }]))
  })

  it('creates a task from the dialog, with Create more keeping it open', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Storefront: lazy-load images')
    await user.click(screen.getByRole('button', { name: 'New task' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Task title'), 'Admin: role-based menu')
    await user.type(within(dialog).getByLabelText('Description'), 'Waiting on API\ncontract')
    await user.click(within(dialog).getByRole('switch'))
    await user.click(within(dialog).getByRole('button', { name: /create task/i }))

    await waitFor(() => expect(db.calls.some((c) => c[0] === 'insert')).toBe(true))
    const inserted = db.calls.find((c) => c[0] === 'insert')[1]
    expect(inserted).toMatchObject({
      title: 'Admin: role-based menu',
      space_id: '6f1c2b58-2f0c-4a8e-9a1a-3c2b1d0e9f11',
      status: 'todo',
      priority: 'none',
      external_url: null,
      description_text: 'Waiting on API\ncontract',
    })
    expect(inserted.description.content).toHaveLength(2)
    // Create more: still open, title cleared for the next one
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(within(screen.getByRole('dialog')).getByLabelText('Task title')).toHaveValue('')
  })

  it('validates the title and dates before saving', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Storefront: lazy-load images')
    await user.click(screen.getByRole('button', { name: 'New task' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: /create task/i }))
    expect(await within(dialog).findByText('Give the task a title')).toBeInTheDocument()
    expect(db.calls.some((c) => c[0] === 'insert')).toBe(false)
  })

  it('moves a task to Trash with an Undo that restores it', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Storefront: lazy-load images')
    await user.click(screen.getByRole('button', { name: 'Storefront: lazy-load images options' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Move to Trash' }))

    // The toast repeats the title, so look for the card itself.
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Edit Storefront: lazy-load images' }),
      ).not.toBeInTheDocument(),
    )
    const update = db.calls.find((c) => c[0] === 'update' && c[1] === 't3')
    expect(update[2].deleted_at).toBeTruthy()

    await user.click(await screen.findByRole('button', { name: 'Undo' }))
    await waitFor(() => expect(db.calls).toContainEqual(['update', 't3', { deleted_at: null }]))
    expect(
      await screen.findByRole('button', { name: 'Edit Storefront: lazy-load images' }),
    ).toBeInTheDocument()
  })

  it('switches to the grouped list view and remembers it', async () => {
    const user = userEvent.setup()
    const router = renderPage()
    await screen.findByText('Storefront: lazy-load images')
    await user.click(screen.getByRole('radio', { name: 'List' }))
    expect(router.state.location.search).toBe('?view=list')
    expect(await screen.findByRole('button', { name: /In review\s*1/ })).toBeInTheDocument()
    expect(localStorage.getItem('axon:tasks:view')).toBe('"list"')
  })

  it('shows the first-run empty state', async () => {
    db.tasks = []
    renderPage()
    expect(await screen.findByText('No tasks yet')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create your first task/i })).toBeInTheDocument()
  })
})

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
import { EventDialog } from '@/features/calendar/components/EventDialog'
import CalendarPage from '@/features/calendar/pages/CalendarPage'

const db = vi.hoisted(() => ({ events: [], tasks: [], todos: [], calls: [] }))

vi.mock('@/context/AuthContext', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => ({ session: {}, user: { id: 'u1' }, loading: false, signOut: async () => {} }),
}))

vi.mock('@/lib/supabase', () => {
  const result = (data) => Promise.resolve({ data, error: null })
  function builder(table) {
    const state = { op: 'select', patch: null, id: null, single: false }
    const b = {
      select: () => b,
      in: () => b,
      is: () => b,
      order: () => b,
      or: () => b,
      not: () => b,
      lt: () => b,
      gte: () => b,
      lte: () => b,
      limit: () => b,
      ilike: () => b,
      overlaps: () => b,
      eq: (col, val) => {
        if (col === 'id') state.id = val
        return b
      },
      insert: (values) => ((state.op = 'insert'), (state.patch = values), b),
      update: (patch) => ((state.op = 'update'), (state.patch = patch), b),
      single: () => ((state.single = true), b),
      maybeSingle: () => ((state.single = true), b),
      then: (resolve, reject) => run().then(resolve, reject),
    }
    function run() {
      if (table === 'profiles') {
        return result({ id: 'u1', week_starts_on: 1, timezone: 'Asia/Kolkata', fy_start_month: 4 })
      }
      if (table === 'events') {
        if (state.op === 'insert') {
          const row = { id: `e${db.events.length + 1}`, note_id: null, ...state.patch }
          db.calls.push(['insert', row])
          db.events.push(row)
          return result(row)
        }
        if (state.op === 'update') {
          db.calls.push(['update', state.id, state.patch])
          db.events = db.events.map((e) => (e.id === state.id ? { ...e, ...state.patch } : e))
          return result(db.events.find((e) => e.id === state.id))
        }
        const live = db.events.filter((e) => !e.deleted_at)
        if (state.single) return result(live.find((e) => e.id === state.id) ?? null)
        return result(live)
      }
      if (table === 'tasks') return result(state.single ? null : db.tasks)
      if (table === 'todos') return result(db.todos)
      return result([])
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
  position: 1000,
  archived_at: null,
}

function renderInShell(element, url = '/s/thmp/calendar') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const Shell = () => (
    <SpaceProvider spaceSlug="thmp" spaces={[SPACE]}>
      <PageHeaderProvider>
        <Outlet />
      </PageHeaderProvider>
    </SpaceProvider>
  )
  const router = createMemoryRouter(
    [{ element: <Shell />, children: [{ path: '/s/:spaceSlug/calendar', element }] }],
    { initialEntries: [url] },
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
  db.tasks = []
  db.todos = []
  db.events = [
    {
      id: 'e1',
      space_id: SPACE.id,
      title: 'Sprint review',
      description: 'Demo RFQ pagination',
      location: null,
      url: 'https://meet.google.com/abc',
      // 15:00–16:00 in Asia/Kolkata on 24 Sep 2026
      starts_at: '2026-09-24T09:30:00.000Z',
      ends_at: '2026-09-24T10:30:00.000Z',
      all_day: false,
      task_id: null,
      note_id: null,
      updated_at: '2026-09-20T10:00:00Z',
    },
  ]
})

describe('EventDialog (standalone)', () => {
  it('creates an event outside CalendarPage, honouring initialValues and onSuccess', async () => {
    const onSuccess = vi.fn()
    renderInShell(
      <EventDialog
        open
        onOpenChange={() => {}}
        initialValues={{ title: 'Standup', start_date: '2026-09-23', end_date: '2026-09-23' }}
        onSuccess={onSuccess}
      />,
    )
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByLabelText('Event title')).toHaveValue('Standup')
    await userEvent.click(within(dialog).getByRole('button', { name: /create event/i }))

    await waitFor(() => expect(onSuccess).toHaveBeenCalled())
    const [, row] = db.calls.find((c) => c[0] === 'insert')
    // 09:00–10:00 in the profile zone (Asia/Kolkata), not the browser's.
    expect(row).toMatchObject({
      title: 'Standup',
      space_id: SPACE.id,
      all_day: false,
      starts_at: '2026-09-23T03:30:00.000Z',
      ends_at: '2026-09-23T04:30:00.000Z',
      location: null,
      url: null,
    })
    expect(onSuccess.mock.calls[0][0]).toMatchObject({ id: 'e2', title: 'Standup' })
  })

  it('requires a title', async () => {
    renderInShell(<EventDialog open onOpenChange={() => {}} />)
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: /create event/i }))
    expect(await within(dialog).findByText('Give the event a title')).toBeInTheDocument()
    expect(db.calls).toHaveLength(0)
  })
})

describe('CalendarPage', () => {
  it('falls back to Month for an unknown view and shows the event on its day', async () => {
    renderInShell(<CalendarPage />, '/s/thmp/calendar?view=bogus&date=2026-09-10')
    expect(await screen.findByRole('heading', { name: 'September 2026' })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /sprint review/i })).toHaveTextContent('15:00')
  })

  it('a deep link jumps to the event month and opens it; deleting offers Undo', async () => {
    const router = renderInShell(<CalendarPage />, '/s/thmp/calendar?date=2026-01-10&event=e1')
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByLabelText('Event title')).toHaveValue('Sprint review')
    await waitFor(() => expect(router.state.location.search).toContain('date=2026-09-24'))
    // The page behind the modal is aria-hidden while the dialog is open.
    expect(
      await screen.findByRole('heading', { name: 'September 2026', hidden: true }),
    ).toBeInTheDocument()

    await userEvent.click(within(dialog).getByRole('button', { name: /delete/i }))
    expect(await screen.findByText('Event moved to Trash')).toBeInTheDocument()
    await waitFor(() => expect(router.state.location.search).not.toContain('event='))
    expect(db.calls.find((c) => c[0] === 'update')[2]).toHaveProperty('deleted_at')
  })

  it('Agenda shows its empty state when nothing is coming up', async () => {
    db.events = []
    renderInShell(<CalendarPage />, '/s/thmp/calendar?view=agenda')
    expect(await screen.findByText('Nothing in the next 30 days')).toBeInTheDocument()
  })
})

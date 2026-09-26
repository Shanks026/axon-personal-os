import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SpaceProvider } from '@/context/SpaceContext'
import { PageHeaderProvider } from '@/components/layout/PageHeaderContext'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { EventDialog } from '@/features/calendar/components/EventDialog'
import { LinkedEventCard } from '@/features/calendar/components/LinkedEventCard'
import CalendarPage from '@/features/calendar/pages/CalendarPage'

const db = vi.hoisted(() => ({ events: [], tasks: [], todos: [], calls: [], note: null }))

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
        if (col === 'note_id') state.noteId = val
        return b
      },
      insert: (values) => ((state.op = 'insert'), (state.patch = values), b),
      update: (patch) => ((state.op = 'update'), (state.patch = patch), b),
      upsert: (values) => ((state.op = 'upsert'), (state.patch = values), b),
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
        if (state.noteId) return result(live.find((e) => e.note_id === state.noteId) ?? null)
        if (state.single) return result(live.find((e) => e.id === state.id) ?? null)
        return result(live)
      }
      if (table === 'notes') {
        if (state.op === 'insert') {
          const row = { id: 'n1', deleted_at: null, note_tags: [], ...state.patch }
          db.calls.push(['note:insert', row])
          return result(row)
        }
        return result(state.single ? (db.note ?? null) : [])
      }
      if (table === 'note_task_links') {
        db.calls.push(['link', state.patch])
        return result(null)
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
    [
      {
        element: <Shell />,
        children: [
          { path: '/s/:spaceSlug/calendar', element },
          { path: '/s/:spaceSlug/notes/:noteId', element: <p>Note page</p> },
        ],
      },
    ],
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
  db.note = null
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

    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete event' }))
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

describe('Week view (Phase 2)', () => {
  it('lays the event out in its day column with its time range', async () => {
    renderInShell(<CalendarPage />, '/s/thmp/calendar?view=week&date=2026-09-24')
    expect(await screen.findByRole('heading', { name: '21 – 27 Sep 2026' })).toBeInTheDocument()
    const block = await screen.findByRole('button', { name: 'Sprint review, 15:00–16:00' })
    expect(block.closest('[data-day]')).toHaveAttribute('data-day', '2026-09-24')
    expect(screen.getByRole('slider', { name: 'Resize event' })).toBeInTheDocument()
  })

  it('clicking an empty slot opens a new event prefilled with that hour', async () => {
    renderInShell(<CalendarPage />, '/s/thmp/calendar?view=day&date=2026-09-24')
    await screen.findByRole('heading', { name: 'Thu 24 Sep 2026' })
    const column = document.querySelector('[data-day="2026-09-24"]')
    // jsdom's layout is all zeros, so clientY is the offset: 9 × 56px = 09:00.
    fireEvent.pointerDown(column, { button: 0, clientY: 9 * 56 + 10 })
    fireEvent.pointerUp(window)
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByLabelText('Start time')).toHaveValue('09:00')
    expect(within(dialog).getByLabelText('End time')).toHaveValue('10:00')
  })
})

describe('Meeting notes (Phase 3)', () => {
  it('creates the note from the template, links it to the event and its task, and opens it', async () => {
    db.events[0].task_id = '7a1c2b58-2f0c-4a8e-9a1a-3c2b1d0e9f22'
    const router = renderInShell(<CalendarPage />, '/s/thmp/calendar?date=2026-09-24&event=e1')
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(
      await within(dialog).findByRole('button', { name: /create meeting note/i }),
    )

    await waitFor(() => expect(router.state.location.pathname).toBe('/s/thmp/notes/n1'))
    const [, note] = db.calls.find((c) => c[0] === 'note:insert')
    expect(note).toMatchObject({ space_id: SPACE.id, title: 'Sprint review — 24 Sep 2026' })
    expect(note.content.type).toBe('doc')
    expect(db.calls.find((c) => c[0] === 'update')).toEqual(['update', 'e1', { note_id: 'n1' }])
    expect(db.calls.find((c) => c[0] === 'link')[1]).toMatchObject({
      note_id: 'n1',
      task_id: '7a1c2b58-2f0c-4a8e-9a1a-3c2b1d0e9f22',
      source: 'manual',
    })
  })

  it('shows the note icon and offers "Open meeting note" when the note is live', async () => {
    db.events[0].note_id = 'n9'
    db.note = { id: 'n9', space_id: SPACE.id, title: 'Notes', deleted_at: null, note_tags: [] }
    renderInShell(<CalendarPage />, '/s/thmp/calendar?date=2026-09-24')
    expect(await screen.findByLabelText('Has meeting note')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /sprint review/i }))
    const dialog = await screen.findByRole('dialog')
    expect(await within(dialog).findByRole('link', { name: /open meeting note/i })).toHaveAttribute(
      'href',
      '/s/thmp/notes/n9',
    )
  })

  it('a trashed meeting note brings back "Create meeting note"', async () => {
    db.events[0].note_id = 'n9'
    db.note = {
      id: 'n9',
      space_id: SPACE.id,
      title: 'Notes',
      deleted_at: '2026-09-25T10:00:00Z',
      note_tags: [],
    }
    renderInShell(<CalendarPage />, '/s/thmp/calendar?date=2026-09-24&event=e1')
    const dialog = await screen.findByRole('dialog')
    expect(
      await within(dialog).findByRole('button', { name: /create meeting note/i }),
    ).toBeEnabled()
  })
})

describe('LinkedEventCard (note rail)', () => {
  it('shows the meeting and links to that day with the event open', async () => {
    db.events[0].note_id = 'n9'
    db.events[0].location = 'Room 4'
    renderInShell(<LinkedEventCard noteId="n9" />)
    expect(await screen.findByText('Sprint review')).toBeInTheDocument()
    // The year shows only outside the current one.
    expect(screen.getByText(/^Thu 24 Sep( 2026)? · 15:00–16:00$/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /open in calendar/i })).toHaveAttribute(
      'href',
      '/s/thmp/calendar?view=day&date=2026-09-24&event=e1',
    )
  })

  it('renders nothing for a note without an event', async () => {
    renderInShell(<LinkedEventCard noteId="nope" />)
    await waitFor(() => expect(db.events).toBeTruthy())
    expect(screen.queryByText('Meeting')).not.toBeInTheDocument()
  })
})

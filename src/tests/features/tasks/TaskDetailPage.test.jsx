import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SpaceProvider } from '@/context/SpaceContext'
import { PageHeaderProvider, usePageHeaderState } from '@/components/layout/PageHeaderContext'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import TaskDetailPage from '@/features/tasks/pages/TaskDetailPage'

const db = vi.hoisted(() => ({ tasks: [], activity: [], calls: [], notes: [], links: [] }))

vi.mock('@/context/AuthContext', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => ({ session: {}, user: { id: 'u1' }, loading: false, signOut: async () => {} }),
}))

vi.mock('@/lib/supabase', () => {
  const result = (data) => Promise.resolve({ data, error: null })
  const withEmbeds = (t) => ({ ...t, tag_ids: [], links: [] })

  function builder(table) {
    const state = { op: 'select', patch: null, id: null, taskId: null, noteId: null, single: false }
    const b = {
      select: () => b,
      in: () => b,
      is: () => b,
      not: () => b,
      or: () => b,
      order: () => b,
      limit: () => b,
      overlaps: () => b,
      eq: (col, val) => {
        if (col === 'id') state.id = val
        if (col === 'task_id') state.taskId = val
        if (col === 'note_id') state.noteId = val
        return b
      },
      insert: (values) => ((state.op = 'insert'), (state.patch = values), b),
      update: (patch) => ((state.op = 'update'), (state.patch = patch), b),
      delete: () => ((state.op = 'delete'), b),
      upsert: (values) => ((state.op = 'upsert'), (state.patch = values), b),
      single: () => ((state.single = true), b),
      maybeSingle: () => ((state.single = true), b),
      then: (resolve, reject) => run().then(resolve, reject),
    }
    function run() {
      if (table === 'profiles') return result({ id: 'u1', last_space_id: null, week_starts_on: 1 })
      if (table === 'tasks') {
        if (state.op === 'update') {
          db.calls.push(['update', state.id, state.patch])
          db.tasks = db.tasks.map((t) => (t.id === state.id ? { ...t, ...state.patch } : t))
          if ('status' in state.patch) {
            db.activity.push({
              id: `a${db.activity.length + 1}`,
              kind: 'status',
              from_value: 'todo',
              to_value: state.patch.status,
              created_at: '2026-09-25T12:00:00Z',
              updated_at: '2026-09-25T12:00:00Z',
            })
          }
          return result(withEmbeds(db.tasks.find((t) => t.id === state.id)))
        }
        if (state.single) {
          const t = db.tasks.find((x) => x.id === state.id)
          return result(t ? withEmbeds(t) : null)
        }
        return result(db.tasks.map(withEmbeds))
      }
      if (table === 'note_task_links') {
        if (state.op === 'upsert') {
          db.calls.push(['link', state.patch.note_id, state.patch.task_id])
          db.links.push({ ...state.patch, created_at: '2026-09-25T14:00:00Z' })
          db.activity.push({
            id: `a${db.activity.length + 1}`,
            kind: 'note_linked',
            to_value: state.patch.note_id,
            created_at: '2026-09-25T14:00:00Z',
            updated_at: '2026-09-25T14:00:00Z',
          })
          return result(null)
        }
        if (state.op === 'delete') {
          db.calls.push(['unlink', state.noteId, state.taskId])
          db.links = db.links.filter(
            (l) => !(l.note_id === state.noteId && l.task_id === state.taskId),
          )
          return result(null)
        }
        return result(
          db.links
            .filter((l) => l.task_id === state.taskId)
            .map((l) => ({
              source: l.source,
              created_at: l.created_at,
              note: db.notes.find((n) => n.id === l.note_id),
            })),
        )
      }
      if (table === 'notes') {
        if (state.single) return result(db.notes.find((n) => n.id === state.id) ?? null)
        return result(db.notes.map((n) => ({ ...n, tag_ids: [] })))
      }
      if (table === 'task_activity') {
        if (state.op === 'insert') {
          const row = {
            id: `a${db.activity.length + 1}`,
            ...state.patch,
            from_value: null,
            to_value: null,
            created_at: '2026-09-25T13:00:00Z',
            updated_at: '2026-09-25T13:00:00Z',
          }
          db.calls.push(['insert:activity', state.patch])
          db.activity.push(row)
          return result(row)
        }
        // Newest first (the API reverses to oldest first).
        return result([...db.activity].reverse())
      }
      return result(state.single ? null : [])
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
  description: '',
  position: 1000,
  archived_at: null,
}

const task = (id, title, extra = {}) => ({
  id,
  space_id: SPACE.id,
  title,
  description: null,
  description_text: '',
  status: 'todo',
  priority: 'medium',
  start_date: null,
  due_date: null,
  completed_at: null,
  versions: [],
  position: 1000,
  pinned_at: null,
  deleted_at: null,
  created_at: '2026-09-20T10:00:00Z',
  updated_at: '2026-09-24T10:00:00Z',
  ...extra,
})

function HeaderActions() {
  return <header>{usePageHeaderState().actions}</header>
}

function renderPage(path = '/s/thmp/tasks/t1', state) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const Shell = () => (
    <SpaceProvider spaceSlug="thmp" spaces={[SPACE]}>
      <PageHeaderProvider>
        <HeaderActions />
        <Outlet />
      </PageHeaderProvider>
    </SpaceProvider>
  )
  const router = createMemoryRouter(
    [
      {
        element: <Shell />,
        children: [
          { path: '/s/:spaceSlug/tasks', element: <p>Tasks list</p> },
          { path: '/s/:spaceSlug/tasks/:taskId', element: <TaskDetailPage /> },
        ],
      },
    ],
    { initialEntries: [{ pathname: path, state }] },
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
  db.links = []
  db.notes = [
    {
      id: 'n1',
      space_id: SPACE.id,
      title: 'Pagination bug RCA',
      excerpt: 'Root cause: local page state.',
      updated_at: '2026-09-24T10:00:00Z',
      deleted_at: null,
    },
    {
      id: 'n2',
      space_id: SPACE.id,
      title: 'Sprint 42 planning',
      excerpt: 'Committed work.',
      updated_at: '2026-09-23T10:00:00Z',
      deleted_at: null,
    },
  ]
  db.tasks = [
    task('t1', 'Buyer portal: fix RFQ pagination', {
      description_text: 'Reset page to 1 when the filter hash changes.',
    }),
    task('t2', 'Vendor portal: migrate product form'),
  ]
  db.activity = [
    {
      id: 'a1',
      kind: 'created',
      from_value: null,
      to_value: 'todo',
      body: null,
      created_at: '2026-09-20T10:00:00Z',
      updated_at: '2026-09-20T10:00:00Z',
    },
    {
      id: 'a2',
      kind: 'comment',
      from_value: null,
      to_value: null,
      body: 'Found it: usePagination never observes the filter.',
      created_at: '2026-09-22T16:40:00Z',
      updated_at: '2026-09-22T16:40:00Z',
    },
  ]
})

describe('TaskDetailPage', () => {
  it('shows the title, description, rail and the activity, oldest first', async () => {
    renderPage()
    expect(await screen.findByLabelText('Task title')).toHaveValue(
      'Buyer portal: fix RFQ pagination',
    )
    expect(screen.getByLabelText('Description')).toHaveTextContent(
      'Reset page to 1 when the filter hash changes.',
    )
    expect(screen.getAllByText('THMP').length).toBeGreaterThan(0) // the read-only space row
    const activity = screen.getByRole('region', { name: 'Activity' })
    await within(activity).findByText('Work log')
    const text = activity.textContent
    expect(text.indexOf('Created')).toBeLessThan(text.indexOf('Found it'))
  })

  it('saves a new title on Enter', async () => {
    const user = userEvent.setup()
    renderPage()
    const title = await screen.findByLabelText('Task title')
    await user.clear(title)
    await user.type(title, 'RFQ pagination reset{Enter}')
    await waitFor(() =>
      expect(db.calls).toContainEqual(['update', 't1', { title: 'RFQ pagination reset' }]),
    )
  })

  it('changes status from the rail and shows it in the activity', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByLabelText('Task title')
    await user.click(screen.getAllByRole('button', { name: 'Change status' })[0])
    await user.click(await screen.findByRole('menuitem', { name: /Blocked/ }))
    await waitFor(() => expect(db.calls).toContainEqual(['update', 't1', { status: 'blocked' }]))
    expect(await screen.findByText('Status To do → Blocked')).toBeInTheDocument()
  })

  it('adds a work-log entry with Ctrl+Enter', async () => {
    const user = userEvent.setup()
    renderPage()
    const composer = await screen.findByLabelText('Log work or leave a note')
    await user.type(composer, 'Paired with QA on the edge cases')
    fireEvent.keyDown(composer, { key: 'Enter', ctrlKey: true })
    await waitFor(() =>
      expect(db.calls).toContainEqual([
        'insert:activity',
        { task_id: 't1', kind: 'comment', body: 'Paired with QA on the edge cases' },
      ]),
    )
    expect(await screen.findByText('Paired with QA on the edge cases')).toBeInTheDocument()
    expect(composer).toHaveValue('')
  })

  it('moves to the next task in the list order with J', async () => {
    const user = userEvent.setup()
    const router = renderPage('/s/thmp/tasks/t1', { order: ['t1', 't2'] })
    await screen.findByLabelText('Task title')
    expect(screen.getByRole('button', { name: 'Previous task' })).toBeDisabled()
    await user.keyboard('j')
    await waitFor(() => expect(router.state.location.pathname).toBe('/s/thmp/tasks/t2'))
    expect(await screen.findByLabelText('Task title')).toHaveValue(
      'Vendor portal: migrate product form',
    )
  })

  it('hides previous / next when opened without a list', async () => {
    renderPage()
    await screen.findByLabelText('Task title')
    expect(screen.queryByRole('button', { name: 'Next task' })).not.toBeInTheDocument()
  })

  it('moves to Trash from the header menu and goes back to Tasks', async () => {
    const user = userEvent.setup()
    const router = renderPage()
    await screen.findByLabelText('Task title')
    await user.click(screen.getByRole('button', { name: 'Task options' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Move to Trash' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/s/thmp/tasks'))
    expect(db.calls.find((c) => c[0] === 'update' && c[2].deleted_at)).toBeTruthy()
  })

  it('shows a missing task as not found', async () => {
    renderPage('/s/thmp/tasks/nope')
    expect(await screen.findByText('This task doesn’t exist or is in Trash')).toBeInTheDocument()
  })

  it('links a note from the picker, shows it as a card and logs it', async () => {
    const user = userEvent.setup()
    renderPage()
    const section = await screen.findByRole('region', { name: 'Linked notes' })
    expect(
      await within(section).findByText('No linked notes. Link one or start a new note.'),
    ).toBeInTheDocument()

    await user.click(within(section).getByRole('button', { name: 'Link note' }))
    const picker = await screen.findByRole('dialog', { name: 'Link a note' })
    await user.click(await within(picker).findByText('Pagination bug RCA'))

    await waitFor(() => expect(db.calls).toContainEqual(['link', 'n1', 't1']))
    expect(
      await within(section).findByRole('link', { name: 'Open note Pagination bug RCA' }),
    ).toHaveAttribute('href', '/s/thmp/notes/n1')
    expect(await screen.findByText('Linked note ‘Pagination bug RCA’')).toBeInTheDocument()
  })

  it('unlinks a linked note', async () => {
    db.links = [
      { note_id: 'n2', task_id: 't1', source: 'manual', created_at: '2026-09-24T10:00:00Z' },
    ]
    const user = userEvent.setup()
    renderPage()
    const section = await screen.findByRole('region', { name: 'Linked notes' })
    await user.click(
      await within(section).findByRole('button', { name: 'Unlink Sprint 42 planning' }),
    )
    await waitFor(() => expect(db.calls).toContainEqual(['unlink', 'n2', 't1']))
    expect(
      await within(section).findByText('No linked notes. Link one or start a new note.'),
    ).toBeInTheDocument()
  })
})

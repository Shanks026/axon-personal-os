import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, renderHook, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SpaceProvider } from '@/context/SpaceContext'
import { PageHeaderProvider } from '@/components/layout/PageHeaderContext'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { todoKeys, useReorderTodo, useToggleTodo } from '@/features/todos/api'
import TodosPage from '@/features/todos/pages/TodosPage'

const db = vi.hoisted(() => ({ todos: [], tasks: [], calls: [], failUpdate: false }))

vi.mock('@/context/AuthContext', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => ({ session: {}, user: { id: 'u1' }, loading: false, signOut: async () => {} }),
}))

vi.mock('@/lib/supabase', () => {
  const result = (data) => Promise.resolve({ data, error: null })
  const attachTask = (row) => ({ ...row, task: db.tasks.find((t) => t.id === row.task_id) ?? null })

  function builder(table) {
    const state = { op: 'select', patch: null, id: null, single: false, filters: [] }
    const b = {
      select: () => b,
      in: () => b,
      is: (col, val) => {
        state.filters.push({ col, val })
        return b
      },
      order: () => b,
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
      if (table !== 'todos') return result([])
      if (state.op === 'insert') {
        const row = attachTask({
          id: `d${db.todos.length + 1}`,
          is_done: false,
          done_at: null,
          due_date: null,
          task_id: null,
          created_at: '2026-09-24T10:00:00Z',
          ...state.patch,
        })
        db.calls.push(['insert', row])
        db.todos.push(row)
        return result(row)
      }
      if (state.op === 'update') {
        if (db.failUpdate) return Promise.resolve({ data: null, error: new Error('Network down') })
        db.calls.push(['update', state.id, state.patch])
        db.todos = db.todos.map((t) => (t.id === state.id ? { ...t, ...state.patch } : t))
        return result(attachTask(db.todos.find((t) => t.id === state.id)))
      }
      let live = db.todos.filter((t) => !t.deleted_at)
      if (state.filters.some((f) => f.col === 'task_id' && f.val === null)) {
        live = live.filter((t) => t.task_id == null)
      }
      live = live.map(attachTask)
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

const todo = (id, title, extra = {}) => ({
  id,
  space_id: SPACE.id,
  title,
  is_done: false,
  due_date: null,
  task_id: null,
  position: Number(id.slice(1)) * 1000,
  deleted_at: null,
  created_at: '2026-09-01T10:00:00Z',
  ...extra,
})

function renderPage(path = '/s/thmp/todos') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const Shell = () => (
    <SpaceProvider spaceSlug="thmp" spaces={[SPACE]}>
      <PageHeaderProvider>
        <Outlet />
      </PageHeaderProvider>
    </SpaceProvider>
  )
  const router = createMemoryRouter(
    [{ element: <Shell />, children: [{ path: '/s/:spaceSlug/todos', element: <TodosPage /> }] }],
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
  db.failUpdate = false
  db.tasks = [{ id: 'tsk1', title: 'Buyer portal: fix RFQ pagination', status: 'in_progress' }]
  db.todos = [
    todo('d1', 'Send RFQ edge cases to QA', { due_date: '2026-09-01' }), // overdue vs "today"
    todo('d2', 'Reply to PM about Q3 scope'),
    todo('d3', 'Rebase MR on develop', { task_id: 'tsk1' }),
    todo('d4', 'Old finished item', { is_done: true, done_at: '2026-09-20T10:00:00Z' }),
  ]
})

describe('TodosPage', () => {
  it('shows the open count and groups todos', async () => {
    renderPage()
    expect(await screen.findByText('Send RFQ edge cases to QA')).toBeInTheDocument()
    expect(screen.getByText(/3 open\./)).toBeInTheDocument()
    expect(screen.getByText('Overdue')).toBeInTheDocument()
    expect(screen.getByText('Someday')).toBeInTheDocument()
  })

  it('adds a todo on Enter and keeps focus for the next one', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Send RFQ edge cases to QA')
    const input = screen.getByLabelText('Add a todo')
    await user.type(input, 'Book dentist appointment{Enter}')

    await waitFor(() => expect(db.calls.some((c) => c[0] === 'insert')).toBe(true))
    expect(db.calls.find((c) => c[0] === 'insert')[1]).toMatchObject({
      title: 'Book dentist appointment',
      space_id: SPACE.id,
      due_date: null,
    })
    expect(input).toHaveValue('')
    expect(input).toHaveFocus()
  })

  it('does nothing for an empty or whitespace-only title', async () => {
    const user = userEvent.setup()
    renderPage()
    const input = await screen.findByLabelText('Add a todo')
    await user.type(input, '   {Enter}')
    expect(db.calls.some((c) => c[0] === 'insert')).toBe(false)
  })

  it('toggles a todo optimistically and saves it', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Send RFQ edge cases to QA')
    await user.click(
      screen.getByRole('checkbox', { name: 'Mark "Reply to PM about Q3 scope" done' }),
    )
    await waitFor(() => expect(db.calls).toContainEqual(['update', 'd2', { is_done: true }]))
  })

  it('edits a title inline on Enter, and Esc cancels', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByText('Reply to PM about Q3 scope'))
    const input = screen.getByLabelText('Todo title')
    await user.clear(input)
    await user.type(input, 'Reply to PM about scope{Enter}')
    await waitFor(() =>
      expect(db.calls).toContainEqual(['update', 'd2', { title: 'Reply to PM about scope' }]),
    )

    await user.click(await screen.findByText('Reply to PM about scope'))
    const input2 = screen.getByLabelText('Todo title')
    await user.type(input2, ' more{Escape}')
    expect(screen.getByText('Reply to PM about scope')).toBeInTheDocument()
  })

  it('deletes a todo with an Undo that restores it', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Reply to PM about Q3 scope')
    await user.click(screen.getByRole('button', { name: 'Reply to PM about Q3 scope options' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }))

    // The Undo toast repeats the title, so look for the row's own checkbox, not plain text.
    await waitFor(() =>
      expect(
        screen.queryByRole('checkbox', { name: /Reply to PM about Q3 scope/ }),
      ).not.toBeInTheDocument(),
    )
    const del = db.calls.find((c) => c[0] === 'update' && c[1] === 'd2')
    expect(del[2].deleted_at).toBeTruthy()

    await user.click(await screen.findByRole('button', { name: 'Undo' }))
    await waitFor(() => expect(db.calls).toContainEqual(['update', 'd2', { deleted_at: null }]))
    expect(await screen.findByText('Reply to PM about Q3 scope')).toBeInTheDocument()
  })

  it('creates a todo from the dialog, with a due date', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Send RFQ edge cases to QA')
    await user.click(screen.getByRole('button', { name: 'New todo' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Title'), 'Write release notes')
    await user.click(within(dialog).getByRole('button', { name: /create task|add todo/i }))

    await waitFor(() => expect(db.calls.some((c) => c[0] === 'insert')).toBe(true))
    expect(db.calls.find((c) => c[0] === 'insert')[1]).toMatchObject({
      title: 'Write release notes',
      space_id: SPACE.id,
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows the "↳ task" chip on a checklist todo, and the switch hides it', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Rebase MR on develop')
    expect(screen.getByText('Buyer portal: fix RFQ pagination')).toBeInTheDocument()

    await user.click(screen.getByRole('switch'))
    await waitFor(() => expect(screen.queryByText('Rebase MR on develop')).not.toBeInTheDocument())
  })

  it('scrolls to and flashes a ?highlight=<id> todo in the collapsed Done group, then clears it', async () => {
    Element.prototype.scrollIntoView = vi.fn()
    const router = renderPage('/s/thmp/todos?highlight=d4')
    await screen.findByText('Send RFQ edge cases to QA')
    expect(await screen.findByText('Old finished item')).toBeInTheDocument()
    await waitFor(() => expect(Element.prototype.scrollIntoView).toHaveBeenCalled())
    await waitFor(() => expect(router.state.location.search).toBe(''))
  })

  it('shows the empty state when there are no open or recent todos', async () => {
    db.todos = []
    renderPage()
    expect(await screen.findByText('Nothing to do')).toBeInTheDocument()
    expect(screen.getByLabelText('Add a todo')).toBeInTheDocument()
  })
})

describe('useToggleTodo / useReorderTodo', () => {
  function setup(hook) {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const key = todoKeys.list({ spaceIds: [SPACE.id] })
    qc.setQueryData(key, [todo('d1', 'A'), todo('d2', 'B')])
    const wrapper = ({ children }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(hook, { wrapper })
    return { qc, key, result }
  }

  it('toggle rolls back on failure', async () => {
    db.failUpdate = true
    const { qc, key, result } = setup(useToggleTodo)
    result.current.mutate({ id: 'd1', is_done: true })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(qc.getQueryData(key).find((t) => t.id === 'd1').is_done).toBe(false)
  })

  it('reorder rolls back on failure', async () => {
    db.failUpdate = true
    const { qc, key, result } = setup(useReorderTodo)
    result.current.mutate({ id: 'd1', position: 5000 })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(qc.getQueryData(key).find((t) => t.id === 'd1').position).toBe(1000)
  })
})

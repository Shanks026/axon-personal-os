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
import { TaskDialog } from '@/features/tasks/components/TaskDialog'
import TasksPage from '@/features/tasks/pages/TasksPage'

// Phase 2 (task checklists): mounts TaskDialog in edit mode and, for the badge tests, TasksPage.
const db = vi.hoisted(() => ({ tasks: [], todos: [], tags: [], calls: [], failUpdate: false }))

vi.mock('@/context/AuthContext', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => ({ session: {}, user: { id: 'u1' }, loading: false, signOut: async () => {} }),
}))

vi.mock('@/lib/supabase', () => {
  const result = (data) => Promise.resolve({ data, error: null })

  function builder(table) {
    const state = { op: 'select', patch: null, id: null, taskId: null, single: false, filters: [] }
    const b = {
      select: () => b,
      in: () => b,
      is: (col, val) => {
        state.filters.push({ col, val })
        return b
      },
      order: () => b,
      or: () => b,
      not: () => b,
      limit: () => b,
      eq: (col, val) => {
        if (col === 'id') state.id = val
        if (col === 'task_id') state.taskId = val
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
      delete: () => {
        state.op = 'delete'
        return b
      },
      single: () => ((state.single = true), b),
      maybeSingle: () => ((state.single = true), b),
      then: (resolve, reject) => run().then(resolve, reject),
    }

    function runTodos() {
      if (state.op === 'insert' && Array.isArray(state.patch)) {
        db.calls.push(['insert:bulk', state.patch])
        state.patch.forEach((r, i) =>
          db.todos.push({ id: `d${db.todos.length + i + 1}`, is_done: false, ...r }),
        )
        return result(null)
      }
      if (state.op === 'insert') {
        const row = {
          id: `d${db.todos.length + 1}`,
          is_done: false,
          done_at: null,
          due_date: null,
          created_at: '2026-09-25T10:00:00Z',
          ...state.patch,
        }
        db.calls.push(['insert', row])
        db.todos.push(row)
        return result({ ...row, task: null })
      }
      if (state.op === 'update') {
        if (db.failUpdate) return Promise.resolve({ data: null, error: new Error('Network down') })
        db.calls.push(['update', state.id, state.patch])
        db.todos = db.todos.map((t) => (t.id === state.id ? { ...t, ...state.patch } : t))
        return result({ ...db.todos.find((t) => t.id === state.id), task: null })
      }
      let live = db.todos.filter((t) => !t.deleted_at)
      if (state.taskId) live = live.filter((t) => t.task_id === state.taskId)
      live = live.map((t) => ({ ...t, task: null }))
      return result(state.single ? (live.at(-1) ?? null) : live)
    }

    function run() {
      if (table === 'profiles') return result({ id: 'u1', last_space_id: null, week_starts_on: 1 })
      if (table === 'tags') return result([])
      if (table === 'todos') return runTodos()
      if (table === 'task_tags') return result(null)
      if (table === 'tasks' && state.op === 'insert') {
        const row = { id: `t${db.tasks.length + 1}`, tag_ids: [], links: [], ...state.patch }
        db.tasks.push(row)
        return result(row)
      }
      // tasks: only used for the badge tests, which read via TasksPage's own tasks table.
      let live = db.tasks.filter((t) => !t.deleted_at).map((t) => ({ ...t, tag_ids: [] }))
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

const task = (id, title, extra = {}) => ({
  id,
  space_id: SPACE.id,
  title,
  description_text: '',
  status: 'todo',
  priority: 'none',
  start_date: null,
  due_date: null,
  completed_at: null,
  position: 1000,
  pinned_at: null,
  deleted_at: null,
  created_at: '2026-09-01T10:00:00Z',
  updated_at: '2026-09-22T10:00:00Z',
  ...extra,
})

const todo = (id, taskId, title, extra = {}) => ({
  id,
  space_id: SPACE.id,
  task_id: taskId,
  title,
  is_done: false,
  due_date: null,
  position: Number(id.slice(1)) * 1000,
  deleted_at: null,
  created_at: '2026-09-01T10:00:00Z',
  ...extra,
})

function renderWithShell(children) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const Shell = () => (
    <SpaceProvider spaceSlug="thmp" spaces={[SPACE]}>
      <PageHeaderProvider>
        <Outlet />
      </PageHeaderProvider>
    </SpaceProvider>
  )
  const router = createMemoryRouter(
    [{ element: <Shell />, children: [{ path: '/s/:spaceSlug/tasks', element: children }] }],
    { initialEntries: ['/s/thmp/tasks'] },
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
  db.tasks = [task('t1', 'Buyer portal: fix RFQ pagination')]
  db.todos = []
})

describe('TodoChecklist (in TaskDialog)', () => {
  function renderDialog() {
    return renderWithShell(<TaskDialog open task={db.tasks[0]} onOpenChange={() => {}} />)
  }

  it('shows the hint and no progress when empty', async () => {
    renderDialog()
    expect(await screen.findByText('· saves as you go')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Break this task into steps')).toBeInTheDocument()
    expect(screen.queryByText(/^\d+\/\d+$/)).not.toBeInTheDocument()
  })

  it('stages a checklist while creating a task and saves it after the task', async () => {
    const user = userEvent.setup()
    renderWithShell(<TaskDialog open onOpenChange={() => {}} />)
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Task title'), 'New admin menu')
    const input = within(dialog).getByPlaceholderText('Break this task into steps')
    await user.type(input, 'Wire the API{Enter}')
    await user.type(within(dialog).getByPlaceholderText('Add item'), 'Add tests{Enter}')
    expect(within(dialog).getByText('Wire the API')).toBeInTheDocument()
    expect(db.calls.some((c) => c[0] === 'insert:bulk')).toBe(false) // nothing saved yet
    await user.click(within(dialog).getByRole('button', { name: /create task/i }))

    await waitFor(() => expect(db.calls.some((c) => c[0] === 'insert:bulk')).toBe(true))
    const created = db.tasks.at(-1)
    expect(created).toMatchObject({ title: 'New admin menu', priority: 'medium' })
    expect(db.calls.find((c) => c[0] === 'insert:bulk')[1]).toEqual([
      { task_id: created.id, space_id: SPACE.id, title: 'Wire the API', position: 1000 },
      { task_id: created.id, space_id: SPACE.id, title: 'Add tests', position: 2000 },
    ])
  })

  it('adds an item on Enter and keeps focus', async () => {
    const user = userEvent.setup()
    renderDialog()
    const input = await screen.findByPlaceholderText('Break this task into steps')
    await user.type(input, 'Reset page to 1{Enter}')

    await waitFor(() => expect(db.calls.some((c) => c[0] === 'insert')).toBe(true))
    expect(db.calls.find((c) => c[0] === 'insert')[1]).toMatchObject({
      title: 'Reset page to 1',
      task_id: 't1',
      space_id: SPACE.id,
    })
    expect(input).toHaveValue('')
    expect(input).toHaveFocus()
  })

  it('toggles an item and updates the progress count', async () => {
    db.todos = [todo('d1', 't1', 'Reset page to 1'), todo('d2', 't1', 'Add regression test')]
    const user = userEvent.setup()
    renderDialog()
    await screen.findByText('Reset page to 1')
    expect(screen.getByLabelText('Checklist 0 of 2 done')).toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: 'Mark "Reset page to 1" done' }))
    await waitFor(() => expect(db.calls).toContainEqual(['update', 'd1', { is_done: true }]))
    expect(await screen.findByLabelText('Checklist 1 of 2 done')).toBeInTheDocument()
  })

  it('edits a title inline', async () => {
    db.todos = [todo('d1', 't1', 'Reset page to 1')]
    const user = userEvent.setup()
    renderDialog()
    await user.click(await screen.findByText('Reset page to 1'))
    const input = screen.getByLabelText('Todo title')
    await user.clear(input)
    await user.type(input, 'Reset page index{Enter}')
    await waitFor(() =>
      expect(db.calls).toContainEqual(['update', 'd1', { title: 'Reset page index' }]),
    )
  })

  it('deletes an item with an Undo that restores it', async () => {
    db.todos = [todo('d1', 't1', 'Reset page to 1')]
    const user = userEvent.setup()
    renderDialog()
    await screen.findByText('Reset page to 1')
    await user.click(screen.getByRole('button', { name: 'Delete Reset page to 1' }))

    await waitFor(() =>
      expect(screen.queryByRole('checkbox', { name: /Reset page to 1/ })).not.toBeInTheDocument(),
    )
    const del = db.calls.find((c) => c[0] === 'update' && c[1] === 'd1')
    expect(del[2].deleted_at).toBeTruthy()

    await user.click(await screen.findByRole('button', { name: 'Undo' }))
    await waitFor(() => expect(db.calls).toContainEqual(['update', 'd1', { deleted_at: null }]))
    expect(await screen.findByText('Reset page to 1')).toBeInTheDocument()
  })
})

describe('ChecklistProgressBadge on task views', () => {
  it('shows done/total on the grid card and updates live on toggle', async () => {
    db.todos = [
      todo('d1', 't1', 'Reset page to 1', { is_done: true, done_at: '2026-09-20T10:00:00Z' }),
      todo('d2', 't1', 'Add regression test'),
    ]
    renderWithShell(<TasksPage />)
    const card = (await screen.findByText('Buyer portal: fix RFQ pagination')).closest('article')
    expect(within(card).getByLabelText('Checklist 1 of 2 done')).toBeInTheDocument()
  })

  it('renders nothing for a task with no checklist items', async () => {
    renderWithShell(<TasksPage />)
    const card = (await screen.findByText('Buyer portal: fix RFQ pagination')).closest('article')
    expect(within(card).queryByText(/^\d+\/\d+$/)).not.toBeInTheDocument()
  })
})

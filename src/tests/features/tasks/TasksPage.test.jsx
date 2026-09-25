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
import { taskKeys, useMoveTask } from '@/features/tasks/api'
import TasksPage from '@/features/tasks/pages/TasksPage'

const db = vi.hoisted(() => ({
  tasks: [],
  tags: [],
  taskTags: [],
  taskLinks: [],
  calls: [],
  failUpdate: false,
}))

vi.mock('@/context/AuthContext', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => ({ session: {}, user: { id: 'u1' }, loading: false, signOut: async () => {} }),
}))

// Chainable in-memory stand-in for supabase.from(...). Space and column filters are ignored
// (fixtures are already scoped), except the tag filter, which `runTasks` honours so the tag
// filter tests mean something.
vi.mock('@/lib/supabase', () => {
  const result = (data) => Promise.resolve({ data, error: null })
  const attachTagIds = (row) => ({
    ...row,
    tag_ids: db.taskTags.filter((tt) => tt.task_id === row.id).map((tt) => ({ tag_id: tt.tag_id })),
    links: db.taskLinks.filter((l) => l.task_id === row.id).sort((a, b) => a.position - b.position),
  })

  function builder(table) {
    const state = { op: 'select', patch: null, id: null, taskId: null, single: false, filters: [] }
    const b = {
      select: () => b,
      in: (col, vals) => {
        state.filters.push({ col, vals })
        return b
      },
      is: (col, val) => {
        state.filters.push({ col: `is:${col}`, vals: val })
        return b
      },
      order: () => b,
      lt: () => b,
      lte: () => b,
      gte: () => b,
      not: (col, op, val) => {
        state.filters.push({ col: `not:${col}`, vals: val })
        return b
      },
      ilike: () => b,
      overlaps: (col, vals) => {
        state.filters.push({ col: `ov:${col}`, vals })
        return b
      },
      or: (expr) => {
        state.filters.push({ col: 'or', vals: expr })
        return b
      },
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
      upsert: (rows) => {
        state.op = 'upsert'
        state.patch = rows
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

    function runTasks() {
      if (state.op === 'insert') {
        const row = attachTagIds({
          id: `t${db.tasks.length + 1}`,
          completed_at: null,
          pinned_at: null,
          deleted_at: null,
          created_at: '2026-09-23T10:00:00Z',
          updated_at: '2026-09-23T10:00:00Z',
          ...state.patch,
        })
        db.calls.push(['insert', row])
        db.tasks.push(row)
        return result(row)
      }
      if (state.op === 'update') {
        if (db.failUpdate) return Promise.resolve({ data: null, error: new Error('Network down') })
        db.calls.push(['update', state.id, state.patch])
        db.tasks = db.tasks.map((t) => (t.id === state.id ? { ...t, ...state.patch } : t))
        return result(attachTagIds(db.tasks.find((t) => t.id === state.id)))
      }
      let live = db.tasks.filter((t) => !t.deleted_at)
      const tagFilter = state.filters.find((f) => f.col === 'tag_match.tag_id')
      if (tagFilter) {
        live = live.filter((t) =>
          db.taskTags.some((tt) => tt.task_id === t.id && tagFilter.vals.includes(tt.tag_id)),
        )
      }
      const versionFilter = state.filters.find((f) => f.col === 'ov:versions')
      if (versionFilter) {
        live = live.filter((t) => (t.versions ?? []).some((v) => versionFilter.vals.includes(v)))
      }
      live = live.map(attachTagIds)
      return result(state.single ? (live.at(-1) ?? null) : live)
    }

    function runTags() {
      const scopeKey = (t) => `${t.space_id ?? 'null'}|${t.name.toLowerCase()}`
      if (state.op === 'insert') {
        if (db.tags.some((t) => scopeKey(t) === scopeKey(state.patch))) {
          return Promise.resolve({ data: null, error: { code: '23505', message: 'duplicate' } })
        }
        const row = {
          id: `tag${db.tags.length + 1}`,
          color: 'slate',
          created_at: '2026-09-24T10:00:00Z',
          updated_at: '2026-09-24T10:00:00Z',
          ...state.patch,
        }
        db.calls.push(['insert:tags', row])
        db.tags.push(row)
        return result(row)
      }
      if (state.op === 'update') {
        db.calls.push(['update:tags', state.id, state.patch])
        db.tags = db.tags.map((t) => (t.id === state.id ? { ...t, ...state.patch } : t))
        return result(db.tags.find((t) => t.id === state.id))
      }
      if (state.op === 'delete') {
        db.calls.push(['delete:tags', state.id])
        db.tags = db.tags.filter((t) => t.id !== state.id)
        db.taskTags = db.taskTags.filter((tt) => tt.tag_id !== state.id)
        return result(null)
      }
      // Mirrors fetchTags: global tags (space_id null) plus tags scoped to a requested space.
      const orFilter = state.filters.find((f) => f.col === 'or')
      const isNullFilter = state.filters.find((f) => f.col === 'is:space_id')
      let inScope = db.tags
      if (orFilter) {
        const m = orFilter.vals.match(/space_id\.in\.\(([^)]*)\)/)
        const ids = m ? m[1].split(',') : []
        inScope = db.tags.filter((t) => t.space_id == null || ids.includes(t.space_id))
      } else if (isNullFilter) {
        inScope = db.tags.filter((t) => t.space_id == null)
      }
      const withCounts = inScope.map((t) => ({
        ...t,
        task_tags: [{ count: db.taskTags.filter((tt) => tt.tag_id === t.id).length }],
      }))
      return result(withCounts)
    }

    function runTaskTags() {
      if (state.op === 'delete') {
        const notIn = state.filters.find((f) => f.col === 'not:tag_id')
        const keepIds = notIn ? notIn.vals.replace(/[()]/g, '').split(',') : []
        db.calls.push(['delete:task_tags', state.taskId, keepIds])
        db.taskTags = db.taskTags.filter(
          (tt) => tt.task_id !== state.taskId || keepIds.includes(tt.tag_id),
        )
        return result(null)
      }
      if (state.op === 'upsert') {
        db.calls.push(['upsert:task_tags', state.patch])
        state.patch.forEach((r) => {
          if (!db.taskTags.some((tt) => tt.task_id === r.task_id && tt.tag_id === r.tag_id)) {
            db.taskTags.push(r)
          }
        })
        return result(state.patch)
      }
      return result(db.taskTags)
    }

    function runTaskLinks() {
      if (state.op === 'insert') {
        const row = { id: `link${db.taskLinks.length + 1}`, label: null, ...state.patch }
        db.calls.push(['insert:task_links', row])
        db.taskLinks.push(row)
        return result(row)
      }
      if (state.op === 'update') {
        db.calls.push(['update:task_links', state.id, state.patch])
        db.taskLinks = db.taskLinks.map((l) => (l.id === state.id ? { ...l, ...state.patch } : l))
        return result(db.taskLinks.find((l) => l.id === state.id))
      }
      if (state.op === 'delete') {
        db.calls.push(['delete:task_links', state.id])
        db.taskLinks = db.taskLinks.filter((l) => l.id !== state.id)
        return result(null)
      }
      const forTask = db.taskLinks.filter((l) => l.task_id === state.taskId)
      return result(state.single ? (forTask.at(-1) ?? null) : forTask)
    }

    function run() {
      if (table === 'profiles') return result({ id: 'u1', last_space_id: null, week_starts_on: 1 })
      if (table === 'tags') return runTags()
      if (table === 'task_tags') return runTaskTags()
      if (table === 'task_links') return runTaskLinks()
      return runTasks()
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
  db.failUpdate = false
  db.tags = []
  db.taskTags = []
  db.taskLinks = [
    {
      id: 'link1',
      task_id: 't1',
      url: 'https://gitlab.com/thmp/buyer/-/merge_requests/1431',
      label: null,
      position: 1000,
    },
  ]
  db.tasks = [
    task('t1', 'Buyer portal: fix RFQ pagination', 'in_review', {
      priority: 'high',
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
    expect(within(tabs).getAllByRole('tab')).toHaveLength(8)
    expect(within(tabs).getByRole('tab', { name: /In progress\s*1/ })).toBeInTheDocument()
    expect(within(tabs).getByRole('tab', { name: /In review\s*1/ })).toBeInTheDocument()
    expect(within(tabs).getByRole('tab', { name: /On hold\s*0/ })).toBeInTheDocument()
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
      priority: 'medium',
      description_text: 'Waiting on API\ncontract',
    })
    expect(inserted.description.content).toHaveLength(2)
    // Create more: still open, title cleared for the next one
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(within(screen.getByRole('dialog')).getByLabelText('Task title')).toHaveValue('')
  })

  it('stages two links inline and saves them with the new task', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Storefront: lazy-load images')
    await user.click(screen.getByRole('button', { name: 'New task' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Task title'), 'Admin: role-based menu')
    const linkInput = within(dialog).getByLabelText('Add a link')
    await user.type(linkInput, 'not a link{Enter}')
    expect(await within(dialog).findByText(/Enter a full link/)).toBeInTheDocument()
    await user.clear(linkInput)
    await user.type(linkInput, 'https://gitlab.com/mr/1{Enter}')
    await user.type(linkInput, 'https://jira.example.com/T-2')
    await user.click(within(dialog).getByRole('button', { name: 'Add link' }))
    expect(within(dialog).getByText('https://gitlab.com/mr/1')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: /create task/i }))

    await waitFor(() =>
      expect(db.calls.filter((c) => c[0] === 'insert:task_links')).toHaveLength(2),
    )
    const created = db.calls.find((c) => c[0] === 'insert')[1]
    expect(db.calls.filter((c) => c[0] === 'insert:task_links').map((c) => c[1])).toEqual([
      expect.objectContaining({ task_id: created.id, url: 'https://gitlab.com/mr/1' }),
      expect.objectContaining({ task_id: created.id, url: 'https://jira.example.com/T-2' }),
    ])
  })

  it('adds free-text versions in the dialog and saves them with the task', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Storefront: lazy-load images')
    await user.click(screen.getByRole('button', { name: 'New task' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Task title'), 'Release banner')
    await user.click(within(dialog).getByRole('button', { name: 'Version' }))
    const input = await screen.findByPlaceholderText('Find or add a version…')
    await user.type(input, 'v3.9.0{Enter}')
    await user.type(input, 'v3.10.0')
    await user.click(await screen.findByRole('button', { name: 'Add “v3.10.0”' }))
    await user.keyboard('{Escape}')
    expect(
      within(dialog).getByRole('button', { name: 'Remove version v3.9.0' }),
    ).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: /create task/i }))

    await waitFor(() => expect(db.calls.some((c) => c[0] === 'insert')).toBe(true))
    expect(db.calls.find((c) => c[0] === 'insert')[1].versions).toEqual(['v3.9.0', 'v3.10.0'])
  })

  it('shows versions on the card and filters by version through the URL', async () => {
    db.tasks[0].versions = ['v3.9.0']
    db.tasks[1].versions = ['v3.10.0']
    const user = userEvent.setup()
    const router = renderPage()
    const card = (await screen.findByText('Buyer portal: fix RFQ pagination')).closest('article')
    expect(within(card).getByText('v3.9.0')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Version' }))
    // Newest-looking first: v3.10.0 sorts before v3.9.0.
    const items = await screen.findAllByRole('menuitemcheckbox')
    expect(items.map((i) => i.textContent)).toEqual(['v3.10.0', 'v3.9.0'])
    await user.click(items[1])
    await waitFor(() => expect(router.state.location.search).toBe('?version=v3.9.0'))
    await waitFor(() =>
      expect(screen.queryByText('Vendor portal: migrate product form')).not.toBeInTheDocument(),
    )
    expect(screen.getByText('Buyer portal: fix RFQ pagination')).toBeInTheDocument()
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

  it('switches to the table view and remembers it', async () => {
    const user = userEvent.setup()
    const router = renderPage()
    await screen.findByText('Storefront: lazy-load images')
    await user.click(screen.getByRole('radio', { name: 'Table' }))
    expect(router.state.location.search).toBe('?view=table')
    const table = await screen.findByRole('table')
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((h) => h.textContent)
    expect(headers).toEqual([
      'Task',
      'Status',
      'Priority',
      'Tags',
      'Checklist',
      'Due',
      'Updated',
      'Actions',
    ])
    expect(within(table).getAllByRole('row')).toHaveLength(5) // header + 4 tasks
    expect(localStorage.getItem('axon:tasks:view')).toBe('"table"')
  })

  it('sorts the table by a column through the URL, cycling asc → desc → off', async () => {
    db.tasks[1].due_date = '2026-10-20' // Vendor portal
    db.tasks[2].due_date = '2026-10-05' // Storefront
    const user = userEvent.setup()
    const router = renderPage('/s/thmp/tasks?view=table')
    const table = await screen.findByRole('table')
    const titles = () =>
      within(table)
        .getAllByRole('row')
        .slice(1)
        .map((r) => within(r).getAllByRole('button')[0].textContent)

    await user.click(within(table).getByRole('button', { name: 'Due' }))
    expect(router.state.location.search).toBe('?view=table&sort=due')
    // No due date sorts last in both directions.
    await waitFor(() =>
      expect(titles().slice(0, 2)).toEqual([
        'Storefront: lazy-load images',
        'Vendor portal: migrate product form',
      ]),
    )
    expect(within(table).getByRole('columnheader', { name: 'Due' })).toHaveAttribute(
      'aria-sort',
      'ascending',
    )

    await user.click(within(table).getByRole('button', { name: 'Due' }))
    expect(router.state.location.search).toBe('?view=table&sort=-due')
    await waitFor(() =>
      expect(titles().slice(0, 2)).toEqual([
        'Vendor portal: migrate product form',
        'Storefront: lazy-load images',
      ]),
    )

    await user.click(within(table).getByRole('button', { name: 'Due' }))
    expect(router.state.location.search).toBe('?view=table')
  })

  it('opens a task from its title and changes status in place in the table', async () => {
    const user = userEvent.setup()
    renderPage('/s/thmp/tasks?view=table')
    const table = await screen.findByRole('table')
    const row = within(table).getByText('Storefront: lazy-load images').closest('tr')
    await user.click(within(row).getByRole('button', { name: 'Change status' }))
    await user.click(await screen.findByRole('menuitem', { name: /Completed/ }))
    await waitFor(() => expect(db.calls).toContainEqual(['update', 't3', { status: 'done' }]))

    await user.click(within(row).getByRole('button', { name: 'Storefront: lazy-load images' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByLabelText('Task title')).toHaveValue('Storefront: lazy-load images')
  })

  it('shows the first-run empty state', async () => {
    db.tasks = []
    renderPage()
    expect(await screen.findByText('No tasks yet')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create your first task/i })).toBeInTheDocument()
  })

  it('shows the board with six columns and round-trips with the grid', async () => {
    db.tasks.push(task('t5', 'Old spike', 'cancelled'))
    const user = userEvent.setup()
    const router = renderPage()
    await screen.findByText('Storefront: lazy-load images')
    await user.click(screen.getByRole('radio', { name: 'Board' }))
    expect(router.state.location.search).toBe('?view=board')

    const columns = await screen.findAllByRole('region', { name: / column$/ })
    expect(columns.map((c) => c.getAttribute('aria-label'))).toEqual([
      'To do column',
      'In progress column',
      'In review column',
      'Blocked column',
      'On hold column',
      'Completed column',
    ])
    expect(within(columns[2]).getByText('Buyer portal: fix RFQ pagination')).toBeInTheDocument()
    expect(within(columns[3]).getByText('0')).toBeInTheDocument()
    expect(screen.queryByText('Old spike')).not.toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'Grid' }))
    expect(router.state.location.search).toBe('?view=grid')
    expect(await screen.findByText('Old spike')).toBeInTheDocument()
  })

  it('narrows board columns by tab', async () => {
    renderPage('/s/thmp/tasks?view=board&tab=in_review')
    const columns = await screen.findAllByRole('region', { name: / column$/ })
    expect(columns.map((c) => c.getAttribute('aria-label'))).toEqual(['In review column'])
  })

  it('quick-adds a task at the bottom of a column', async () => {
    const user = userEvent.setup()
    renderPage('/s/thmp/tasks?view=board')
    const blocked = await screen.findByRole('region', { name: 'Blocked column' })
    await user.click(within(blocked).getByRole('button', { name: 'Add task' }))
    await user.type(within(blocked).getByLabelText('New task in Blocked'), 'Waiting on API{Enter}')

    await waitFor(() => expect(db.calls.some((c) => c[0] === 'insert')).toBe(true))
    expect(db.calls.find((c) => c[0] === 'insert')[1]).toMatchObject({
      title: 'Waiting on API',
      status: 'blocked',
      space_id: SPACE.id,
      position: 1000,
    })
    // Stays open for the next one; Escape closes it.
    const input = within(blocked).getByLabelText('New task in Blocked')
    expect(input).toHaveValue('')
    await user.keyboard('{Escape}')
    expect(within(blocked).queryByLabelText('New task in Blocked')).not.toBeInTheDocument()
  })

  it('opens a board card in the edit dialog', async () => {
    const user = userEvent.setup()
    renderPage('/s/thmp/tasks?view=board')
    const todo = await screen.findByRole('region', { name: 'To do column' })
    await user.click(within(todo).getByRole('button', { name: 'Storefront: lazy-load images' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByLabelText('Task title')).toHaveValue('Storefront: lazy-load images')
  })
})

// The command list re-renders the same tag name that's already showing on a task's pill (a
// card, a row, another popover), so every tag query is scoped to the open popover's own content.
async function tagPopover(user, buttonScope = document.body) {
  await user.click(within(buttonScope).getByRole('button', { name: 'Tags' }))
  const input = await screen.findByPlaceholderText('Search tags…')
  return within(input.closest('[data-slot="popover-content"]'))
}

describe('Tags (Phase 3)', () => {
  beforeEach(() => {
    db.tags = [{ id: 'tag1', space_id: null, name: 'frontend', color: 'blue' }]
    db.taskTags = [{ task_id: 't1', tag_id: 'tag1', user_id: 'u1' }]
  })

  it('shows tag pills on a card and a table row', async () => {
    const user = userEvent.setup()
    renderPage()
    const card = (await screen.findByText('Buyer portal: fix RFQ pagination')).closest('article')
    expect(within(card).getByText('frontend')).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'Table' }))
    const row = (await screen.findByText('Buyer portal: fix RFQ pagination')).closest('tr')
    expect(within(row).getByText('frontend')).toBeInTheDocument()
  })

  it('shows the updated time (not the space) and at most 3 tags on a card', async () => {
    db.tags.push(
      { id: 'tag2', space_id: null, name: 'backend', color: 'green' },
      { id: 'tag3', space_id: null, name: 'infra', color: 'amber' },
      { id: 'tag4', space_id: null, name: 'design', color: 'pink' },
    )
    db.taskTags.push(
      ...['tag2', 'tag3', 'tag4'].map((tag_id) => ({ task_id: 't1', tag_id, user_id: 'u1' })),
    )
    const user = userEvent.setup()
    renderPage()
    const card = (await screen.findByText('Buyer portal: fix RFQ pagination')).closest('article')
    expect(within(card).getByText(/^Updated /)).toBeInTheDocument()
    expect(within(card).queryByText('THMP')).not.toBeInTheDocument()
    expect(await within(card).findByText('+1')).toBeInTheDocument()
    expect(within(card).queryByText('design')).not.toBeInTheDocument()

    // Hovering the hidden-tags count lists every tag.
    await user.hover(within(card).getByText('+1'))
    const popover = (await screen.findByText('4 tags')).parentElement
    expect(within(popover).getByText('design')).toBeInTheDocument()
    expect(within(popover).getByText('frontend')).toBeInTheDocument()
  })

  it('filters by tag through the URL', async () => {
    const user = userEvent.setup()
    const router = renderPage()
    await screen.findByText('Storefront: lazy-load images')
    const popover = await tagPopover(user)
    await user.click(popover.getByText('frontend'))
    await waitFor(() => expect(router.state.location.search).toBe('?tag=tag1'))
    // The tagged task's own pill stays visible on the (now single) filtered result.
    expect(await screen.findByText('Buyer portal: fix RFQ pagination')).toBeInTheDocument()
  })

  it('creates a tag inline from the task dialog and assigns it', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Storefront: lazy-load images')
    await user.click(screen.getByRole('button', { name: 'New task' }))
    const dialog = await screen.findByRole('dialog')
    await user.type(within(dialog).getByLabelText('Task title'), 'Admin: role-based menu')
    const popover = await tagPopover(user, dialog)
    await user.type(popover.getByPlaceholderText('Search tags…'), 'backend')
    await user.click(await popover.findByText('Create tag “backend”'))
    await user.keyboard('{Escape}')
    await user.click(within(dialog).getByRole('button', { name: /create task/i }))

    await waitFor(() => expect(db.calls.some((c) => c[0] === 'upsert:task_tags')).toBe(true))
    const createdTag = db.calls.find((c) => c[0] === 'insert:tags')[1]
    // The dialog defaults to the current space, so the new tag is scoped to it, not global.
    expect(createdTag).toMatchObject({ name: 'backend', space_id: SPACE.id })
    const createdTask = db.calls.find((c) => c[0] === 'insert')[1]
    const linked = db.calls.find((c) => c[0] === 'upsert:task_tags')[1]
    expect(linked).toEqual([{ task_id: createdTask.id, tag_id: createdTag.id }])
  })

  it('shows a friendly error for a duplicate tag name', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Storefront: lazy-load images')
    await user.click(screen.getByRole('button', { name: 'New task' }))
    const dialog = await screen.findByRole('dialog')
    const popover = await tagPopover(user, dialog)
    await user.type(popover.getByPlaceholderText('Search tags…'), 'Frontend')
    // Exact (case-insensitive) match: no "Create" offer, the existing tag is offered instead.
    expect(popover.queryByText('Create tag “Frontend”')).not.toBeInTheDocument()
    expect(popover.getByText('frontend')).toBeInTheDocument()
  })

  it('offers a global tag everywhere but a space tag only in its own space', async () => {
    db.tags.push({ id: 'tag2', space_id: 'other-space', name: 'backend', color: 'green' })
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Storefront: lazy-load images')
    await user.click(screen.getByRole('button', { name: 'New task' }))
    const dialog = await screen.findByRole('dialog')
    const popover = await tagPopover(user, dialog)
    expect(popover.getByText('frontend')).toBeInTheDocument()
    expect(popover.queryByText('backend')).not.toBeInTheDocument()
  })
})

describe('ManageTagsDialog', () => {
  beforeEach(() => {
    db.tags = [{ id: 'tag1', space_id: null, name: 'frontend', color: 'blue' }]
    db.taskTags = [{ task_id: 't1', tag_id: 'tag1', user_id: 'u1' }]
  })

  async function openManage(user) {
    renderPage()
    await screen.findByText('Storefront: lazy-load images')
    const popover = await tagPopover(user)
    await user.click(await popover.findByText('Manage tags…'))
    return screen.findByRole('dialog', { name: 'Manage tags' })
  }

  it('renames a tag on blur', async () => {
    const user = userEvent.setup()
    const dialog = await openManage(user)
    const input = within(dialog).getByLabelText('Rename frontend')
    await user.clear(input)
    await user.type(input, 'ui')
    await user.tab()
    await waitFor(() => expect(db.calls).toContainEqual(['update:tags', 'tag1', { name: 'ui' }]))
  })

  it('creates a tag in the current space, with no space picker', async () => {
    const user = userEvent.setup()
    const dialog = await openManage(user)
    expect(within(dialog).queryByLabelText('Scope of frontend')).not.toBeInTheDocument()
    await user.type(within(dialog).getByLabelText('New tag name'), 'backend{Enter}')
    await waitFor(() => expect(db.calls.some((c) => c[0] === 'insert:tags')).toBe(true))
    expect(db.calls.find((c) => c[0] === 'insert:tags')[1]).toMatchObject({
      name: 'backend',
      space_id: SPACE.id,
    })
    expect(within(dialog).getByLabelText('New tag name')).toHaveValue('')
    expect(await within(dialog).findByLabelText('Rename backend')).toBeInTheDocument()
  })

  it('deletes a tag after confirming, with the usage count in the prompt', async () => {
    const user = userEvent.setup()
    const dialog = await openManage(user)
    await user.click(within(dialog).getByLabelText('Delete frontend'))
    expect(await screen.findByText('It will be removed from 1 task.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(db.calls).toContainEqual(['delete:tags', 'tag1']))
  })
})

describe('useMoveTask', () => {
  function setup() {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const key = taskKeys.list({ spaceIds: [SPACE.id] })
    qc.setQueryData(key, [task('t1', 'A', 'todo'), task('t2', 'B', 'todo')])
    const wrapper = ({ children }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(() => useMoveTask(), { wrapper })
    return { qc, key, result }
  }

  it('moves optimistically and saves status and position', async () => {
    const { qc, key, result } = setup()
    db.tasks = [task('t1', 'A', 'todo'), task('t2', 'B', 'todo')]
    result.current.mutate({ id: 't1', patch: { status: 'done', position: 2500 } })
    await waitFor(() =>
      expect(qc.getQueryData(key).find((t) => t.id === 't1')).toMatchObject({
        status: 'done',
        position: 2500,
      }),
    )
    await waitFor(() =>
      expect(db.calls).toContainEqual(['update', 't1', { status: 'done', position: 2500 }]),
    )
  })

  it('renumbers the column when asked', async () => {
    const { result } = setup()
    db.tasks = [task('t1', 'A', 'todo'), task('t2', 'B', 'todo')]
    result.current.mutate({
      id: 't2',
      patch: { status: 'todo', position: 1000 },
      rebalanceIds: ['t2', 't1'],
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(db.calls).toContainEqual(['update', 't2', { position: 1000 }])
    expect(db.calls).toContainEqual(['update', 't1', { position: 2000 }])
  })

  it('rolls the card back when the save fails', async () => {
    db.failUpdate = true
    const { qc, key, result } = setup()
    result.current.mutate({ id: 't1', patch: { status: 'done', position: 2500 } })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(qc.getQueryData(key).find((t) => t.id === 't1')).toMatchObject({
      status: 'todo',
      position: 1000,
    })
  })
})

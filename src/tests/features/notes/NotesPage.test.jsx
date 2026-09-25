import { StrictMode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SpaceProvider } from '@/context/SpaceContext'
import { PageHeaderProvider, usePageHeaderState } from '@/components/layout/PageHeaderContext'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import NoteEditorPage from '@/features/notes/pages/NoteEditorPage'
import NotesPage from '@/features/notes/pages/NotesPage'

const db = vi.hoisted(() => ({ notes: [], calls: [], tags: [] }))

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
      not: () => b,
      order: () => b,
      or: () => b,
      limit: () => b,
      eq: (col, val) => {
        if (col === 'id') state.id = val
        return b
      },
      insert: (values) => ((state.op = 'insert'), (state.patch = values), b),
      update: (patch) => ((state.op = 'update'), (state.patch = patch), b),
      delete: () => ((state.op = 'delete'), b),
      upsert: () => ((state.op = 'upsert'), b),
      single: () => ((state.single = true), b),
      maybeSingle: () => ((state.single = true), b),
      then: (resolve, reject) => run().then(resolve, reject),
    }
    function run() {
      if (table === 'profiles') return result({ id: 'u1', last_space_id: null })
      if (table === 'tags') return result(db.tags)
      if (table !== 'notes') return result(state.single ? null : [])
      if (state.op === 'insert') {
        const row = {
          id: `n${db.notes.length + 1}`,
          space_id: state.patch.space_id,
          title: '',
          content: null,
          content_text: '',
          excerpt: '',
          pinned_at: null,
          deleted_at: null,
          created_at: '2026-09-25T10:00:00Z',
          updated_at: '2026-09-25T10:00:00Z',
          tag_ids: [],
          ...state.patch,
        }
        db.calls.push(['insert', state.patch])
        db.notes.push(row)
        return result(row)
      }
      if (state.op === 'update') {
        db.calls.push(['update', state.id, state.patch])
        db.notes = db.notes.map((n) => (n.id === state.id ? { ...n, ...state.patch } : n))
        return result(db.notes.find((n) => n.id === state.id))
      }
      if (state.op === 'delete') {
        db.calls.push(['delete', state.id])
        db.notes = db.notes.filter((n) => n.id !== state.id)
        return result(null)
      }
      if (state.id) return result(db.notes.find((n) => n.id === state.id) ?? null)
      return result(db.notes.filter((n) => !n.deleted_at))
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

const note = (id, title, extra = {}) => ({
  id,
  space_id: SPACE.id,
  title,
  content: null,
  content_text: '',
  excerpt: '',
  pinned_at: null,
  deleted_at: null,
  created_at: '2026-09-20T10:00:00Z',
  updated_at: '2026-09-24T10:00:00Z',
  tag_ids: [],
  ...extra,
})

// The shell's header, reduced to the page's actions (pin, shortcuts, ⋮ live there).
function HeaderActions() {
  return <header>{usePageHeaderState().actions}</header>
}

function renderApp(path = '/s/thmp/notes') {
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
          { path: '/s/:spaceSlug/notes', element: <NotesPage /> },
          { path: '/s/:spaceSlug/notes/:noteId', element: <NoteEditorPage /> },
        ],
      },
    ],
    { initialEntries: [path] },
  )
  // StrictMode on purpose: its dev double-mount must not discard a note that is still open.
  render(
    <StrictMode>
      <ThemeProvider>
        <QueryClientProvider client={qc}>
          <TooltipProvider>
            <RouterProvider router={router} />
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </StrictMode>,
  )
  return router
}

beforeEach(() => {
  localStorage.clear()
  db.calls = []
  db.tags = [
    {
      id: 't1',
      space_id: null,
      name: 'sprint',
      color: 'blue',
      task_tags: [],
      note_tags: [{ count: 2 }],
    },
    {
      id: 't2',
      space_id: null,
      name: 'rca',
      color: 'pink',
      task_tags: [],
      note_tags: [{ count: 1 }],
    },
    {
      id: 't3',
      space_id: null,
      name: 'unused',
      color: 'teal',
      task_tags: [],
      note_tags: [{ count: 0 }],
    },
  ]
  db.notes = [
    note('n1', 'Sprint 42 planning', { pinned_at: '2026-09-24T11:00:00Z', excerpt: 'Committed…' }),
    note('n2', 'Pagination bug RCA', {
      excerpt: 'usePagination kept its own page state',
      versions: ['v3.9.0'],
    }),
  ]
})

describe('NotesPage', () => {
  it('lists pinned notes in their own section, then all notes', async () => {
    renderApp()
    expect(await screen.findByText('Sprint 42 planning')).toBeInTheDocument()
    expect(screen.getByText('Pinned')).toBeInTheDocument()
    expect(screen.getByText('All notes')).toBeInTheDocument()
    expect(screen.getByText('usePagination kept its own page state')).toBeInTheDocument()
    expect(screen.getByText('v3.9.0')).toBeInTheDocument()
  })

  it('shows the empty state with a New note action', async () => {
    db.notes = []
    renderApp()
    expect(await screen.findByText('No notes yet')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /New note/ })).toHaveLength(2)
  })

  it('switches to the table view through ?view=', async () => {
    const user = userEvent.setup()
    const router = renderApp()
    await screen.findByText('Sprint 42 planning')
    await user.click(screen.getByRole('radio', { name: 'Table' }))
    expect(router.state.location.search).toBe('?view=table')
    // One table per section: Pinned, then All notes.
    expect(await screen.findAllByRole('columnheader', { name: 'Note' })).toHaveLength(2)
  })

  it('creates a note, opens it, autosaves the title and keeps it on leave', async () => {
    const user = userEvent.setup()
    const router = renderApp()
    await screen.findByText('Sprint 42 planning')
    await user.click(screen.getByRole('button', { name: /New note/ }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/s/thmp/notes/n3'))
    expect(db.calls[0]).toEqual([
      'insert',
      { space_id: SPACE.id, title: '', content: null, content_text: '' },
    ])
    const title = await screen.findByLabelText('Note title')
    expect(title).toHaveFocus()

    await user.type(title, 'Retro notes')
    await waitFor(
      () => expect(db.calls).toContainEqual(['update', 'n3', { title: 'Retro notes' }]),
      {
        timeout: 2000,
      },
    )

    await router.navigate('/s/thmp/notes')
    await screen.findByText('Retro notes')
    expect(db.calls.some((c) => c[0] === 'delete')).toBe(false)
  })

  it('discards a new note left completely empty', async () => {
    const user = userEvent.setup()
    const router = renderApp()
    await screen.findByText('Sprint 42 planning')
    await user.click(screen.getByRole('button', { name: /New note/ }))
    await screen.findByLabelText('Note title')

    await router.navigate('/s/thmp/notes')
    await waitFor(() => expect(db.calls).toContainEqual(['delete', 'n3']))
  })

  it('shows a missing note as not found', async () => {
    renderApp('/s/thmp/notes/nope')
    expect(await screen.findByText('This note doesn’t exist or is in Trash')).toBeInTheDocument()
  })

  it('filters by tag chips through ?tag=, with All to clear', async () => {
    const user = userEvent.setup()
    const router = renderApp()
    await screen.findByText('Sprint 42 planning')
    const group = screen.getByRole('group', { name: 'Filter by tag' })
    // Only tags that notes use get a chip, most used first.
    expect(
      within(group)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['All', 'sprint', 'rca'])
    await user.click(within(group).getByRole('button', { name: 'rca' }))
    expect(router.state.location.search).toBe('?tag=t2')
    expect(within(group).getByRole('button', { name: 'rca' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await user.click(within(group).getByRole('button', { name: 'All' }))
    expect(router.state.location.search).toBe('')
  })
})

describe('NoteEditor (Phase 2)', () => {
  const codeDoc = {
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'Snippet:' }] },
      {
        type: 'codeBlock',
        attrs: { language: 'javascript' },
        content: [{ type: 'text', text: 'const answer = 42' }],
      },
    ],
  }

  beforeEach(() => {
    db.notes = [
      note('n1', 'Snippets', { content: codeDoc, content_text: 'Snippet:\nconst answer = 42' }),
    ]
  })

  it('saves at once on Ctrl+S from the title', async () => {
    const user = userEvent.setup()
    renderApp('/s/thmp/notes/n1')
    const title = await screen.findByLabelText('Note title')
    await user.type(title, '!')
    await user.keyboard('{Control>}s{/Control}')
    // Well inside the 800ms debounce: only the shortcut could have saved it.
    await waitFor(() => expect(db.calls).toContainEqual(['update', 'n1', { title: 'Snippets!' }]), {
      timeout: 400,
    })
  })

  it('highlights code blocks and shows their language', async () => {
    renderApp('/s/thmp/notes/n1')
    await screen.findByLabelText('Note title')
    await waitFor(() =>
      expect(document.querySelector('pre .hljs-keyword')).toHaveTextContent('const'),
    )
    expect(screen.getByRole('combobox', { name: 'Code language' })).toHaveTextContent('JavaScript')
  })

  it('copies the note as Markdown', async () => {
    const user = userEvent.setup()
    renderApp('/s/thmp/notes/n1')
    await screen.findByLabelText('Note title')
    await user.click(screen.getByRole('button', { name: 'Snippets options' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Copy as Markdown' }))
    await waitFor(async () =>
      expect(await navigator.clipboard.readText()).toBe(
        '# Snippets\n\nSnippet:\n\n```javascript\nconst answer = 42\n```',
      ),
    )
  })

  it('lists the editor shortcuts in the cheat sheet', async () => {
    const user = userEvent.setup()
    renderApp('/s/thmp/notes/n1')
    await screen.findByLabelText('Note title')
    await user.click(screen.getByRole('button', { name: 'Keyboard shortcuts' }))
    const dialog = await screen.findByRole('dialog', { name: 'Keyboard shortcuts' })
    expect(within(dialog).getByText('Save now')).toBeInTheDocument()
    expect(within(dialog).getByText('Link (with text selected)')).toBeInTheDocument()
  })
})

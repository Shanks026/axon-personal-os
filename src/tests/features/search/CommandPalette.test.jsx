import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { paths } from '@/lib/paths'
import { CommandPalette } from '@/features/search/components/CommandPalette'

// Feature 12 Phase 1: the palette with its data hooks mocked (no Supabase).
const state = vi.hoisted(() => ({ calls: [], rows: [] }))
const space = { id: 's1', slug: 'thmp', name: 'THMP', icon: '💼', color: 'blue' }
const other = { id: 's2', slug: 'home', name: 'Home', icon: '🏠', color: 'green' }

vi.mock('@/context/SpaceContext', () => ({
  useSpace: () => ({
    isGlobal: false,
    space,
    scopeSpaceIds: ['s1'],
    activeSpaces: [space, other],
    spaceById: new Map([
      ['s1', space],
      ['s2', other],
    ]),
  }),
}))
vi.mock('@/features/settings/api', () => ({ usePreferences: () => ({ timezone: 'UTC' }) }))
vi.mock('@/features/spaces/hooks/useSpacePaths', async () => {
  const { paths: p } = await import('@/lib/paths')
  return { useSpacePaths: () => p.space('thmp') }
})
vi.mock('@/features/spaces/hooks/useSwitchSpace', () => ({ useSwitchSpace: () => vi.fn() }))
vi.mock('@/features/search/api', () => ({
  useSearch: (params) => {
    state.calls.push(params)
    const searching = params.q.trim().length >= 2
    return { data: searching ? state.rows : undefined, isFetching: false, isDebouncing: false }
  },
}))

function renderPalette() {
  const onOpenChange = vi.fn()
  const router = createMemoryRouter(
    [
      {
        path: '/s/:slug/*',
        element: <CommandPalette open onOpenChange={onOpenChange} />,
      },
    ],
    { initialEntries: [paths.space('thmp').tasks()] },
  )
  render(<RouterProvider router={router} />)
  return { router, onOpenChange }
}

beforeEach(() => {
  state.calls = []
  state.rows = []
  localStorage.clear()
})

describe('CommandPalette', () => {
  it('lists actions, sections and spaces with an empty query', () => {
    renderPalette()
    expect(screen.getByRole('option', { name: /New task/ })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /^Notes/ })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /All spaces \(Global\)/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /THMP/ })).toBeInTheDocument() // the scope chip
  })

  it('searches from two characters, groups results and opens one', async () => {
    state.rows = [
      {
        entity_type: 'task',
        id: 't1',
        space_id: 's1',
        title: 'Fix policy preview',
        snippet: 'the policy content',
        status: 'in_progress',
        updated_at: new Date().toISOString(),
      },
    ]
    const user = userEvent.setup()
    const { router, onOpenChange } = renderPalette()
    await user.type(screen.getByRole('combobox'), 'po')
    expect(state.calls.at(-1)).toMatchObject({ q: 'po', spaceIds: ['s1'], includeGlobal: false })
    expect(screen.getByText('Tasks', { selector: '[cmdk-group-heading]' })).toBeInTheDocument()
    expect(screen.getByText('In progress')).toBeInTheDocument()
    expect(screen.getAllByText('po', { selector: 'mark' }).length).toBeGreaterThan(0)

    // The title is split around its <mark>, so find the row by its text.
    const row = screen
      .getAllByRole('option')
      .find((o) => o.textContent.includes('Fix policy preview'))
    await user.click(row)
    expect(onOpenChange).toHaveBeenCalledWith(false)
    await waitFor(() => expect(router.state.location.pathname).toBe('/s/thmp/tasks/t1'))
    expect(JSON.parse(localStorage.getItem('axon:recent'))[0]).toMatchObject({ id: 't1' })
  })

  it('Tab cycles the type filter, and the chip widens the scope to all spaces', async () => {
    const user = userEvent.setup()
    renderPalette()
    await user.type(screen.getByRole('combobox'), 'po')
    await user.keyboard('{Tab}')
    expect(state.calls.at(-1)).toMatchObject({ types: ['task'] })
    await user.keyboard('{Shift>}{Tab}{/Shift}')
    expect(state.calls.at(-1)).toMatchObject({ types: null })

    await user.click(screen.getByRole('button', { name: /THMP/ }))
    expect(state.calls.at(-1)).toMatchObject({ spaceIds: ['s1', 's2'], includeGlobal: true })
    expect(screen.getByRole('button', { name: /All spaces/ })).toBeInTheDocument()
  })

  it('offers to create a task when nothing matches', async () => {
    const user = userEvent.setup()
    const { router } = renderPalette()
    await user.type(screen.getByRole('combobox'), 'zzz')
    await user.click(screen.getByRole('option', { name: /Create task “zzz”/ }))
    await waitFor(() => expect(router.state.location.search).toBe('?new=task&title=zzz'))
  })
})

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QuickCaptureDialog } from '@/features/inbox/components/QuickCaptureDialog'

// Feature 13 Phase 1: capture routing, with the space and create hooks mocked.
const state = vi.hoisted(() => ({ global: false, calls: [] }))
const mutation = vi.hoisted(() => (name) => () => ({
  isPending: false,
  mutateAsync: async (values) => {
    state.calls.push([name, values])
    return { id: `${name}-1`, ...values }
  },
}))
const space = { id: 's1', slug: 'thmp', name: 'THMP', icon: '💼' }

vi.mock('@/context/SpaceContext', () => ({
  useSpace: () => ({
    isGlobal: state.global,
    space: state.global ? null : space,
    spaceById: new Map([['s1', space]]),
  }),
}))
vi.mock('@/hooks/useDefaultSpaceId', () => ({ useDefaultSpaceId: () => 's1' }))
vi.mock('@/features/spaces/hooks/useSpacePaths', async () => {
  const { paths } = await import('@/lib/paths')
  return { useSpacePaths: () => paths.space('thmp') }
})
vi.mock('@/features/inbox/api', () => ({ useCaptureItem: mutation('capture') }))
vi.mock('@/features/tasks/api', () => ({ useCreateTask: mutation('task') }))
vi.mock('@/features/todos/api', () => ({ useCreateTodo: mutation('todo') }))
vi.mock('@/features/notes/api', () => ({ useCreateNote: mutation('note') }))

function renderDialog() {
  const onOpenChange = vi.fn()
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <QuickCaptureDialog open onOpenChange={onOpenChange} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { onOpenChange, box: screen.getByRole('textbox', { name: 'What’s on your mind?' }) }
}

beforeEach(() => {
  state.global = false
  state.calls = []
})

describe('QuickCaptureDialog', () => {
  it('saves to this space’s inbox on Enter; Shift+Enter is a new line', async () => {
    const user = userEvent.setup()
    const { box, onOpenChange } = renderDialog()
    await user.type(box, 'Ask Priya{Shift>}{Enter}{/Shift}about the API{Enter}')
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    expect(state.calls).toEqual([['capture', { body: 'Ask Priya\nabout the API', space_id: 's1' }]])
  })

  it('in Global, an inbox capture is Unsorted', async () => {
    state.global = true
    const user = userEvent.setup()
    const { box } = renderDialog()
    expect(screen.getByText('Inbox · Unsorted')).toBeInTheDocument()
    await user.type(box, 'Book dentist{Enter}')
    await waitFor(() =>
      expect(state.calls[0]).toEqual(['capture', { body: 'Book dentist', space_id: null }]),
    )
  })

  it('Tab cycles the type; a task gets the first line as title and the rest as description', async () => {
    const user = userEvent.setup()
    const { box } = renderDialog()
    await user.type(box, 'Fix pagination{Shift>}{Enter}{/Shift}page 2 repeats')
    await user.keyboard('{Tab}')
    expect(screen.getByRole('radio', { name: /Task/ })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('button', { name: /Create task/ })).toBeInTheDocument()
    await user.keyboard('{Enter}')
    await waitFor(() => expect(state.calls).toHaveLength(1))
    const [name, values] = state.calls[0]
    expect(name).toBe('task')
    expect(values).toMatchObject({
      title: 'Fix pagination',
      description_text: 'page 2 repeats',
      space_id: 's1',
    })
  })

  it('Shift+Tab goes back round to Note, and blank text can’t be saved', async () => {
    const user = userEvent.setup()
    const { box } = renderDialog()
    await user.click(box)
    await user.keyboard('{Shift>}{Tab}{/Shift}')
    expect(screen.getByRole('radio', { name: /Note/ })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('button', { name: /Create note/ })).toBeDisabled()
  })
})

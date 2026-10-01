import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HotkeysProvider } from 'react-hotkeys-hook'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { InboxList } from '@/features/inbox/components/InboxList'

// Feature 13 Phase 2: keyboard triage and bulk, with the actions mocked.
vi.mock('@/context/SpaceContext', () => ({
  useSpace: () => ({ isGlobal: false, activeSpaces: [] }),
}))

beforeAll(() => {
  Element.prototype.scrollIntoView ??= () => {}
})

const item = (id, body) => ({
  id,
  body,
  space_id: 's1',
  source: 'quick_capture',
  created_at: new Date().toISOString(),
})
const items = [
  item('a', 'Ask Priya about the API'),
  item('b', 'Book dentist'),
  item('c', 'Call Sam'),
]

function setup() {
  const actions = {
    run: vi.fn(),
    bulk: { discard: vi.fn(), move: vi.fn() },
  }
  render(
    <QueryClientProvider client={new QueryClient()}>
      <HotkeysProvider initiallyActiveScopes={['global']}>
        <TooltipProvider>
          <InboxList items={items} spaceById={new Map()} showSpace={false} actions={actions} />
        </TooltipProvider>
      </HotkeysProvider>
    </QueryClientProvider>,
  )
  return { user: userEvent.setup(), actions }
}

describe('InboxList keyboard triage', () => {
  it('J selects, then T / D / N / E / ⌫ act on the selected item', async () => {
    const { user, actions } = setup()
    await user.keyboard('t')
    expect(actions.run).not.toHaveBeenCalled() // nothing selected yet
    await user.keyboard('jj')
    await user.keyboard('t')
    expect(actions.run).toHaveBeenLastCalledWith('task', items[1])
    await user.keyboard('d')
    expect(actions.run).toHaveBeenLastCalledWith('todo', items[1])
    await user.keyboard('n')
    expect(actions.run).toHaveBeenLastCalledWith('note', items[1])
    await user.keyboard('e')
    expect(actions.run).toHaveBeenLastCalledWith('event', items[1])
    await user.keyboard('{Backspace}')
    expect(actions.run).toHaveBeenLastCalledWith('discard', items[1])
  })

  it('X picks rows; then ⌫ discards the whole set at once', async () => {
    const { user, actions } = setup()
    await user.keyboard('jxjx')
    expect(screen.getByText('2 selected')).toBeInTheDocument()
    await user.keyboard('{Backspace}')
    expect(actions.bulk.discard).toHaveBeenCalledWith(['a', 'b'], expect.anything())
    expect(actions.run).not.toHaveBeenCalledWith('discard', expect.anything())
  })

  it('Shift+click on a checkbox picks a range', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('checkbox', { name: /Ask Priya/ }))
    await user.keyboard('{Shift>}')
    await user.click(screen.getByRole('checkbox', { name: /Call Sam/ }))
    await user.keyboard('{/Shift}')
    expect(screen.getByText('3 selected')).toBeInTheDocument()
  })
})

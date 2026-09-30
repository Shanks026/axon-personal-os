import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HotkeysProvider } from 'react-hotkeys-hook'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { useListNavigation } from '@/hooks/useListNavigation'

beforeAll(() => {
  Element.prototype.scrollIntoView ??= () => {}
})

function List({ items, actions }) {
  const { getRowProps } = useListNavigation({ items, actions })
  return (
    <ul>
      {items.map((it) => (
        <li key={it.id} {...getRowProps(it.id)}>
          {it.title}
        </li>
      ))}
    </ul>
  )
}

const selected = () => document.querySelector('[data-selected]')?.textContent ?? null
const rows = [
  { id: 'a', title: 'Alpha' },
  { id: 'b', title: 'Bravo' },
  { id: 'c', title: 'Charlie' },
]

function setup(items = rows, actions = {}) {
  const user = userEvent.setup()
  const view = render(
    <HotkeysProvider initiallyActiveScopes={['global']}>
      <List items={items} actions={actions} />
    </HotkeysProvider>,
  )
  const rerender = (next) =>
    view.rerender(
      <HotkeysProvider initiallyActiveScopes={['global']}>
        <List items={next} actions={actions} />
      </HotkeysProvider>,
    )
  return { user, rerender }
}

describe('useListNavigation', () => {
  it('j and k move without wrapping; k from nothing picks the last', async () => {
    const { user } = setup()
    expect(selected()).toBeNull()
    await user.keyboard('j')
    expect(selected()).toBe('Alpha')
    await user.keyboard('jjj')
    expect(selected()).toBe('Charlie')
    await user.keyboard('{Escape}')
    expect(selected()).toBeNull()
    await user.keyboard('k')
    expect(selected()).toBe('Charlie')
    await user.keyboard('kkk')
    expect(selected()).toBe('Alpha')
  })

  it('runs row actions only with a selection', async () => {
    const open = vi.fn()
    const toggle = vi.fn()
    const { user } = setup(rows, { 'list.open': open, 'list.toggle': toggle })
    await user.keyboard('x')
    expect(toggle).not.toHaveBeenCalled()
    await user.keyboard('jj{Enter}x')
    expect(open).toHaveBeenCalledWith(rows[1])
    expect(toggle).toHaveBeenCalledWith(rows[1])
  })

  it('hands the selection to a neighbour when the row goes away', async () => {
    const { user, rerender } = setup()
    await user.keyboard('jj')
    expect(selected()).toBe('Bravo')
    rerender([rows[0], rows[2]])
    expect(selected()).toBe('Charlie')
    rerender([rows[0]])
    expect(selected()).toBe('Alpha')
    rerender([])
    expect(selected()).toBeNull()
  })

  it('ignores keys typed in an input', async () => {
    const user = userEvent.setup()
    render(
      <HotkeysProvider initiallyActiveScopes={['global']}>
        <input aria-label="Search" />
        <List items={rows} actions={{}} />
      </HotkeysProvider>,
    )
    await user.type(screen.getByLabelText('Search'), 'jj')
    expect(selected()).toBeNull()
  })
})

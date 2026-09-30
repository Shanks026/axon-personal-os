import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HotkeysProvider } from 'react-hotkeys-hook'
import { describe, expect, it, vi } from 'vitest'
import { useShortcut } from '@/hooks/useShortcut'
import { useShortcutScope } from '@/hooks/useShortcutScope'

function Bindings({ onTask, onCalendar, onNote, onCalendarCreate, calendar = false }) {
  useShortcut('create.task', onTask)
  useShortcut('go.calendar', onCalendar)
  useShortcut('create.note', onNote)
  return calendar ? <CalendarScope onCreate={onCalendarCreate} /> : null
}

function CalendarScope({ onCreate }) {
  useShortcutScope('calendar')
  useShortcut('calendar.create', onCreate)
  return null
}

function setup(props = {}) {
  const fns = {
    onTask: vi.fn(),
    onCalendar: vi.fn(),
    onNote: vi.fn(),
    onCalendarCreate: vi.fn(),
  }
  render(
    <HotkeysProvider initiallyActiveScopes={['global']}>
      <Bindings {...fns} {...props} />
    </HotkeysProvider>,
  )
  return { user: userEvent.setup(), ...fns }
}

describe('useShortcut', () => {
  it('fires a single key', async () => {
    const { user, onTask } = setup()
    await user.keyboard('c')
    expect(onTask).toHaveBeenCalledTimes(1)
  })

  it('g then c navigates without also creating a task', async () => {
    const { user, onTask, onCalendar } = setup()
    await user.keyboard('gc')
    expect(onCalendar).toHaveBeenCalledTimes(1)
    expect(onTask).not.toHaveBeenCalled()
  })

  it("lets an active page scope's key win over the global one", async () => {
    const { user, onNote, onCalendarCreate } = setup({ calendar: true })
    await user.keyboard('n')
    expect(onCalendarCreate).toHaveBeenCalledTimes(1)
    expect(onNote).not.toHaveBeenCalled()
  })
})

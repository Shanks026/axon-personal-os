import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'

describe('ConfirmDialog', () => {
  it('blocks confirm until the required text matches', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(
      <ConfirmDialog
        open
        onOpenChange={() => {}}
        title="Delete THMP?"
        requireText="THMP"
        confirmLabel="Delete space"
        onConfirm={onConfirm}
      />,
    )

    const confirm = screen.getByRole('button', { name: 'Delete space' })
    expect(confirm).toBeDisabled()

    await user.type(screen.getByLabelText(/to confirm/i), 'THM')
    expect(confirm).toBeDisabled()

    await user.type(screen.getByLabelText(/to confirm/i), 'P')
    expect(confirm).toBeEnabled()

    await user.click(confirm)
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('confirms immediately without requireText', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    render(<ConfirmDialog open title="Empty trash?" onConfirm={onConfirm} />)
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })
})

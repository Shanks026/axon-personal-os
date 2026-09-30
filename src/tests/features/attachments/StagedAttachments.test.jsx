import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { StagedAttachments } from '@/features/attachments/components/StagedAttachments'

const toastError = vi.hoisted(() => vi.fn())
vi.mock('sonner', () => ({ toast: { error: toastError } }))

function Harness() {
  const [files, setFiles] = useState([])
  return (
    <TooltipProvider>
      <StagedAttachments files={files} onChange={setFiles} />
    </TooltipProvider>
  )
}

describe('StagedAttachments (new-task dialog)', () => {
  it('stages documents, refuses videos, and removes a staged file', async () => {
    const user = userEvent.setup({ applyAccept: false })
    const { container } = render(<Harness />)
    expect(screen.getByText('· uploads when you save')).toBeInTheDocument()

    const input = container.querySelector('input[type="file"]')
    await user.upload(input, [
      new File(['%PDF'], 'spec.pdf', { type: 'application/pdf' }),
      new File(['x'], 'demo.mp4', { type: 'video/mp4' }),
    ])
    expect(screen.getByText('spec.pdf')).toBeInTheDocument()
    expect(screen.queryByText('demo.mp4')).not.toBeInTheDocument()
    expect(toastError).toHaveBeenCalledWith('Can’t attach “demo.mp4”', {
      description: 'Videos aren’t supported yet.',
    })

    await user.click(screen.getByRole('button', { name: 'Remove spec.pdf' }))
    expect(screen.queryByText('spec.pdf')).not.toBeInTheDocument()
  })
})

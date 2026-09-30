import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { TaskAttachments } from '@/features/attachments/components/TaskAttachments'

// Feature 15 Phase 2: the section with a mocked attachments API (no Supabase).
const api = vi.hoisted(() => ({
  rows: [],
  uploads: [],
  deleted: [],
  upload: null, // controls when an upload resolves
}))

vi.mock('@/features/attachments/api', async () => {
  const { useMutation, useQuery } = await import('@tanstack/react-query')
  return {
    useTaskAttachments: () =>
      useQuery({ queryKey: ['attachments', 'task', 't1'], queryFn: async () => api.rows }),
    useUploadAttachments: () =>
      useMutation({
        mutationFn: async ({ files, onFileSettled }) => {
          api.uploads.push(...files.map((f) => f.name))
          await api.upload
          files.forEach((f) => onFileSettled?.(f))
          return { uploaded: [], failed: [] }
        },
      }),
    useDeleteAttachment: () => useMutation({ mutationFn: async (row) => api.deleted.push(row.id) }),
    useImageUrl: () => ({ data: null }),
    useSignedUrls: () => new Map(),
    getDownloadUrl: async () => 'https://example.test/file',
  }
})

// The real lightbox needs a browser; this stand-in shows what it was asked to open.
vi.mock('@/features/attachments/components/AttachmentLightbox', () => ({
  AttachmentLightbox: ({ files, index }) =>
    index >= 0 ? (
      <div role="dialog">
        Preview {files[index].name} of {files.length}
      </div>
    ) : null,
}))

const task = { id: 't1', space_id: 's1' }

function renderSection() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <TooltipProvider>
        <TaskAttachments task={task} />
      </TooltipProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  api.rows = []
  api.uploads = []
  api.deleted = []
  api.upload = Promise.resolve()
})

describe('TaskAttachments', () => {
  it('shows the empty line when a task has no files', async () => {
    renderSection()
    expect(await screen.findByText('Drop files here or attach them.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Attach files/ })).toBeInTheDocument()
  })

  it('lists files with their size and a Jira label for copied ones', async () => {
    api.rows = [
      {
        id: 'a1',
        task_id: 't1',
        path: 'u/s1/a1.pdf',
        name: 'spec.pdf',
        mime: 'application/pdf',
        size: 4.2 * 1024 * 1024,
        source: 'upload',
        created_at: '2026-09-30T10:00:00Z',
      },
      {
        id: 'a2',
        task_id: 't1',
        path: null,
        external_url: 'https://thbs.atlassian.net/secure/attachment/9/demo.mp4',
        name: 'demo.mp4',
        mime: 'video/mp4',
        size: 90 * 1024 * 1024,
        source: 'jira',
        created_at: '2026-09-30T10:00:00Z',
      },
    ]
    renderSection()
    expect(await screen.findByText('spec.pdf')).toBeInTheDocument()
    expect(screen.getByText(/4\.2 MB · 30 Sep/)).toBeInTheDocument()
    expect(screen.getByText('In Jira')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open demo.mp4 in Jira' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Download spec.pdf' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Preview spec.pdf' })).toBeInTheDocument()
  })

  it('shows an uploading row until the file is stored', async () => {
    let finish
    api.upload = new Promise((resolve) => {
      finish = resolve
    })
    const user = userEvent.setup()
    const { container } = renderSection()
    await screen.findByText('Drop files here or attach them.')
    const input = container.querySelector('input[type="file"]')
    await user.upload(input, new File(['hello'], 'notes.txt', { type: 'text/plain' }))
    expect(await screen.findByText('Uploading…')).toBeInTheDocument()
    expect(api.uploads).toEqual(['notes.txt'])
    finish()
    await waitFor(() => expect(screen.queryByText('Uploading…')).not.toBeInTheDocument())
  })

  it('deletes a file only after the confirm', async () => {
    api.rows = [
      {
        id: 'a1',
        task_id: 't1',
        path: 'u/s1/a1.txt',
        name: 'log.txt',
        mime: 'text/plain',
        size: 10,
        source: 'upload',
        created_at: '2026-09-30T10:00:00Z',
      },
    ]
    const user = userEvent.setup()
    renderSection()
    await user.click(await screen.findByRole('button', { name: 'log.txt options' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Delete' }))
    expect(api.deleted).toEqual([])
    expect(await screen.findByText('Delete this file?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(api.deleted).toEqual(['a1']))
  })
})

describe('TaskAttachments preview', () => {
  it('opens images and PDFs in the lightbox, in their order among the previewable files', async () => {
    const row = (id, name, mime, path = `u/s1/${id}`) => ({
      id,
      task_id: 't1',
      path,
      name,
      mime,
      size: 100,
      source: 'upload',
      created_at: '2026-09-30T10:00:00Z',
    })
    api.rows = [
      row('a1', 'shot.png', 'image/png'),
      row('a2', 'notes.zip', 'application/zip'),
      row('a3', 'spec.pdf', 'application/pdf'),
    ]
    const user = userEvent.setup()
    renderSection()
    await user.click(await screen.findByRole('button', { name: 'Preview spec.pdf' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Preview spec.pdf of 2')
    // A zip isn't previewable: only its Download button is announced.
    expect(screen.queryByRole('button', { name: 'Preview notes.zip' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Download notes.zip' })).toBeInTheDocument()
  })
})

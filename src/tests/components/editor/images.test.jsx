import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { docToMarkdown } from '@/components/editor/markdown'
import { RichTextEditor } from '@/components/editor/RichTextEditor'
import { TooltipProvider } from '@/components/ui/tooltip'
import { insertImageFiles, stripPendingImages } from '@/components/editor/extensions/ImageUpload'

const toastError = vi.hoisted(() => vi.fn())
vi.mock('sonner', () => ({ toast: { error: toastError } }))

beforeAll(() => {
  // jsdom has no object URLs.
  URL.createObjectURL ??= () => 'blob:preview'
  URL.revokeObjectURL ??= () => {}
})

const image = (attrs) => ({ type: 'image', attrs: { alt: '', ...attrs } })
const png = () => new File(['x'], 'shot.png', { type: 'image/png' })

function renderEditor(images, value = null) {
  const onChange = vi.fn()
  render(
    <TooltipProvider>
      <RichTextEditor value={value} onChange={onChange} label="Body" features={{ images }} />
    </TooltipProvider>,
  )
  const dom = screen.getByLabelText('Body')
  return { editor: dom.editor, dom, onChange }
}

describe('stripPendingImages', () => {
  it('leaves out images still uploading (no path), keeping stored ones', () => {
    const doc = {
      type: 'doc',
      content: [image({ uploadId: 'u1', path: null }), image({ path: 'a/b/c.png' })],
    }
    expect(stripPendingImages(doc).content).toEqual([image({ path: 'a/b/c.png' })])
  })
})

describe('image markdown', () => {
  it('writes a stable axon-image reference instead of a URL', () => {
    const doc = { type: 'doc', content: [image({ path: 'u/s/x.png', alt: 'Broken layout' })] }
    expect(docToMarkdown(doc)).toBe('![Broken layout](axon-image:u/s/x.png)')
  })
})

describe('RichTextEditor images', () => {
  it('uploads an inserted image and saves only its path and size', async () => {
    let finish
    const images = {
      validate: () => null,
      upload: vi.fn(() => new Promise((resolve) => (finish = resolve))),
      resolveUrl: vi.fn(async () => 'https://signed.example/x.png'),
    }
    const { editor, dom, onChange } = renderEditor(images)

    act(() => {
      insertImageFiles(editor, [png()])
    })
    // While uploading: a preview with a spinner, and nothing saved for it yet.
    expect(await screen.findByRole('status', { name: 'Uploading image' })).toBeInTheDocument()
    expect(JSON.stringify(onChange.mock.lastCall?.[0])).not.toContain('"image"')

    await act(async () => finish({ path: 'u/s/new.png', width: 800, height: 400 }))
    await waitFor(() =>
      expect(onChange.mock.lastCall[0].content).toContainEqual(
        image({ path: 'u/s/new.png', width: 800, height: 400, uploadId: null }),
      ),
    )
    expect(screen.queryByRole('status', { name: 'Uploading image' })).not.toBeInTheDocument()
    // The local copy stays on screen: no signed-URL round trip right after uploading.
    expect(dom.querySelector('img').getAttribute('src')).toMatch(/^blob:/)
    expect(images.resolveUrl).not.toHaveBeenCalled()
  })

  it('rejects a bad file with a toast and inserts nothing', () => {
    const images = {
      validate: () => 'Images can be up to 10 MB.',
      upload: vi.fn(),
      resolveUrl: vi.fn(),
    }
    const { editor, dom } = renderEditor(images)
    act(() => {
      insertImageFiles(editor, [png()])
    })
    expect(toastError).toHaveBeenCalledWith('Images can be up to 10 MB.')
    expect(images.upload).not.toHaveBeenCalled()
    expect(dom.querySelector('.axon-image')).toBeNull()
  })

  it('removes the placeholder when the upload fails', async () => {
    const images = {
      validate: () => null,
      upload: vi.fn(async () => {
        throw new Error('Network down')
      }),
      resolveUrl: vi.fn(),
    }
    const { editor, dom } = renderEditor(images)
    await act(async () => {
      insertImageFiles(editor, [png()])
    })
    await waitFor(() => expect(dom.querySelector('.axon-image')).toBeNull())
    expect(toastError).toHaveBeenCalledWith('Network down')
  })

  it('renders a stored image through a signed URL, sized by its aspect ratio', async () => {
    const images = {
      validate: () => null,
      upload: vi.fn(),
      resolveUrl: vi.fn(async () => 'https://signed.example/stored.png'),
    }
    const doc = {
      type: 'doc',
      content: [image({ path: 'u/s/stored.png', width: 640, height: 320, alt: 'Chart' })],
    }
    const { dom } = renderEditor(images, doc)
    await waitFor(() =>
      expect(dom.querySelector('img')).toHaveAttribute('src', 'https://signed.example/stored.png'),
    )
    expect(images.resolveUrl).toHaveBeenCalledWith('u/s/stored.png')
    expect(dom.querySelector('img')).toHaveAttribute('alt', 'Chart')
  })

  it('shows "Image unavailable" when there are no image handlers', () => {
    const onChange = vi.fn()
    render(
      <TooltipProvider>
        <RichTextEditor
          value={{ type: 'doc', content: [image({ path: 'u/s/x.png' })] }}
          onChange={onChange}
          label="Body"
        />
      </TooltipProvider>,
    )
    expect(screen.getByText('Image unavailable')).toBeInTheDocument()
  })
})

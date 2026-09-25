import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NodeViewWrapper } from '@tiptap/react'
import { describe, expect, it, vi } from 'vitest'
import { docToMarkdown } from '@/components/editor/markdown'
import { RichTextEditor } from '@/components/editor/RichTextEditor'
import { TooltipProvider } from '@/components/ui/tooltip'

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))

/** A stand-in chip, so the editor test doesn't need the tasks feature. */
function Chip({ node }) {
  return (
    <NodeViewWrapper as="span" data-testid="chip">
      {node.attrs.label}
    </NodeViewWrapper>
  )
}

function renderEditor(config) {
  const onChange = vi.fn()
  render(
    <TooltipProvider>
      <RichTextEditor
        value={null}
        onChange={onChange}
        label="Body"
        features={{ slash: true, taskMentions: { NodeView: Chip, ...config } }}
      />
    </TooltipProvider>,
  )
  const dom = screen.getByLabelText('Body')
  return { editor: dom.editor, onChange }
}

const lastDoc = (onChange) => JSON.stringify(onChange.mock.lastCall?.[0])

describe('[[task]] mentions', () => {
  it('searches as you type (spaces allowed) and inserts the picked task as a chip', async () => {
    const user = userEvent.setup()
    const search = vi.fn(async (q) =>
      [
        { id: 't1', label: 'Fix RFQ pagination' },
        { id: 't2', label: 'Vendor form migration' },
      ].filter((t) => t.label.toLowerCase().includes(q.toLowerCase())),
    )
    const { editor, onChange } = renderEditor({ search, create: vi.fn() })

    act(() => {
      editor.commands.focus()
      editor.commands.insertContent('See [[fix rfq')
    })
    const list = await screen.findByRole('listbox', { name: 'Tasks' })
    await waitFor(() => expect(search).toHaveBeenLastCalledWith('fix rfq'))
    await user.click(await within(list).findByRole('option', { name: /Fix RFQ pagination/ }))

    await waitFor(() =>
      expect(lastDoc(onChange)).toContain('"type":"taskMention","attrs":{"id":"t1"'),
    )
    expect(lastDoc(onChange)).not.toContain('[[fix rfq')
    expect(await screen.findByTestId('chip')).toHaveTextContent('Fix RFQ pagination')
  })

  it('offers "Create task" for a new title and inserts the created task', async () => {
    const user = userEvent.setup()
    const create = vi.fn(async (title) => ({ id: 't9', label: title }))
    const { editor, onChange } = renderEditor({ search: async () => [], create })

    act(() => {
      editor.commands.focus()
      editor.commands.insertContent('[[Write release notes')
    })
    await user.click(
      await screen.findByRole('option', { name: /Create task “Write release notes”/ }),
    )

    expect(create).toHaveBeenCalledWith('Write release notes')
    await waitFor(() => expect(lastDoc(onChange)).toContain('"id":"t9"'))
  })

  it('writes mentions to Markdown as [[label]]', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'See ' },
            { type: 'taskMention', attrs: { id: 't1', label: 'Fix RFQ pagination' } },
          ],
        },
      ],
    }
    expect(docToMarkdown(doc)).toBe('See [[Fix RFQ pagination]]')
  })
})

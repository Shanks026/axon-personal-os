import { describe, expect, it } from 'vitest'
import { docToMarkdown, noteToMarkdown } from '@/components/editor/markdown'

const text = (t, marks) => ({ type: 'text', text: t, ...(marks && { marks }) })
const p = (...content) => ({ type: 'paragraph', content })
const cell = (type, t) => ({ type, content: [p(text(t))] })

const FIXTURE = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 2 }, content: [text('Committed')] },
    p(
      text('Ship the '),
      text('pagination', [{ type: 'bold' }]),
      text(' fix, see '),
      text('the MR', [{ type: 'link', attrs: { href: 'https://gitlab.com/mr/1431' } }]),
    ),
    {
      type: 'bulletList',
      content: [
        { type: 'listItem', content: [p(text('First'))] },
        { type: 'listItem', content: [p(text('Second'))] },
      ],
    },
    {
      type: 'taskList',
      content: [
        { type: 'taskItem', attrs: { checked: true }, content: [p(text('Done thing'))] },
        { type: 'taskItem', attrs: { checked: false }, content: [p(text('Open thing'))] },
      ],
    },
    {
      type: 'table',
      content: [
        { type: 'tableRow', content: [cell('tableHeader', 'Sno'), cell('tableHeader', 'Name')] },
        { type: 'tableRow', content: [cell('tableCell', '1'), cell('tableCell', 'Chris')] },
      ],
    },
    { type: 'codeBlock', attrs: { language: 'javascript' }, content: [text('const a = 1')] },
  ],
}

describe('docToMarkdown', () => {
  const md = docToMarkdown(FIXTURE)

  it('writes headings, marks and links', () => {
    expect(md).toContain('## Committed')
    expect(md).toContain('**pagination**')
    expect(md).toContain('[the MR](https://gitlab.com/mr/1431)')
  })

  it('writes bullet lists and checklists', () => {
    expect(md).toMatch(/^- First$/m)
    expect(md).toMatch(/^- \[x\] Done thing$/m)
    expect(md).toMatch(/^- \[ \] Open thing$/m)
  })

  it('writes tables with a header row', () => {
    expect(md).toMatch(/\|\s*Sno\s*\|\s*Name\s*\|/)
    expect(md).toMatch(/\|\s*-+\s*\|\s*-+\s*\|/)
    expect(md).toMatch(/\|\s*1\s*\|\s*Chris\s*\|/)
  })

  it('writes fenced code with its language', () => {
    expect(md).toContain('```javascript\nconst a = 1\n```')
  })

  it('returns an empty string for no content', () => {
    expect(docToMarkdown(null)).toBe('')
  })
})

describe('noteToMarkdown', () => {
  it('prepends the title as an H1', () => {
    expect(
      noteToMarkdown({ title: ' Sprint 42 ', content: { type: 'doc', content: [p(text('Hi'))] } }),
    ).toBe('# Sprint 42\n\nHi')
  })

  it('skips an empty title', () => {
    expect(noteToMarkdown({ title: '', content: { type: 'doc', content: [p(text('Hi'))] } })).toBe(
      'Hi',
    )
  })
})

import { describe, expect, it } from 'vitest'
// The Edge Function's helpers are plain JS; its http.js reads Deno.env when it loads, so stub
// Deno before importing.
globalThis.Deno ??= { env: { get: () => undefined } }
const { adfToText, cleanDescriptionHtml, normaliseComments } =
  await import('/supabase/functions/jira/jiraApi.js')

const text = (t) => ({ type: 'text', text: t })

describe('adfToText', () => {
  it('flattens Atlassian Document Format, one line per block', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            text('Please also '),
            { type: 'mention', attrs: { text: '@Arun' } },
            text(' check QA.'),
          ],
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [{ type: 'paragraph', content: [text('Fix the filter reset')] }],
            },
            { type: 'listItem', content: [{ type: 'paragraph', content: [text('Add a test')] }] },
          ],
        },
      ],
    }
    expect(adfToText(doc)).toBe('Please also @Arun check QA.\nFix the filter reset\nAdd a test')
    expect(adfToText(null)).toBe('')
  })
})

describe('normaliseComments', () => {
  it('keeps author, date and text, and drops empty comments', () => {
    const raw = {
      comments: [
        {
          author: { displayName: 'Lead' },
          created: '2026-09-27T10:00:00.000+0530',
          body: {
            type: 'doc',
            content: [{ type: 'paragraph', content: [text('Take it in v3.9.0')] }],
          },
        },
        {
          author: { displayName: 'Bot' },
          created: '2026-09-26',
          body: { type: 'doc', content: [] },
        },
      ],
    }
    expect(normaliseComments(raw)).toEqual([
      { author: 'Lead', created: '2026-09-27T10:00:00.000+0530', text: 'Take it in v3.9.0' },
    ])
  })
})

describe('cleanDescriptionHtml', () => {
  it('strips scripts and handlers, absolutises links and swaps images for a link', () => {
    const out = cleanDescriptionHtml(
      '<p onclick="x()">Hi <a href="/browse/MP-1">MP-1</a></p><script>bad()</script><img src="/secure/attachment/1/a.png">',
      'https://thbs.atlassian.net',
      'https://thbs.atlassian.net/browse/MP-2',
    )
    expect(out).not.toContain('script')
    expect(out).not.toContain('onclick')
    expect(out).toContain('href="https://thbs.atlassian.net/browse/MP-1"')
    expect(out).toContain('[Image in Jira]')
    expect(out).not.toContain('<img')
  })
})

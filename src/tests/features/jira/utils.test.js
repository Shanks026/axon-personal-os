import { describe, expect, it } from 'vitest'
import {
  attachmentNotice,
  inferTags,
  issueToTaskValues,
  jiraIssueUrl,
  mapPriority,
  mapStatus,
  mentions,
  parseJiraRef,
  replaceJiraImages,
  staysInJira,
  tagKeywords,
} from '@/features/jira/utils'

describe('parseJiraRef', () => {
  it('reads browse links, board links and bare keys', () => {
    expect(parseJiraRef('https://thbs.atlassian.net/browse/MP-43512')).toBe('MP-43512')
    expect(parseJiraRef('  https://thbs.atlassian.net/browse/MP-43512?focusedCommentId=9  ')).toBe(
      'MP-43512',
    )
    expect(
      parseJiraRef(
        'https://thbs.atlassian.net/jira/software/c/projects/MP/boards/12?selectedIssue=MP-7',
      ),
    ).toBe('MP-7')
    expect(parseJiraRef('MP-43512')).toBe('MP-43512')
    expect(parseJiraRef('mp-43512')).toBe('MP-43512')
  })

  it('rejects anything without a key', () => {
    expect(parseJiraRef('')).toBeNull()
    expect(parseJiraRef('https://thbs.atlassian.net/jira/your-work')).toBeNull()
    expect(parseJiraRef('fix the RFQ bug')).toBeNull()
    expect(parseJiraRef('MP43512')).toBeNull()
  })
})

describe('mapStatus', () => {
  it('prefers the saved map, then the defaults, then the category', () => {
    expect(mapStatus({ name: 'Code Review', category: 'indeterminate' }, {})).toBe('in_review')
    expect(
      mapStatus({ name: 'Code Review', category: 'indeterminate' }, { 'code review': 'blocked' }),
    ).toBe('blocked')
    expect(mapStatus({ name: 'Ready for UAT', category: 'indeterminate' }, {})).toBe('in_progress')
    expect(mapStatus({ name: 'Deployed', category: 'done' }, {})).toBe('done')
    expect(mapStatus({ name: 'Weird', category: null }, {})).toBe('todo')
    expect(mapStatus(null, {})).toBe('todo')
  })
})

describe('mapPriority', () => {
  it('maps Jira priorities onto Axon’s', () => {
    expect(mapPriority('Highest')).toBe('urgent')
    expect(mapPriority('Major')).toBe('high')
    expect(mapPriority('Medium')).toBe('medium')
    expect(mapPriority('Lowest')).toBe('low')
    expect(mapPriority('P2 - Something custom')).toBe('medium')
    expect(mapPriority('Highest', { Highest: 'high' })).toBe('high')
    expect(mapPriority(null)).toBe('none')
  })
})

describe('issueToTaskValues', () => {
  const issue = {
    key: 'MP-43512',
    url: 'https://thbs.atlassian.net/browse/MP-43512',
    summary: 'Vendor listing refactor',
    descriptionHtml: '<p>Refactor the <strong>vendor</strong> list.</p>',
    status: { name: 'In Progress', category: 'indeterminate' },
    priority: 'High',
    labels: ['store-management', 'Improvement'],
    fixVersions: ['v3.9.0', 'bad,version'],
    duedate: '2026-10-09',
    startDate: '2026-10-20',
  }
  const tags = [{ id: 't-imp', name: 'improvement' }]
  const htmlToDoc = (html) => ({
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: html.replace(/<[^>]+>/g, '') }] },
    ],
  })

  it('maps every field, and the link and key', () => {
    const now = new Date('2026-09-28T10:00:00Z')
    const v = issueToTaskValues(issue, { tags, htmlToDoc, jiraSettings: {}, now })
    expect(v.title).toBe('Vendor listing refactor')
    expect(v.description_text).toBe('Refactor the vendor list.')
    expect(v.status).toBe('in_progress')
    expect(v.priority).toBe('high')
    expect(v.due_date).toBe('2026-10-09')
    expect(v.start_date).toBeNull() // after the due date
    expect(v.versions).toEqual(['v3.9.0']) // the comma one is dropped
    expect(v.tag_ids).toEqual(['t-imp'])
    expect(v.newTags).toEqual(['store-management'])
    expect(v.links).toEqual([{ url: issue.url, label: 'MP-43512' }])
    expect(v.jira_key).toBe('MP-43512')
    expect(v.jira_imported_at).toBe('2026-09-28T10:00:00.000Z')
  })

  it('handles an empty description and missing fields', () => {
    const v = issueToTaskValues(
      { key: 'MP-1', url: 'u', summary: 'x', descriptionHtml: '', status: null, labels: [] },
      { tags, htmlToDoc, jiraSettings: {} },
    )
    expect(v.description).toBeNull()
    expect(v.priority).toBe('none')
    expect(v.versions).toEqual([])
  })
})

describe('jiraIssueUrl', () => {
  it('builds the browse link', () => {
    expect(jiraIssueUrl('https://thbs.atlassian.net/', 'MP-1')).toBe(
      'https://thbs.atlassian.net/browse/MP-1',
    )
    expect(jiraIssueUrl(null, 'MP-1')).toBeNull()
  })
})

describe('mentions', () => {
  it('matches whole words and phrases, ignoring case', () => {
    expect(mentions('Improve Product Listing Page in SMP and VP', 'smp')).toBe(true)
    expect(mentions('Improve Product Listing Page in SMP and VP', 'VP')).toBe(true)
    expect(mentions('Fix the VPN timeout', 'VP')).toBe(false)
    expect(mentions('Contain errors across All-Portals', 'all portals')).toBe(true)
    expect(mentions('Refactor (store management) portal', 'store management')).toBe(true)
    expect(mentions('', 'bug')).toBe(false)
  })
})

describe('inferTags', () => {
  const tags = [
    { id: 'bug', name: 'Bug' },
    { id: 'imp', name: 'Improvement' },
    { id: 'all', name: 'All Portals' },
    { id: 'smp', name: 'Store Management' },
    { id: 'vendor', name: 'Vendor' },
  ]
  const keywords = { smp: 'SMP, store management', vendor: 'VP, vendor portal' }

  it('uses titles, issue type, components and labels', () => {
    expect(
      inferTags({ summary: 'Improve Product Listing Page in SMP and VP' }, tags, keywords),
    ).toEqual(['smp', 'vendor'])
    expect(
      inferTags(
        { summary: 'Error Boundary V1 - contain errors and add recovery across all portals' },
        tags,
        keywords,
      ),
    ).toEqual(['all'])
    expect(inferTags({ summary: 'Login fails', issueType: 'Bug' }, tags, keywords)).toEqual(['bug'])
    expect(inferTags({ summary: 'x', components: ['Store Management'] }, tags, keywords)).toEqual([
      'smp',
    ])
  })

  it('custom keywords replace the tag name, so a bare word stops matching', () => {
    const issue = { summary: 'Suggested vendor listing refactor in the store management portal' }
    expect(inferTags(issue, tags, keywords)).toEqual(['imp', 'smp'])
    // Without custom keywords, the Vendor tag's own name would match.
    expect(inferTags(issue, tags, {})).toContain('vendor')
  })
})

describe('tagKeywords', () => {
  it('prefers saved keywords, else the name and built-in synonyms', () => {
    expect(tagKeywords({ id: 'a', name: 'Vendor' }, { a: ' VP , vendor portal ,' })).toEqual([
      'VP',
      'vendor portal',
    ])
    expect(tagKeywords({ id: 'b', name: 'Improvement' }, {})).toContain('suggestion')
    expect(tagKeywords({ id: 'c', name: 'Admin' }, undefined)).toEqual(['Admin'])
  })
})

// ── Feature 17 Phase 4: attachments ─────────────────────────────────────────────────────────
describe('issueToTaskValues attachments', () => {
  it('passes the issue attachments through as jira_attachments', () => {
    const files = [{ id: '1', filename: 'a.png', mimeType: 'image/png', size: 10 }]
    const v = issueToTaskValues(
      { key: 'MP-1', summary: 'S', attachments: files },
      { tags: [], htmlToDoc: () => null, jiraSettings: {} },
    )
    expect(v.jira_attachments).toEqual(files)
    expect(
      issueToTaskValues({ key: 'MP-2', summary: 'S' }, { htmlToDoc: () => null }).jira_attachments,
    ).toEqual([])
  })
})

describe('staysInJira and attachmentNotice', () => {
  const png = { id: '1', filename: 'a.png', mimeType: 'image/png', size: 10 }
  const video = { id: '2', filename: 'demo.mov', mimeType: 'application/octet-stream', size: 10 }
  const big = { id: '3', filename: 'dump.zip', mimeType: 'application/zip', size: 60 * 1024 * 1024 }

  it('keeps videos (by type or name) and files over 50 MB in Jira', () => {
    expect(staysInJira(png)).toBe(false)
    expect(staysInJira(video)).toBe(true)
    expect(staysInJira({ ...png, mimeType: 'video/mp4' })).toBe(true)
    expect(staysInJira(big)).toBe(true)
  })

  it('says what will be copied and what stays', () => {
    expect(attachmentNotice([])).toBe('')
    expect(attachmentNotice([png])).toBe('1 attachment will be copied after you save')
    expect(attachmentNotice([png, png, video, big])).toBe(
      '2 attachments will be copied after you save · 2 stay in Jira (video or over 50 MB)',
    )
  })
})

describe('replaceJiraImages', () => {
  const jiraImage = (id) => ({ type: 'image', attrs: { path: `jira:${id}`, alt: '' } })
  const doc = (...content) => ({ type: 'doc', content })
  const url = 'https://thbs.atlassian.net/browse/MP-1'

  it('swaps copied images for their stored path and size', () => {
    const copied = new Map([['7', { path: 'u/s/x.png', width: 800, height: 600, name: 'x.png' }]])
    const { doc: out, changed } = replaceJiraImages(doc(jiraImage('7')), copied, url)
    expect(changed).toBe(true)
    expect(out.content[0].attrs).toEqual({
      path: 'u/s/x.png',
      alt: 'x.png',
      width: 800,
      height: 600,
    })
  })

  it('turns images left in Jira (or not copied) into links, and keeps failed ones for a retry', () => {
    const copied = new Map([
      ['8', { path: null, external_url: 'https://thbs.atlassian.net/secure/attachment/8/v.mp4' }],
    ])
    const { doc: out } = replaceJiraImages(
      doc({ type: 'blockquote', content: [jiraImage('8')] }, jiraImage('9'), jiraImage('10')),
      copied,
      url,
      new Set(['10']),
    )
    const link = (node) => node.content[0].marks[0].attrs.href
    expect(link(out.content[0].content[0])).toBe(
      'https://thbs.atlassian.net/secure/attachment/8/v.mp4',
    )
    expect(link(out.content[1])).toBe(url)
    expect(out.content[2]).toEqual(jiraImage('10'))
  })

  it('leaves a doc without Jira images alone', () => {
    const plain = doc({ type: 'image', attrs: { path: 'u/s/y.png' } })
    expect(replaceJiraImages(plain, new Map(), url)).toEqual({ doc: plain, changed: false })
    expect(replaceJiraImages(null, new Map(), url).changed).toBe(false)
  })
})

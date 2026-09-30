import { describe, expect, it } from 'vitest'
// The Edge Function's helpers are plain JS; its http.js reads Deno.env when it loads, so stub
// Deno before importing.
globalThis.Deno ??= { env: { get: () => undefined } }
const {
  adfMediaNames,
  adfToText,
  attachmentExtension,
  cleanDescriptionHtml,
  imageSize,
  mapDescriptionImages,
  normaliseComments,
  normaliseIssue,
} = await import('/supabase/functions/jira/jiraApi.js')

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

// ── Feature 17 Phase 4: attachments ─────────────────────────────────────────────────────────
const files = [
  { id: '10960', filename: 'image-20260929-101010.png', mimeType: 'image/png', size: 1000 },
  { id: '10961', filename: 'Policy screen.jpg', mimeType: 'image/jpeg', size: 2000 },
]
const issueUrl = 'https://thbs.atlassian.net/browse/MP-2'

describe('mapDescriptionImages', () => {
  it('matches by the id in the src (content, secure and thumbnail URLs)', () => {
    for (const src of [
      '/rest/api/3/attachment/content/10960',
      '/secure/attachment/10960/image-20260929-101010.png',
      'https://thbs.atlassian.net/rest/api/2/attachment/thumbnail/10960',
    ]) {
      const { html, unmatched } = mapDescriptionImages(`<img src="${src}">`, files, issueUrl)
      expect(html).toBe('<img data-path="jira:10960" alt="image-20260929-101010.png">')
      expect(unmatched).toEqual([])
    }
  })

  it('falls back to a file name in alt, imagetext or data-attachment-name', () => {
    expect(
      mapDescriptionImages(
        '<img src="/images/icons/attach/noimage.png" imagetext="Policy screen.jpg|thumbnail">',
        files,
        issueUrl,
      ).html,
    ).toContain('jira:10961')
    expect(
      mapDescriptionImages('<img alt="IMAGE-20260929-101010.PNG">', files, issueUrl).html,
    ).toContain('jira:10960')
    expect(
      mapDescriptionImages(
        '<img data-attachment-name="Policy screen.jpg" src="x">',
        files,
        issueUrl,
      ).html,
    ).toContain('jira:10961')
  })

  it('falls back to the ADF media names by position, and keeps a link when nothing matches', () => {
    const { html, unmatched } = mapDescriptionImages(
      '<p><img src="/images/icons/attach/noimage.png"></p><p><img src="/other.png"></p>',
      files,
      issueUrl,
      ['Policy screen.jpg'],
    )
    expect(html).toContain('<img data-path="jira:10961"')
    expect(html).toContain(`<a href="${issueUrl}">[Image in Jira]</a>`)
    expect(unmatched).toHaveLength(1)
  })

  it('escapes the file name in the alt attribute', () => {
    const odd = [{ id: '1', filename: 'a"b<c.png', mimeType: 'image/png', size: 1 }]
    expect(mapDescriptionImages('<img src="/secure/attachment/1/x">', odd, issueUrl).html).toBe(
      '<img data-path="jira:1" alt="a&quot;b&lt;c.png">',
    )
  })
})

describe('adfMediaNames', () => {
  it('lists media file names in document order', () => {
    const adf = {
      type: 'doc',
      content: [
        { type: 'mediaSingle', content: [{ type: 'media', attrs: { alt: 'one.png' } }] },
        { type: 'paragraph', content: [text('x')] },
        { type: 'mediaGroup', content: [{ type: 'media', attrs: { alt: 'two.png' } }] },
      ],
    }
    expect(adfMediaNames(adf)).toEqual(['one.png', 'two.png'])
    expect(adfMediaNames(null)).toEqual([])
  })
})

describe('normaliseIssue attachments', () => {
  it('passes the attachments through and maps description images to them', () => {
    const issue = normaliseIssue(
      {
        key: 'MP-2',
        fields: {
          summary: 'S',
          attachment: [
            {
              id: 10960,
              filename: 'image-20260929-101010.png',
              mimeType: 'image/png',
              size: 1000,
              content: 'x',
            },
          ],
        },
        renderedFields: { description: '<p><img src="/rest/api/3/attachment/content/10960"></p>' },
      },
      'https://thbs.atlassian.net',
      null,
    )
    expect(issue.attachments).toEqual([
      {
        id: '10960',
        filename: 'image-20260929-101010.png',
        mimeType: 'image/png',
        size: 1000,
        created: null,
      },
    ])
    expect(issue.descriptionHtml).toContain('data-path="jira:10960"')
  })
})

describe('attachmentExtension', () => {
  it('uses the name, then the MIME type, then bin', () => {
    expect(attachmentExtension('Spec.PDF', 'application/pdf')).toBe('pdf')
    expect(attachmentExtension('image', 'image/png')).toBe('png')
    expect(attachmentExtension('blob', 'application/x-thing')).toBe('bin')
  })
})

describe('imageSize', () => {
  const bytes = (arr) => new Uint8Array(arr)
  it('reads PNG, GIF, JPEG and WebP headers', () => {
    const png = new Uint8Array(24)
    png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52])
    png.set([0, 0, 0x03, 0x20, 0, 0, 0x02, 0x58], 16) // 800 × 600
    expect(imageSize(png)).toEqual({ width: 800, height: 600 })

    expect(imageSize(bytes([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x40, 0x01, 0xf0, 0x00]))).toEqual({
      width: 320,
      height: 240,
    })

    // SOI, an APP0 segment (length 16), then SOF0 with height 480 and width 640.
    const jpeg = bytes([
      0xff,
      0xd8,
      0xff,
      0xe0,
      0x00,
      0x10,
      ...new Array(14).fill(0),
      0xff,
      0xc0,
      0x00,
      0x11,
      0x08,
      0x01,
      0xe0,
      0x02,
      0x80,
      0x03,
      0,
      0,
      0,
    ])
    expect(imageSize(jpeg)).toEqual({ width: 640, height: 480 })

    const webp = new Uint8Array(30)
    webp.set(
      [...'RIFF'].map((c) => c.charCodeAt(0)),
      0,
    )
    webp.set(
      [...'WEBPVP8X'].map((c) => c.charCodeAt(0)),
      8,
    )
    webp.set([0x1f, 0x03, 0x00, 0x57, 0x02, 0x00], 24) // 800 × 600 (stored minus one)
    expect(imageSize(webp)).toEqual({ width: 800, height: 600 })
  })

  it('returns null for anything else', () => {
    expect(imageSize(bytes([1, 2, 3]))).toBeNull()
    expect(imageSize(new TextEncoder().encode('%PDF-1.7 hello world'))).toBeNull()
  })
})

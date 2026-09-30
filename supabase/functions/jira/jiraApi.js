import { HttpError } from './http.js'

const TIMEOUT_MS = 20_000
const SITE = /^https:\/\/[a-z0-9-]+\.atlassian\.net$/i
const KEY = /^[A-Z][A-Z0-9_]*-[0-9]+$/

/** The Jira account credentials, or null while either secret is missing. */
export function jiraCredentials() {
  const email = Deno.env.get('JIRA_EMAIL') ?? ''
  const token = Deno.env.get('JIRA_API_TOKEN') ?? ''
  if (!email.includes('@') || token.length < 20 || /REPLACE/i.test(token)) return null
  return { email, token }
}

/** A validated Jira Cloud site URL (`https://<name>.atlassian.net`), without a trailing slash. */
export function cleanSite(site) {
  const s = String(site ?? '')
    .trim()
    .replace(/\/+$/, '')
  return SITE.test(s) ? s : null
}

/** GET a Jira REST path with basic auth; Jira errors become readable HttpErrors. */
export async function jiraGet(site, path) {
  const creds = jiraCredentials()
  if (!creds) {
    throw new HttpError(409, 'jira_not_configured', 'Add JIRA_EMAIL and JIRA_API_TOKEN first.')
  }
  const auth = btoa(`${creds.email}:${creds.token}`)
  let res
  try {
    res = await fetch(`${site}${path}`, {
      headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch {
    throw new HttpError(502, 'unreachable', `Couldn't reach ${site}. Try again.`)
  }
  if (res.ok) return res.json()

  const body = await res.json().catch(() => ({}))
  const detail = body?.errorMessages?.[0] ?? ''
  if (res.status === 401) {
    throw new HttpError(
      502,
      'jira_auth',
      'Jira rejected the email or API token. Check JIRA_EMAIL and JIRA_API_TOKEN (tokens expire).',
    )
  }
  if (res.status === 403) {
    throw new HttpError(403, 'jira_forbidden', "Your Jira account can't access this.")
  }
  if (res.status === 404) {
    throw new HttpError(
      404,
      'jira_not_found',
      detail || "That issue doesn't exist, or you can't see it.",
    )
  }
  if (res.status === 429) {
    throw new HttpError(
      429,
      'rate_limited',
      'Jira is rate-limiting requests. Try again in a minute.',
    )
  }
  throw new HttpError(502, 'jira_error', `Jira error ${res.status}${detail ? `: ${detail}` : ''}`)
}

export const isIssueKey = (key) => KEY.test(String(key ?? ''))

const escapeAttr = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
const attr = (tag, name) => {
  const m = new RegExp(`\\s${name}="([^"]*)"`, 'i').exec(tag)
  return m ? m[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"') : ''
}
const ID_IN_SRC =
  /\/(?:rest\/api\/\d+\/attachment\/(?:content|thumbnail)|secure\/attachment|secure\/thumbnail|attachment\/(?:content|thumbnail))\/(\d+)/i

/** File names of the `media` nodes in an ADF document, in order (the images it embeds). */
export function adfMediaNames(adf) {
  const names = []
  const walk = (n) => {
    if (!n || typeof n !== 'object') return
    if (n.type === 'media') names.push(n.attrs?.alt ?? '')
    ;(n.content ?? []).forEach(walk)
  }
  walk(adf)
  return names
}

/**
 * Each `<img>` in Jira's rendered description, matched to one of the issue's attachments: by the
 * id in its `src`, else by a file name in `alt` / `imagetext` / `data-attachment-name`, else by
 * position against the ADF description's media names. A match becomes
 * `<img data-path="jira:{id}">` (the editor shows a "from Jira" box until it's copied); anything
 * else stays a link to the issue. Returns `{ html, unmatched }` (`unmatched`: tag snippets).
 */
export function mapDescriptionImages(html, attachments = [], issueUrl, mediaNames = []) {
  const byId = new Map(attachments.map((a) => [String(a.id), a]))
  const byName = new Map(attachments.map((a) => [String(a.filename).toLowerCase(), a]))
  const unmatched = []
  let index = 0
  const out = String(html ?? '').replace(/<img\b[^>]*>/gi, (tag) => {
    const position = index++
    const src = attr(tag, 'src')
    let found = byId.get(ID_IN_SRC.exec(src)?.[1] ?? '')
    if (!found) {
      for (const name of [
        attr(tag, 'data-attachment-name'),
        attr(tag, 'alt'),
        attr(tag, 'imagetext'),
      ]) {
        const clean = name.split('|')[0].trim().toLowerCase()
        if (clean && byName.has(clean)) {
          found = byName.get(clean)
          break
        }
      }
    }
    if (!found && mediaNames[position]) found = byName.get(mediaNames[position].toLowerCase())
    if (found) return `<img data-path="jira:${found.id}" alt="${escapeAttr(found.filename)}">`
    unmatched.push(tag.slice(0, 300))
    return `<a href="${issueUrl}">[Image in Jira]</a>`
  })
  return { html: out, unmatched }
}

/**
 * Jira's rendered description HTML, made safe to hand to the editor: no scripts or styles, links
 * made absolute, and images mapped to the issue's attachments (`mapDescriptionImages`).
 */
export function cleanDescriptionHtml(html, site, issueUrl, attachments = [], mediaNames = []) {
  if (!html) return ''
  const stripped = String(html).replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
  const mapped = mapDescriptionImages(stripped, attachments, issueUrl, mediaNames)
  if (mapped.unmatched.length) {
    console.log('jira: description images not matched to attachments', mapped.unmatched)
  }
  return mapped.html
    .replace(/\s(href|src)="\/(?!\/)/gi, ` $1="${site}/`)
    .replace(/\son\w+="[^"]*"/gi, '')
}

/** The issue's attachments: `{ id, filename, mimeType, size, created }`. */
export function normaliseAttachments(list) {
  return (Array.isArray(list) ? list : [])
    .filter((a) => a?.id && a?.filename)
    .map((a) => ({
      id: String(a.id),
      filename: String(a.filename).slice(0, 255),
      mimeType: a.mimeType ?? 'application/octet-stream',
      size: Number(a.size) || 0,
      created: a.created ?? null,
    }))
}

/** "png" from the file name, else from the MIME type, else "bin". */
export function attachmentExtension(name, mime) {
  const m = /\.([a-z0-9]{1,10})$/i.exec(String(name ?? ''))
  if (m) return m[1].toLowerCase()
  const fromMime = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'application/pdf': 'pdf',
  }
  return fromMime[mime] ?? 'bin'
}

/**
 * Width and height from a PNG, GIF, JPEG or WebP header (`null` for anything else), so an
 * image copied from Jira reserves its space in the editor.
 */
export function imageSize(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes ?? [])
  const u16be = (i) => (b[i] << 8) | b[i + 1]
  const u16le = (i) => b[i] | (b[i + 1] << 8)
  const u24le = (i) => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16)
  const u32be = (i) => ((b[i] << 24) >>> 0) + (b[i + 1] << 16) + (b[i + 2] << 8) + b[i + 3]
  const ascii = (i, n) => String.fromCharCode(...b.subarray(i, i + n))
  const ok = (w, h) => (w > 0 && h > 0 ? { width: w, height: h } : null)
  if (b.length >= 24 && b[0] === 0x89 && ascii(1, 3) === 'PNG') return ok(u32be(16), u32be(20))
  if (b.length >= 10 && ascii(0, 3) === 'GIF') return ok(u16le(6), u16le(8))
  if (b.length >= 30 && ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') {
    const chunk = ascii(12, 4)
    if (chunk === 'VP8 ') return ok(u16le(26) & 0x3fff, u16le(28) & 0x3fff)
    if (chunk === 'VP8L') {
      const [b0, b1, b2, b3] = b.subarray(21, 25)
      return ok(1 + (b0 | ((b1 & 0x3f) << 8)), 1 + ((b1 >> 6) | (b2 << 2) | ((b3 & 0x0f) << 10)))
    }
    if (chunk === 'VP8X') return ok(1 + u24le(24), 1 + u24le(27))
    return null
  }
  if (b.length >= 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) {
        i += 1
        continue
      }
      const marker = b[i + 1]
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        i += 2
        continue
      }
      const isSof = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)
      if (isSof) return ok(u16be(i + 7), u16be(i + 5))
      i += 2 + u16be(i + 2)
    }
  }
  return null
}

/**
 * GET an attachment's bytes (`?redirect=false`, so Jira sends them itself rather than a 303 to its
 * media service). Refuses anything over `maxBytes` (by Content-Length, then by what arrived).
 */
export async function jiraGetBytes(site, path, { maxBytes, timeoutMs = 120_000 }) {
  const creds = jiraCredentials()
  if (!creds) {
    throw new HttpError(409, 'jira_not_configured', 'Add JIRA_EMAIL and JIRA_API_TOKEN first.')
  }
  let res
  try {
    res = await fetch(`${site}${path}`, {
      headers: { Authorization: `Basic ${btoa(`${creds.email}:${creds.token}`)}` },
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (err) {
    if (err?.name === 'TimeoutError')
      throw new HttpError(504, 'timeout', 'Jira took too long to send the file.')
    throw new HttpError(502, 'unreachable', `Couldn't reach ${site}. Try again.`)
  }
  if (res.status === 403 || res.status === 404) {
    throw new HttpError(404, 'jira_file_gone', "That file isn't available in Jira any more.")
  }
  if (!res.ok) throw new HttpError(502, 'jira_error', `Jira error ${res.status} for the file.`)
  const declared = Number(res.headers.get('content-length') ?? 0)
  if (declared > maxBytes) {
    await res.body?.cancel()
    return { tooLarge: true }
  }
  const bytes = new Uint8Array(await res.arrayBuffer())
  if (bytes.length > maxBytes) return { tooLarge: true }
  return { bytes, contentType: res.headers.get('content-type') ?? null }
}

/** The issue in the shape the app maps from. */
export function normaliseIssue(raw, site, startDateField) {
  const f = raw.fields ?? {}
  const url = `${site}/browse/${raw.key}`
  const start = startDateField ? f[startDateField] : null
  const attachments = normaliseAttachments(f.attachment)
  return {
    key: raw.key,
    url,
    summary: f.summary ?? '',
    descriptionHtml: cleanDescriptionHtml(
      raw.renderedFields?.description,
      site,
      url,
      attachments,
      adfMediaNames(f.description),
    ),
    attachments,
    status: f.status
      ? { name: f.status.name, category: f.status.statusCategory?.key ?? null }
      : null,
    priority: f.priority?.name ?? null,
    labels: f.labels ?? [],
    components: (f.components ?? []).map((c) => c?.name).filter(Boolean),
    fixVersions: (f.fixVersions ?? []).map((v) => v.name).filter(Boolean),
    duedate: f.duedate ?? null,
    startDate: typeof start === 'string' ? start.slice(0, 10) : null,
    issueType: f.issuetype?.name ?? null,
    updated: f.updated ?? null,
  }
}

const BLOCKS = new Set([
  'paragraph',
  'heading',
  'listItem',
  'codeBlock',
  'blockquote',
  'tableRow',
  'rule',
])

/** Plain text of an Atlassian Document Format node (comment bodies), one line per block. */
export function adfToText(node) {
  const lines = []
  let line = ''
  const flush = () => {
    if (line.trim()) lines.push(line.trim())
    line = ''
  }
  const walk = (n) => {
    if (!n || typeof n !== 'object') return
    if (n.type === 'text') line += n.text ?? ''
    else if (n.type === 'hardBreak') line += ' '
    else if (n.type === 'mention') line += n.attrs?.text ?? ''
    else if (n.type === 'inlineCard') line += n.attrs?.url ?? ''
    else if (n.type === 'emoji') line += n.attrs?.text ?? ''
    const block = BLOCKS.has(n.type)
    if (block) flush()
    ;(n.content ?? []).forEach(walk)
    if (block) flush()
  }
  walk(node)
  flush()
  return lines.join('\n')
}

/** The latest comments, newest first: `{ author, created, text }` (empty ones dropped). */
export function normaliseComments(raw) {
  return (raw?.comments ?? [])
    .map((c) => ({
      author: c.author?.displayName ?? null,
      created: c.created ?? null,
      text: adfToText(c.body).slice(0, 4000),
    }))
    .filter((c) => c.text)
}

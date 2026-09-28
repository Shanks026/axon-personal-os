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

/**
 * Jira's rendered description HTML, made safe to hand to the editor: no scripts or styles, links
 * made absolute, and images (auth-only attachment URLs, copied into Axon in Phase 4) replaced
 * with a link to the issue.
 */
export function cleanDescriptionHtml(html, site, issueUrl) {
  if (!html) return ''
  return String(html)
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<img\b[^>]*>/gi, `<a href="${issueUrl}">[Image in Jira]</a>`)
    .replace(/\s(href|src)="\/(?!\/)/gi, ` $1="${site}/`)
    .replace(/\son\w+="[^"]*"/gi, '')
}

/** The issue in the shape the app maps from. */
export function normaliseIssue(raw, site, startDateField) {
  const f = raw.fields ?? {}
  const url = `${site}/browse/${raw.key}`
  const start = startDateField ? f[startDateField] : null
  return {
    key: raw.key,
    url,
    summary: f.summary ?? '',
    descriptionHtml: cleanDescriptionHtml(raw.renderedFields?.description, site, url),
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

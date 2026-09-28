// Axon's Jira endpoint (Feature 17 Phase 2). POST { action, ... } with the user's JWT. Read-only.
//   status       → { configured, site, account? }    ({ check: true } calls /myself: "Test connection")
//   meta         → { statuses: [{ name, category }], priorities: [name], dateFields: [{ id, name }] }
//   fetch_issue  → { issue }                         ({ key: 'MP-43512' })
//   fetch_comments → { comments: [{ author, created, text }] }   ({ key }; latest 50, newest first)
// Owner-only (AXON_OWNER_ID). The site and start-date field come from profiles.jira_settings.
import { HttpError, corsHeaders, json } from './http.js'
import { requireOwner } from './auth.js'
import {
  cleanSite,
  isIssueKey,
  jiraCredentials,
  jiraGet,
  normaliseComments,
  normaliseIssue,
} from './jiraApi.js'

const ISSUE_FIELDS = [
  'summary',
  'description',
  'status',
  'priority',
  'labels',
  'components',
  'fixVersions',
  'duedate',
  'updated',
  'issuetype',
]

async function loadJiraSettings(supabase, userId) {
  const { data } = await supabase.from('profiles').select('jira_settings').eq('id', userId).single()
  return data?.jira_settings ?? {}
}

function requireSite(settings) {
  const site = cleanSite(settings.site)
  if (!site) {
    throw new HttpError(
      409,
      'jira_no_site',
      'Set your Jira site (https://<name>.atlassian.net) in Settings first.',
    )
  }
  return site
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })
  if (req.method !== 'POST')
    return json(req, 405, { error: { code: 'method', message: 'POST only' } })

  try {
    const { supabase, user } = await requireOwner(req)
    const body = await req.json().catch(() => ({}))
    const settings = await loadJiraSettings(supabase, user.id)

    switch (body.action) {
      case 'status': {
        const site = cleanSite(settings.site)
        const configured = !!jiraCredentials() && !!site
        let account = null
        if (body.check && configured) {
          const me = await jiraGet(site, '/rest/api/3/myself')
          account = { name: me.displayName ?? null, email: me.emailAddress ?? null }
        }
        return json(req, 200, { configured, hasCredentials: !!jiraCredentials(), site, account })
      }

      case 'meta': {
        const site = requireSite(settings)
        const [statuses, priorities, fields] = await Promise.all([
          jiraGet(site, '/rest/api/3/status'),
          jiraGet(site, '/rest/api/3/priority'),
          jiraGet(site, '/rest/api/3/field'),
        ])
        const byName = new Map()
        for (const s of statuses ?? []) {
          if (s?.name && !byName.has(s.name)) {
            byName.set(s.name, { name: s.name, category: s.statusCategory?.key ?? null })
          }
        }
        return json(req, 200, {
          statuses: [...byName.values()].sort((a, b) => a.name.localeCompare(b.name)),
          priorities: [...new Set((priorities ?? []).map((p) => p?.name).filter(Boolean))],
          dateFields: (fields ?? [])
            .filter((f) => f?.custom && f?.schema?.type === 'date')
            .map((f) => ({ id: f.id, name: f.name }))
            .sort((a, b) => a.name.localeCompare(b.name)),
        })
      }

      case 'fetch_issue': {
        const site = requireSite(settings)
        const key = String(body.key ?? '')
          .trim()
          .toUpperCase()
        if (!isIssueKey(key))
          throw new HttpError(400, 'bad_key', `Not a Jira issue key: ${body.key}`)
        const startField = /^customfield_\d+$/.test(settings.startDateField ?? '')
          ? settings.startDateField
          : null
        const fields = [...ISSUE_FIELDS, ...(startField ? [startField] : [])].join(',')
        const raw = await jiraGet(
          site,
          `/rest/api/3/issue/${encodeURIComponent(key)}?fields=${fields}&expand=renderedFields`,
        )
        return json(req, 200, { issue: normaliseIssue(raw, site, startField) })
      }

      case 'fetch_comments': {
        const site = requireSite(settings)
        const key = String(body.key ?? '')
          .trim()
          .toUpperCase()
        if (!isIssueKey(key))
          throw new HttpError(400, 'bad_key', `Not a Jira issue key: ${body.key}`)
        const raw = await jiraGet(
          site,
          `/rest/api/3/issue/${encodeURIComponent(key)}/comment?orderBy=-created&maxResults=50`,
        )
        return json(req, 200, { comments: normaliseComments(raw) })
      }

      default:
        throw new HttpError(400, 'bad_action', `Unknown action: ${body.action ?? '(none)'}`)
    }
  } catch (err) {
    if (err instanceof HttpError) {
      return json(req, err.status, { error: { code: err.code, message: err.message } })
    }
    console.error(err)
    return json(req, 500, {
      error: { code: 'internal', message: 'Something went wrong in the Jira function.' },
    })
  }
})

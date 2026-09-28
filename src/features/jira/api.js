import { useMutation, useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export const jiraKeys = {
  all: ['jira'],
  status: (params) => [...jiraKeys.all, 'status', params], // { check, site }
  meta: (site) => [...jiraKeys.all, 'meta', site],
}

/** A Jira call that failed with a readable reason (`code` from the Edge Function). */
export class JiraError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'JiraError'
    this.code = code
  }
}

/** POST to the `jira` Edge Function; `{ error: { code, message } }` bodies become `JiraError`. */
export async function invokeJira(action, payload = {}) {
  const { data, error } = await supabase.functions.invoke('jira', { body: { action, ...payload } })
  if (!error) return data
  let body = null
  try {
    body = await error.context?.json()
  } catch {
    // Not JSON: a network or platform error.
  }
  if (body?.error) throw new JiraError(body.error.code, body.error.message)
  throw new JiraError('network', "Couldn't reach the Jira service. Check your connection.")
}

/** `{ configured, hasCredentials, site }`; `site` in the key refetches after it's saved. */
export function useJiraStatus({ site } = {}) {
  return useQuery({
    queryKey: jiraKeys.status({ check: false, site }),
    queryFn: () => invokeJira('status'),
    staleTime: 5 * 60_000,
    retry: false,
  })
}

/** "Test connection": calls Jira's /myself and returns the account name and email. */
export function useTestJiraConnection() {
  return useMutation({ mutationFn: () => invokeJira('status', { check: true }) })
}

/** The site's statuses, priorities and date fields (for the maps and start-date field). */
export function useJiraMeta({ site, enabled = true }) {
  return useQuery({
    queryKey: jiraKeys.meta(site),
    queryFn: () => invokeJira('meta'),
    enabled: enabled && !!site,
    staleTime: 30 * 60_000,
    retry: false,
  })
}

/** An issue's latest comments, newest first: `{ comments: [{ author, created, text }] }`. */
export const fetchJiraComments = (key) => invokeJira('fetch_comments', { key })

/** One issue, normalised: `{ issue }`. */
export const fetchJiraIssue = (key) => invokeJira('fetch_issue', { key })

/** Fetches one issue, normalised (`{ issue }`). Errors show inline in the import panel. */
export function useFetchJiraIssue() {
  return useMutation({ mutationFn: (key) => invokeJira('fetch_issue', { key }) })
}

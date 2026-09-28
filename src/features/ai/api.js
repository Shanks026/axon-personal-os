import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { summariseUsage } from '@/features/ai/utils'

export const aiKeys = {
  all: ['ai'],
  status: () => [...aiKeys.all, 'status'],
  usage: (params) => [...aiKeys.all, 'usage', params], // { since }
}

/** An AI call that failed with a readable reason. `code` is the Edge Function's error code. */
export class AiError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'AiError'
    this.code = code
  }
}

/**
 * POST to the `ai` Edge Function. Non-2xx responses carry `{ error: { code, message } }`; they're
 * rethrown as `AiError` (for example `ai_not_configured` while the key is still the placeholder).
 */
export async function invokeAi(action, payload = {}) {
  const { data, error } = await supabase.functions.invoke('ai', { body: { action, ...payload } })
  if (!error) return data
  let body = null
  try {
    body = await error.context?.json()
  } catch {
    // Not JSON: a network or platform error.
  }
  if (body?.error) throw new AiError(body.error.code, body.error.message)
  throw new AiError(
    'network',
    "Couldn't reach the AI service. Check your connection and try again.",
  )
}

export function useAiStatus() {
  return useQuery({
    queryKey: aiKeys.status(),
    queryFn: () => invokeAi('status'),
    staleTime: 5 * 60_000,
    retry: false,
  })
}

/** This month's model calls (`since` is the first of the month, UTC ISO). */
export async function fetchAiUsage({ since }) {
  const { data, error } = await supabase
    .from('ai_usage')
    .select('id, job, model, cost_usd, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export function useAiMonthUsage({ since }) {
  return useQuery({
    queryKey: aiKeys.usage({ since }),
    queryFn: () => fetchAiUsage({ since }),
    enabled: !!since,
    select: summariseUsage,
  })
}

/**
 * `draft_tasks`: `{ text, model, context }` → `{ tasks, model, usage, costUsd }`. Errors are shown
 * inline by the composer, so there's no toast here.
 */
export function useDraftTasks() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => invokeAi('draft_tasks', payload),
    onSettled: () => qc.invalidateQueries({ queryKey: [...aiKeys.all, 'usage'] }),
  })
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { aiKeys, invokeAi } from '@/features/ai/api'

export const reportKeys = {
  all: ['reports'],
  lists: () => [...reportKeys.all, 'list'],
  list: (params) => [...reportKeys.lists(), params], // { spaceIds, global }
  details: () => [...reportKeys.all, 'detail'],
  detail: (id) => [...reportKeys.details(), id],
}

// Reports are few, so the list reads `content_text` for its excerpt (no generated excerpt column).
const LIST_COLUMNS =
  'id, space_id, title, period_kind, period_start, period_end, fiscal_year, fiscal_quarter, content_text, status, ai_model, generated_at, created_at, updated_at'

/**
 * Reports, newest period first. In a space: that space's reports. In Global: every report of the
 * active spaces plus the Global ones (`space_id` null).
 */
export async function fetchReports({ spaceIds, global }) {
  let query = supabase
    .from('reports')
    .select(LIST_COLUMNS)
    .is('deleted_at', null)
    .order('period_start', { ascending: false })
    .order('created_at', { ascending: false })
  query = global
    ? query.or(`space_id.is.null,space_id.in.(${spaceIds.join(',')})`)
    : query.in('space_id', spaceIds)
  const { data, error } = await query
  if (error) throw error
  return data
}

/** One report with its content. Not scope-filtered: entity routes work in any scope. */
export async function fetchReport(id) {
  const { data, error } = await supabase.from('reports').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function updateReport(id, patch) {
  const { data, error } = await supabase
    .from('reports')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data
}

export const softDeleteReport = (id) => updateReport(id, { deleted_at: new Date().toISOString() })
export const restoreReport = (id) => updateReport(id, { deleted_at: null })

export function useReports(params) {
  return useQuery({
    queryKey: reportKeys.list(params),
    queryFn: () => fetchReports(params),
    enabled: params.spaceIds?.length > 0,
  })
}

export function useReport(id) {
  return useQuery({
    queryKey: reportKeys.detail(id),
    queryFn: () => fetchReport(id),
    enabled: !!id,
  })
}

/** Autosave patches (title, content, content_text). Not optimistic; errors show in the indicator. */
export function useUpdateReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }) => updateReport(id, patch),
    onSuccess: (row) => {
      qc.setQueryData(reportKeys.detail(row.id), (old) => (old ? { ...old, ...row } : row))
      qc.invalidateQueries({ queryKey: reportKeys.lists() })
    },
  })
}

/** Move to Trash, with an Undo toast. */
export function useDeleteReport() {
  const qc = useQueryClient()
  const restore = useMutation({
    mutationFn: restoreReport,
    onSettled: () => qc.invalidateQueries({ queryKey: reportKeys.all }),
    onError: (err) => toast.error(err.message ?? 'Could not restore report'),
  })
  return useMutation({
    mutationFn: (report) => softDeleteReport(report.id),
    onMutate: async (report) => {
      await qc.cancelQueries({ queryKey: reportKeys.lists() })
      const lists = qc.getQueriesData({ queryKey: reportKeys.lists() })
      qc.setQueriesData({ queryKey: reportKeys.lists() }, (old) =>
        old?.filter((r) => r.id !== report.id),
      )
      return { lists }
    },
    onSuccess: (_row, report) =>
      toast('Report moved to Trash', {
        description: report.title,
        action: { label: 'Undo', onClick: () => restore.mutate(report.id) },
      }),
    onError: (err, _report, ctx) => {
      ctx?.lists.forEach(([key, data]) => qc.setQueryData(key, data))
      toast.error(err.message ?? 'Could not delete report')
    },
    onSettled: () => qc.invalidateQueries({ queryKey: reportKeys.all }),
  })
}

/**
 * The `ai` function's `report` action: `{ spaceIds, spaceId, period, range, timezone, model,
 * reportId? }` → `{ report, model, usage, costUsd }`. The function saves the row itself; this
 * seeds the detail cache with it. Errors are shown inline by the caller.
 */
export function useGenerateReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => invokeAi('report', payload),
    onSuccess: ({ report }) => {
      qc.setQueryData(reportKeys.detail(report.id), report)
      qc.invalidateQueries({ queryKey: reportKeys.lists() })
    },
    onSettled: () => qc.invalidateQueries({ queryKey: [...aiKeys.all, 'usage'] }),
  })
}

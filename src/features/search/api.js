import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useDebounce } from 'use-debounce'
import { supabase } from '@/lib/supabase'
import { MIN_QUERY } from '@/features/search/constants'

export const searchKeys = {
  all: ['search'],
  results: (params) => [...searchKeys.all, 'results', params], // { q, spaceIds, includeGlobal, types }
}

/**
 * `search_all` (Feature 12): tasks, notes, journal days, todos, events and reports matching `q`
 * in `spaceIds` (plus Global reports with `includeGlobal`), best first. `types` limits the kinds.
 */
export async function searchAll({ q, spaceIds, includeGlobal = false, types = null, limit = 20 }) {
  const { data, error } = await supabase.rpc('search_all', {
    p_query: q,
    p_space_ids: spaceIds,
    p_limit: limit,
    p_include_global: includeGlobal,
    p_types: types,
  })
  if (error) throw error
  return data
}

/**
 * Debounced (150ms) search for the palette. The previous results stay on screen while the next
 * query runs, so typing never flickers. `isDebouncing` is true while the latest keystroke waits.
 */
export function useSearch({ q, spaceIds, includeGlobal, types }) {
  const trimmed = q.trim()
  const [debounced] = useDebounce(trimmed, 150)
  const query = useQuery({
    queryKey: searchKeys.results({ q: debounced, spaceIds, includeGlobal, types }),
    queryFn: () => searchAll({ q: debounced, spaceIds, includeGlobal, types }),
    enabled: debounced.length >= MIN_QUERY && spaceIds?.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  })
  return { ...query, isDebouncing: debounced !== trimmed }
}

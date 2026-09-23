import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { DEFAULT_FY_START_MONTH } from '@/lib/fiscal'
import { useAuth } from '@/context/AuthContext'
import { fetchMyProfile, profileKeys } from '@/features/auth/api'

export const PROFILE_UPDATE_KEY = ['profile', 'update']

const DEFAULTS = {
  fyStartMonth: DEFAULT_FY_START_MONTH,
  weekStartsOn: 1,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  theme: 'system',
}

export async function updateMyProfile(userId, patch) {
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Optimistic profile update. Settings rows fire it on every change. */
export function useUpdateMyProfile() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const key = profileKeys.me(user?.id)

  return useMutation({
    mutationKey: PROFILE_UPDATE_KEY,
    mutationFn: (patch) => updateMyProfile(user.id, patch),
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData(key)
      qc.setQueryData(key, (old) => (old ? { ...old, ...patch } : old))
      return { previous }
    },
    onError: (err, _patch, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous)
      toast.error(err.message ?? 'Could not save your settings')
    },
    onSuccess: (row) => qc.setQueryData(key, row),
  })
}

/**
 * App-wide preferences with defaults applied, so callers never wait on the profile to render.
 * `{ fyStartMonth, weekStartsOn, timezone, theme, isLoaded }`
 */
export function usePreferences() {
  const { user } = useAuth()
  const { data } = useQuery({
    queryKey: profileKeys.me(user?.id),
    queryFn: () => fetchMyProfile(user.id),
    enabled: !!user?.id,
  })
  return {
    fyStartMonth: data?.fy_start_month ?? DEFAULTS.fyStartMonth,
    weekStartsOn: data?.week_starts_on ?? DEFAULTS.weekStartsOn,
    timezone: data?.timezone ?? DEFAULTS.timezone,
    theme: data?.theme ?? DEFAULTS.theme,
    isLoaded: !!data,
  }
}

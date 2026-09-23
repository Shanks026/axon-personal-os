import { useIsMutating, useMutationState } from '@tanstack/react-query'
import { PROFILE_UPDATE_KEY } from '@/features/settings/api'

/** Status for <SaveIndicator>, derived from the latest profile update: saving → saved | error. */
export function useProfileSaveStatus() {
  const pending = useIsMutating({ mutationKey: PROFILE_UPDATE_KEY }) > 0
  const last = useMutationState({
    filters: { mutationKey: PROFILE_UPDATE_KEY },
    select: (m) => m.state.status,
  }).at(-1)

  if (pending) return 'saving'
  if (last === 'error') return 'error'
  if (last === 'success') return 'saved'
  return 'idle'
}

import { Skeleton } from '@/components/ui/skeleton'
import { useAttachmentUsage } from '@/features/attachments/api'
import { formatBytes } from '@/features/attachments/utils'
import { SettingsRow } from '@/features/settings/components/SettingsCard'

/** The free plan's storage, in bytes (1 GB for every file in the project). */
const FREE_PLAN_BYTES = 1024 ** 3

/** Settings → Preferences: how much of the free plan's 1 GB the task attachments use. */
export function StorageUsageRow() {
  const { data: used, isLoading, isError } = useAttachmentUsage()
  return (
    <SettingsRow
      label="Storage"
      description="Task attachments, on the Supabase free plan's 1 GB (editor images aren't counted)."
    >
      {isLoading ? (
        <Skeleton className="h-5 w-28" />
      ) : isError ? (
        <span className="text-muted-foreground">Unavailable</span>
      ) : (
        <span className="font-mono text-xs whitespace-nowrap text-muted-foreground tabular-nums">
          {formatBytes(used)} of {formatBytes(FREE_PLAN_BYTES)}
        </span>
      )}
    </SettingsRow>
  )
}

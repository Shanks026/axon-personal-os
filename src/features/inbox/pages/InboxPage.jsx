import { subDays } from 'date-fns'
import { Plus } from 'lucide-react'
import { todayISO, zonedInstant } from '@/lib/dates'
import { useSpace } from '@/context/SpaceContext'
import { useGlobalDialog } from '@/hooks/useGlobalDialog'
import { usePageHeader } from '@/components/layout/PageHeaderContext'
import { ErrorState } from '@/components/shared/ErrorState'
import { SegmentedControl } from '@/components/shared/SegmentedControl'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useInboxItems, useProcessedItems, useTriagedCount } from '@/features/inbox/api'
import { InboxConvertDialogs } from '@/features/inbox/components/InboxConvertDialogs'
import { InboxList } from '@/features/inbox/components/InboxList'
import { InboxZero } from '@/features/inbox/components/InboxZero'
import { ProcessedList } from '@/features/inbox/components/ProcessedList'
import { useInboxActions } from '@/features/inbox/hooks/useInboxActions'
import { useInboxScope } from '@/features/inbox/hooks/useInboxScope'
import { useInboxTab } from '@/features/inbox/hooks/useInboxTab'
import { usePreferences } from '@/features/settings/api'

/**
 * /s/:slug/inbox (Feature 13): open items, newest first, with keyboard triage; and Processed
 * (`?tab=processed`, the last 30 days, with Restore). A space shows its own; Global shows every
 * space's plus Unsorted, with badges. 760px wide (the design delta).
 */
export default function InboxPage() {
  const { isGlobal, space, spaceById } = useSpace()
  const scope = useInboxScope()
  const { timezone } = usePreferences()
  const { open: openDialog } = useGlobalDialog()
  const { tab, setTab } = useInboxTab()
  const open = useInboxItems(scope)
  const items = open.data ?? []
  const midnight = zonedInstant(todayISO(timezone), '00:00', timezone)
  const { data: triagedToday = 0 } = useTriagedCount({ ...scope, since: midnight.toISOString() })
  const processed = useProcessedItems({
    ...scope,
    since: tab === 'processed' ? subDays(midnight, 30).toISOString() : null,
  })
  const actions = useInboxActions()

  usePageHeader({ title: 'Inbox' })

  return (
    <div className="mx-auto flex w-full max-w-190 flex-col px-4 pt-8 pb-12">
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-3">
            <h2 className="text-3xl font-semibold tracking-tight">Inbox</h2>
            <span className="text-2xl font-light text-faint tabular-nums">{items.length}</span>
          </div>
          <p className="mt-1.5 text-muted-foreground">
            {isGlobal
              ? 'Captured thoughts from every space, and the unsorted ones.'
              : `Captured thoughts for ${space?.name}.`}
          </p>
        </div>
        <Button variant="outline" className="h-9" onClick={() => openDialog('capture')}>
          <Plus />
          Capture
        </Button>
      </div>

      <SegmentedControl
        label="Inbox view"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'open', label: `Open${items.length ? ` · ${items.length}` : ''}` },
          { value: 'processed', label: 'Processed' },
        ]}
        className="mt-6 self-start"
      />

      <div className="mt-5">
        {tab === 'processed' ? (
          <ProcessedList query={processed} spaceById={spaceById} showSpace={isGlobal} />
        ) : open.isLoading ? (
          <div className="flex flex-col gap-2" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        ) : open.error ? (
          <ErrorState error={open.error} onRetry={open.refetch} title="Couldn’t load the inbox" />
        ) : items.length === 0 ? (
          <InboxZero triagedToday={triagedToday} onCapture={() => openDialog('capture')} />
        ) : (
          // Keyed on scope, so switching space starts with no selection.
          <InboxList
            key={scope.spaceIds.join(',')}
            items={items}
            spaceById={spaceById}
            showSpace={isGlobal}
            actions={actions}
          />
        )}
      </div>

      <InboxConvertDialogs
        dialog={actions.dialog}
        onClose={actions.closeDialog}
        processed={actions.processed}
      />
    </div>
  )
}

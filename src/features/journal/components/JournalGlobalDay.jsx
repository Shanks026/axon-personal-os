import { NotebookPen } from 'lucide-react'
import { motion } from 'motion/react'
import { Link } from 'react-router'
import { paths } from '@/lib/paths'
import { useSpace } from '@/context/SpaceContext'
import { staggerItem } from '@/components/motion/presets'
import { RichTextEditor } from '@/components/editor/RichTextEditor'
import { ErrorState } from '@/components/shared/ErrorState'
import { SpaceBadge } from '@/components/shared/SpaceBadge'
import { Button } from '@/components/ui/button'
import { useJournalDay } from '@/features/journal/api'
import { JournalSkeleton } from '@/features/journal/components/JournalSkeleton'
import { JOURNAL_HEADING_TONES } from '@/features/journal/constants'

const item = staggerItem()
const READ_ONLY_FEATURES = { slash: false, headingTones: JOURNAL_HEADING_TONES }

/**
 * Global: every active space's entry for the day, stacked and read-only (the user's decision,
 * 2026-09-26). Writing happens inside a space: a space with nothing written links there.
 */
export function JournalGlobalDay({ date, className }) {
  const { activeSpaces, scopeSpaceIds } = useSpace()
  const {
    data: entries,
    isLoading,
    error,
    refetch,
  } = useJournalDay({
    spaceIds: scopeSpaceIds,
    date,
  })

  if (isLoading) return <JournalSkeleton className={className} />
  if (error) {
    return (
      <ErrorState
        error={error}
        onRetry={refetch}
        title="Couldn’t load this day"
        className={className}
      />
    )
  }

  const bySpace = new Map(entries.map((e) => [e.space_id, e]))
  return (
    <div key={date} className={className}>
      <div className="flex flex-col gap-4">
        {activeSpaces.map((space, i) => {
          const entry = bySpace.get(space.id)
          const to = paths.space(space.slug).journal(date)
          return (
            <motion.section
              key={space.id}
              variants={item}
              custom={i}
              initial="initial"
              animate="animate"
              aria-label={space.name}
              className="rounded-xl border bg-card px-5 py-4"
            >
              {entry ? (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <SpaceBadge space={space} />
                    <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
                      <Link to={to}>
                        <NotebookPen />
                        Open
                      </Link>
                    </Button>
                  </div>
                  <RichTextEditor
                    key={`${entry.id}:${entry.updated_at}`}
                    value={entry.content}
                    editable={false}
                    fit
                    features={READ_ONLY_FEATURES}
                    label={`${space.name} journal entry`}
                    className="axon-journal mt-3 text-base leading-7"
                  />
                </>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <SpaceBadge space={space} />
                    <span className="truncate text-muted-foreground">Nothing written</span>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link to={to}>Write in {space.name}</Link>
                  </Button>
                </div>
              )}
            </motion.section>
          )
        })}
      </div>
    </div>
  )
}

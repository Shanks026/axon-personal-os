import { useEffect, useMemo } from 'react'
import { motion } from 'motion/react'
import { fadeIn } from '@/components/motion/presets'
import { RichTextEditor } from '@/components/editor/RichTextEditor'
import { ErrorState } from '@/components/shared/ErrorState'
import { useImageHandlers } from '@/features/attachments/api'
import { useTaskMentionsConfig } from '@/features/links/hooks/useTaskMentionsConfig'
import { useJournalEntry } from '@/features/journal/api'
import { JournalSkeleton } from '@/features/journal/components/JournalSkeleton'
import { JOURNAL_HEADING_TONES, JOURNAL_TEMPLATE } from '@/features/journal/constants'
import { useJournalAutosave } from '@/features/journal/hooks/useJournalAutosave'

/** The editor for one loaded day. Mounted per space, date and reset (it reads `entry` once). */
function EntryEditor({ entry, spaceId, date, onSaveState }) {
  const { onChange, flush, status } = useJournalAutosave({ entry, spaceId, date })
  const taskMentions = useTaskMentionsConfig({ space_id: spaceId })
  // Paste, drop or "/ Image" upload into the entry's space (Feature 15).
  const images = useImageHandlers({ spaceId })
  const features = useMemo(
    () => ({
      slash: true,
      taskMentions,
      images,
      onSave: flush,
      headingTones: JOURNAL_HEADING_TONES,
    }),
    [taskMentions, images, flush],
  )

  useEffect(() => {
    onSaveState?.({ status, flush })
  }, [status, flush, onSaveState])

  return (
    <RichTextEditor
      value={entry?.content ?? JOURNAL_TEMPLATE}
      onChange={onChange}
      features={features}
      placeholder="Type '/' for commands, or @ to link a task"
      label="Journal entry"
      className="axon-journal text-base leading-7"
    />
  )
}

/**
 * One space's entry for a day: the saved entry, or the standup template when nothing is written
 * (nothing is stored until the first edit). `resetKey` remounts the editor after Clear or Undo.
 * `onSaveState({ status, flush })` feeds the page header's save indicator.
 */
export function JournalEditor({ spaceId, date, resetKey = 0, onSaveState, className }) {
  const { data: entry, isLoading, error, refetch } = useJournalEntry({ spaceId, date })

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

  const key = `${spaceId}:${date}:${resetKey}`
  return (
    <motion.div
      key={key}
      variants={fadeIn}
      initial="initial"
      animate="animate"
      className={className}
    >
      <EntryEditor
        key={key}
        entry={entry}
        spaceId={spaceId}
        date={date}
        onSaveState={onSaveState}
      />
    </motion.div>
  )
}

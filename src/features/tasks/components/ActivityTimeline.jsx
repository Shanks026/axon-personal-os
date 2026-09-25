import { useMemo } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { listItem } from '@/components/motion/presets'
import { ErrorState } from '@/components/shared/ErrorState'
import { Skeleton } from '@/components/ui/skeleton'
import { useNotesByIds } from '@/features/notes/api'
import { useTaskActivity } from '@/features/tasks/api'
import { ActivityEntry } from '@/features/tasks/components/ActivityEntry'
import { CommentComposer } from '@/features/tasks/components/CommentComposer'
import { CommentEntry } from '@/features/tasks/components/CommentEntry'

/**
 * The task's "Activity" stream (design delta 07): one list, oldest first, no filter. Automatic
 * entries (from the log trigger) read as sentences; manual ones are "Work log" cards. The
 * composer sits at the bottom. A thin line joins the entry icons.
 */
export function ActivityTimeline({ taskId }) {
  const { data: entries, isLoading, error, refetch } = useTaskActivity(taskId)
  // Titles for "Linked note ‘…’" lines; a note missing here has been deleted for good.
  const noteIds = useMemo(
    () =>
      [
        ...new Set(
          (entries ?? [])
            .filter((e) => e.kind === 'note_linked' || e.kind === 'note_unlinked')
            .map((e) => e.to_value ?? e.from_value),
        ),
      ].sort(),
    [entries],
  )
  const { data: notes } = useNotesByIds(noteIds)
  const noteTitleById = useMemo(
    () => (notes ? new Map(notes.map((n) => [n.id, n.title])) : undefined),
    [notes],
  )

  return (
    <section aria-labelledby="task-activity">
      <h2 id="task-activity" className="mb-3 font-medium">
        Activity
      </h2>
      {isLoading ? (
        <div className="flex flex-col gap-3" aria-hidden>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-6 rounded-full" />
              <Skeleton className="h-3.5" style={{ width: `${35 + ((i * 19) % 35)}%` }} />
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} title="Couldn’t load the activity" />
      ) : (
        <div className="relative">
          {entries.length > 1 && (
            <span aria-hidden className="absolute top-3 bottom-3 left-3 w-px bg-border" />
          )}
          {entries.length === 0 && <p className="py-2 text-muted-foreground">No activity yet.</p>}
          <AnimatePresence initial={false}>
            {entries.map((entry) => (
              <motion.div
                key={entry.id}
                layout
                variants={listItem}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                {entry.kind === 'comment' ? (
                  <CommentEntry entry={entry} />
                ) : (
                  <ActivityEntry entry={entry} noteTitleById={noteTitleById} />
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
      <div className="mt-3 pl-9">
        <CommentComposer taskId={taskId} />
      </div>
    </section>
  )
}

import { useMemo } from 'react'
import { Plus } from 'lucide-react'
import { mergeVersions } from '@/lib/versions'
import { VersionBadge } from '@/components/shared/VersionBadge'
import { VersionPicker } from '@/components/shared/VersionPicker'
import { useNoteVersions, useSetNoteVersions } from '@/features/notes/api'
import { useTaskVersions } from '@/features/tasks/api'

/**
 * The "Versions" row in the note's Details rail (moved out of the title row at the user's
 * request, 2026-09-26, matching the task page's rail): removable badges and a "+ Version" picker
 * suggesting versions used on tasks and notes in the note's space.
 */
export function NoteVersionBadges({ note }) {
  const spaceIds = useMemo(() => [note.space_id], [note.space_id])
  const { data: taskVersions = [] } = useTaskVersions({ spaceIds })
  const { data: noteVersions = [] } = useNoteVersions({ spaceIds })
  const setVersions = useSetNoteVersions()
  const known = useMemo(
    () => mergeVersions(taskVersions, noteVersions),
    [taskVersions, noteVersions],
  )
  const versions = note.versions ?? []
  const save = (next) => setVersions.mutate({ id: note.id, versions: next })

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-muted-foreground">Versions</span>
      <div className="flex flex-wrap items-center gap-1">
        {versions.map((v) => (
          <VersionBadge
            key={v}
            version={v}
            onRemove={() => save(versions.filter((x) => x !== v))}
          />
        ))}
        <VersionPicker
          value={versions}
          onChange={save}
          known={known}
          trigger={
            <button
              type="button"
              className="flex h-5 items-center gap-1 rounded-sm border border-dashed border-border-strong px-1.75 text-xs text-faint outline-none hover:border-faint hover:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plus className="size-3" aria-hidden />
              Version
            </button>
          }
        />
      </div>
    </div>
  )
}

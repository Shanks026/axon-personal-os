import { VersionBadge } from '@/components/shared/VersionBadge'
import { useSetNoteVersions } from '@/features/notes/api'

/**
 * The note's versions at the right end of the title row (like the task card and dialog),
 * each removable. Added from the "+ Version" pill in the tags row. Renders nothing without any.
 */
export function NoteVersionBadges({ note }) {
  const setVersions = useSetNoteVersions()
  const versions = note.versions ?? []
  if (!versions.length) return null

  return (
    // mt-2 centres the 26px badges on the title's first 40px line.
    <div className="mt-2 flex max-w-1/2 shrink-0 flex-wrap justify-end gap-1">
      {versions.map((v) => (
        <VersionBadge
          key={v}
          version={v}
          className="h-6.5 max-w-60 px-2 text-sm"
          onRemove={() =>
            setVersions.mutate({ id: note.id, versions: versions.filter((x) => x !== v) })
          }
        />
      ))}
    </div>
  )
}

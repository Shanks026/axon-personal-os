import { useMemo } from 'react'
import { Plus } from 'lucide-react'
import { formatRelative } from '@/lib/dates'
import { mergeVersions } from '@/lib/versions'
import { TagPill } from '@/components/shared/TagPill'
import { TagPicker } from '@/components/shared/TagPicker'
import { VersionBadge } from '@/components/shared/VersionBadge'
import { VersionPicker } from '@/components/shared/VersionPicker'
import { useNoteVersions, useSetNoteVersions } from '@/features/notes/api'
import { useSetNoteTags, useTags } from '@/features/tags/api'
import { useTaskVersions } from '@/features/tasks/api'

function AddPill({ children, ...props }) {
  return (
    <button
      type="button"
      className="flex h-6.5 items-center gap-1 rounded-full border border-dashed border-border-strong px-2.5 text-faint outline-none hover:border-faint hover:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
      {...props}
    >
      <Plus className="size-3.25" aria-hidden />
      {children}
    </button>
  )
}

/**
 * Under the title (design 07b): the note's tags and versions (both removable), dashed "+ Tag"
 * and "+ Version" pickers, and "Edited 2h ago". Tags can be created in the note's space;
 * versions are free text, suggested from the tasks and notes in that space (like the task card).
 */
export function NoteTagsRow({ note }) {
  const spaceIds = useMemo(() => [note.space_id], [note.space_id])
  const { data: tags = [] } = useTags({ spaceIds })
  const { data: taskVersions = [] } = useTaskVersions({ spaceIds })
  const { data: noteVersions = [] } = useNoteVersions({ spaceIds })
  const setTags = useSetNoteTags()
  const setVersions = useSetNoteVersions()
  const byId = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags])
  const knownVersions = useMemo(
    () => mergeVersions(taskVersions, noteVersions),
    [taskVersions, noteVersions],
  )
  const selected = note.tag_ids.map((id) => byId.get(id)).filter(Boolean)
  const versions = note.versions ?? []
  const saveTags = (tagIds) => setTags.mutate({ noteId: note.id, tagIds })
  const saveVersions = (next) => setVersions.mutate({ id: note.id, versions: next })

  return (
    <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
      {selected.map((tag) => (
        <TagPill
          key={tag.id}
          tag={tag}
          size="md"
          onRemove={() => saveTags(note.tag_ids.filter((id) => id !== tag.id))}
        />
      ))}
      {versions.map((v) => (
        <VersionBadge
          key={v}
          version={v}
          className="h-6.5 max-w-60 px-2 text-sm"
          onRemove={() => saveVersions(versions.filter((x) => x !== v))}
        />
      ))}
      <TagPicker
        value={note.tag_ids}
        onChange={saveTags}
        spaceIds={spaceIds}
        createSpaceId={note.space_id}
        trigger={<AddPill>Tag</AddPill>}
      />
      <VersionPicker
        value={versions}
        onChange={saveVersions}
        known={knownVersions}
        trigger={<AddPill>Version</AddPill>}
      />
      <span className="ml-2 font-mono text-xs text-faint">
        Edited {formatRelative(note.updated_at)}
      </span>
    </div>
  )
}

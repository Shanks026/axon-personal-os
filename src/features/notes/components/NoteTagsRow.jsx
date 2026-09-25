import { useMemo } from 'react'
import { Plus } from 'lucide-react'
import { formatRelative } from '@/lib/dates'
import { TagPill } from '@/components/shared/TagPill'
import { TagPicker } from '@/components/shared/TagPicker'
import { useSetNoteTags, useTags } from '@/features/tags/api'

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
 * Under the title (design 07b): the note's tags (removable), a dashed "+ Tag" picker (tags can be
 * created in the note's space), and "Edited 2h ago" on its own line below. Versions live in the
 * Details rail (`NoteVersionBadges`).
 */
export function NoteTagsRow({ note }) {
  const spaceIds = useMemo(() => [note.space_id], [note.space_id])
  const { data: tags = [] } = useTags({ spaceIds })
  const setTags = useSetNoteTags()
  const byId = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags])
  const selected = note.tag_ids.map((id) => byId.get(id)).filter(Boolean)
  const saveTags = (tagIds) => setTags.mutate({ noteId: note.id, tagIds })

  return (
    <div className="mt-3.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {selected.map((tag) => (
          <TagPill
            key={tag.id}
            tag={tag}
            size="md"
            onRemove={() => saveTags(note.tag_ids.filter((id) => id !== tag.id))}
          />
        ))}
        <TagPicker
          value={note.tag_ids}
          onChange={saveTags}
          spaceIds={spaceIds}
          createSpaceId={note.space_id}
          trigger={<AddPill>Tag</AddPill>}
        />
      </div>
      {/* Its own line, so it never wraps in tight against the pills. */}
      <p className="mt-3 font-mono text-xs text-faint">Edited {formatRelative(note.updated_at)}</p>
    </div>
  )
}

import { useMemo } from 'react'
import { Plus } from 'lucide-react'
import { formatRelative } from '@/lib/dates'
import { TagPill } from '@/components/shared/TagPill'
import { TagPicker } from '@/components/shared/TagPicker'
import { useSetNoteTags, useTags } from '@/features/tags/api'

/**
 * Under the title (design 07b): the note's tags (removable), a dashed "+ Tag" picker trigger
 * that can also create tags in the note's space, and "Edited 2h ago".
 */
export function NoteTagsRow({ note }) {
  const spaceIds = useMemo(() => [note.space_id], [note.space_id])
  const { data: tags = [] } = useTags({ spaceIds })
  const setTags = useSetNoteTags()
  const byId = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags])
  const selected = note.tag_ids.map((id) => byId.get(id)).filter(Boolean)
  const save = (tagIds) => setTags.mutate({ noteId: note.id, tagIds })

  return (
    <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
      {selected.map((tag) => (
        <TagPill
          key={tag.id}
          tag={tag}
          size="md"
          onRemove={() => save(note.tag_ids.filter((id) => id !== tag.id))}
        />
      ))}
      <TagPicker
        value={note.tag_ids}
        onChange={save}
        spaceIds={spaceIds}
        createSpaceId={note.space_id}
        trigger={
          <button
            type="button"
            className="flex h-6.5 items-center gap-1 rounded-full border border-dashed border-border-strong px-2.5 text-faint outline-none hover:border-faint hover:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="size-3.25" aria-hidden />
            Tag
          </button>
        }
      />
      <span className="ml-2 font-mono text-xs text-faint">
        Edited {formatRelative(note.updated_at)}
      </span>
    </div>
  )
}

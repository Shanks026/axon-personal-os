import { useMemo } from 'react'
import { Plus } from 'lucide-react'
import { TagPill } from '@/components/shared/TagPill'
import { TagPicker } from '@/components/shared/TagPicker'
import { useSetNoteTags, useTags } from '@/features/tags/api'

/**
 * The "Tags" row in the note's Details rail (moved from under the title at the user's request,
 * 2026-09-26, so a note's metadata sits in one place, as on the task page): removable pills and a
 * dashed "+ Tag" picker that can also create tags in the note's space.
 */
export function NoteTagsRow({ note }) {
  const spaceIds = useMemo(() => [note.space_id], [note.space_id])
  const { data: tags = [] } = useTags({ spaceIds })
  const setTags = useSetNoteTags()
  const byId = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags])
  const selected = note.tag_ids.map((id) => byId.get(id)).filter(Boolean)
  const save = (tagIds) => setTags.mutate({ noteId: note.id, tagIds })

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-muted-foreground">Tags</span>
      <div className="flex flex-wrap items-center gap-1">
        {selected.map((tag) => (
          <TagPill
            key={tag.id}
            tag={tag}
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
              className="flex h-5 items-center gap-1 rounded-sm border border-dashed border-border-strong px-1.75 text-xs text-faint outline-none hover:border-faint hover:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Plus className="size-3" aria-hidden />
              Tag
            </button>
          }
        />
      </div>
    </div>
  )
}

import { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { useDefaultSpaceId } from '@/hooks/useDefaultSpaceId'
import { useCreateNote } from '@/features/notes/api'
import { useSpacePaths } from '@/features/spaces/hooks/useSpacePaths'

/**
 * Creates a note and opens it in the editor, within the current scope (a space, or Global).
 * Without `spaceId` the note goes to the default space (the current space, else the last active,
 * else the first), silently, as the task dialog does (decision B). `initialContent` is an
 * optional `{ content, content_text }` pair (inbox conversion in Feature 12). Doesn't depend
 * on `NotesPage`, so `?new=note` can call it from anywhere in the shell.
 */
export function useCreateAndOpenNote() {
  const navigate = useNavigate()
  const p = useSpacePaths()
  const defaultSpaceId = useDefaultSpaceId()
  const create = useCreateNote()
  const { mutate } = create

  const createAndOpen = useCallback(
    ({ spaceId, title = '', initialContent } = {}) =>
      mutate(
        {
          space_id: spaceId ?? defaultSpaceId,
          title,
          content: initialContent?.content ?? null,
          content_text: initialContent?.content_text ?? '',
        },
        { onSuccess: (row) => navigate(p.note(row.id)) },
      ),
    [mutate, defaultSpaceId, navigate, p],
  )

  return { createAndOpen, isPending: create.isPending, canCreate: !!defaultSpaceId }
}

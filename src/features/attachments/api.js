import { useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { imagePath, readImageSize, validateImageFile } from '@/features/attachments/utils'

export const attachmentKeys = {
  all: ['attachments'],
  url: (path) => [...attachmentKeys.all, 'url', path], // signed URL for one stored image
}

const BUCKET = 'attachments'
const SIGNED_URL_TTL = 60 * 60 // seconds
// Re-sign well before the URL expires; drop cached URLs just before they would.
const URL_STALE_MS = 50 * 60 * 1000
const URL_GC_MS = 55 * 60 * 1000

/**
 * Uploads an editor image to the private bucket at `{user}/{space}/{uuid}.{ext}` and returns
 * `{ path, width, height }` (the natural size, so the editor can hold the space before load).
 * Rejects with a friendly message for a wrong type or size.
 */
export async function uploadImage({ spaceId, file }) {
  const problem = validateImageFile(file)
  if (problem) throw new Error(problem)
  const { data: auth, error: authError } = await supabase.auth.getSession()
  if (authError) throw authError
  const userId = auth.session?.user.id
  if (!userId) throw new Error('Sign in again to add images.')

  const path = imagePath({ userId, spaceId, id: crypto.randomUUID(), mime: file.type })
  const [size, upload] = await Promise.all([
    readImageSize(file),
    supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false }),
  ])
  if (upload.error) throw upload.error
  return { path, ...size }
}

/** A signed URL for one stored image (valid for an hour). */
export async function fetchImageUrl(path) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL)
  if (error) throw error
  return data.signedUrl
}

const imageUrlQuery = (path) => ({
  queryKey: attachmentKeys.url(path),
  queryFn: () => fetchImageUrl(path),
  staleTime: URL_STALE_MS,
  gcTime: URL_GC_MS,
})

export function useImageUrl(path) {
  return useQuery({ ...imageUrlQuery(path), enabled: !!path })
}

/**
 * The editor's `features.images` for a space: `validate`, `upload` and `resolveUrl`. URLs go
 * through the query cache, so each image is signed at most about once an hour however often it
 * renders. `null` without a space (images are then off in the editor).
 */
export function useImageHandlers({ spaceId }) {
  const qc = useQueryClient()
  return useMemo(
    () =>
      spaceId
        ? {
            validate: validateImageFile,
            upload: (file) => uploadImage({ spaceId, file }),
            resolveUrl: (path) => qc.fetchQuery(imageUrlQuery(path)),
          }
        : null,
    [spaceId, qc],
  )
}

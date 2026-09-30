import { useMemo } from 'react'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import {
  attachmentPath,
  imagePath,
  readImageSize,
  validateAttachmentFile,
  validateImageFile,
} from '@/features/attachments/utils'
import { taskKeys } from '@/features/tasks/api'

export const attachmentKeys = {
  all: ['attachments'],
  url: (path) => [...attachmentKeys.all, 'url', path], // signed URL for one stored image
  task: (taskId) => [...attachmentKeys.all, 'task', taskId], // a task's files (Phase 2)
  usage: () => [...attachmentKeys.all, 'usage'], // bytes stored in attachments
}

const BUCKET = 'attachments'
const SIGNED_URL_TTL = 60 * 60 // seconds
// Re-sign well before the URL expires; drop cached URLs just before they would.
const URL_STALE_MS = 50 * 60 * 1000
const URL_GC_MS = 55 * 60 * 1000

/** The signed-in user id from the local session (no network round trip). */
async function currentUserId(message) {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  const userId = data.session?.user.id
  if (!userId) throw new Error(message)
  return userId
}

/**
 * Uploads an editor image to the private bucket at `{user}/{space}/{uuid}.{ext}` and returns
 * `{ path, width, height }` (the natural size, so the editor can hold the space before load).
 * Rejects with a friendly message for a wrong type or size.
 */
export async function uploadImage({ spaceId, file }) {
  const problem = validateImageFile(file)
  if (problem) throw new Error(problem)
  const userId = await currentUserId('Sign in again to add images.')

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

/** Signed view URLs for several stored files (the preview lightbox): a Map of path → URL. */
export function useSignedUrls(paths) {
  return useQueries({
    queries: paths.map((path) => ({ ...imageUrlQuery(path), enabled: !!path })),
    combine: (results) => new Map(paths.map((path, i) => [path, results[i].data])),
  })
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

// ── Task file attachments (Phase 2) ──────────────────────────────────────────────────────────

const ATTACHMENT_COLUMNS =
  'id, space_id, task_id, path, name, mime, size, width, height, source, jira_attachment_id, external_url, created_at'

/** A task's files, oldest first. */
export async function fetchTaskAttachments(taskId) {
  const { data, error } = await supabase
    .from('attachments')
    .select(ATTACHMENT_COLUMNS)
    .eq('task_id', taskId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export function useTaskAttachments(taskId) {
  return useQuery({
    queryKey: attachmentKeys.task(taskId),
    queryFn: () => fetchTaskAttachments(taskId),
    enabled: !!taskId,
  })
}

/**
 * Uploads one file to `{user}/{space}/{uuid}.{ext}` and records it on the task. If the row can't
 * be saved, the stored object is removed again. Returns the row.
 */
export async function uploadAttachment({ task, file }) {
  const problem = validateAttachmentFile(file)
  if (problem) throw new Error(problem)
  const userId = await currentUserId('Sign in again to attach files.')
  const path = attachmentPath({
    userId,
    spaceId: task.space_id,
    id: crypto.randomUUID(),
    name: file.name,
    mime: file.type,
  })
  const mime = file.type || 'application/octet-stream'
  const size = mime.startsWith('image/') ? await readImageSize(file) : {}
  const upload = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: mime, upsert: false })
  if (upload.error) throw upload.error

  const { data, error } = await supabase
    .from('attachments')
    .insert({
      space_id: task.space_id,
      task_id: task.id,
      path,
      name: file.name.slice(0, 255),
      mime: mime.slice(0, 150),
      size: file.size,
      width: size.width || null,
      height: size.height || null,
    })
    .select(ATTACHMENT_COLUMNS)
    .single()
  if (error) {
    await supabase.storage.from(BUCKET).remove([path])
    throw error
  }
  return data
}

/** Removes the stored object (when there is one), then the row. */
export async function deleteAttachment(row) {
  if (row.path) {
    const { error } = await supabase.storage.from(BUCKET).remove([row.path])
    if (error) throw error
  }
  const { error } = await supabase.from('attachments').delete().eq('id', row.id)
  if (error) throw error
}

/** A short-lived URL that downloads the file under its own name; a file left in Jira opens there. */
export async function getDownloadUrl(row) {
  if (!row.path) return row.external_url
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(row.path, 60, { download: row.name })
  if (error) throw error
  return data.signedUrl
}

/** Bytes stored as attachments (editor images aren't in the table). */
export async function fetchAttachmentUsage() {
  const { data, error } = await supabase.from('attachments').select('size').not('path', 'is', null)
  if (error) throw error
  return data.reduce((sum, r) => sum + Number(r.size || 0), 0)
}

export function useAttachmentUsage() {
  return useQuery({ queryKey: attachmentKeys.usage(), queryFn: fetchAttachmentUsage })
}

/** What an attachment change touches: the task's list, storage used, and card counts. */
function invalidateAfterChange(qc, taskId) {
  qc.invalidateQueries({ queryKey: attachmentKeys.task(taskId) })
  qc.invalidateQueries({ queryKey: attachmentKeys.usage() })
  qc.invalidateQueries({ queryKey: taskKeys.lists() })
}

/**
 * Uploads `{ task, files }` one at a time; `onFileSettled(file)` lets the section drop each
 * placeholder row as it finishes. Resolves to `{ uploaded, failed: [{ file, message }] }` and
 * toasts once at the end.
 */
export function useUploadAttachments() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ task, files, onFileSettled }) => {
      const uploaded = []
      const failed = []
      for (const file of files) {
        try {
          uploaded.push(await uploadAttachment({ task, file }))
          qc.setQueryData(attachmentKeys.task(task.id), (old) =>
            old ? [...old, uploaded.at(-1)] : old,
          )
        } catch (err) {
          failed.push({ file, message: err.message ?? 'Upload failed' })
        }
        onFileSettled?.(file)
      }
      return { uploaded, failed }
    },
    onSuccess: ({ uploaded, failed }) => {
      if (failed.length === 1) {
        toast.error(`Couldn’t attach “${failed[0].file.name}”`, {
          description: failed[0].message,
        })
      } else if (failed.length > 1) {
        toast.error(`Couldn’t attach ${failed.length} files`, {
          description: failed.map((f) => `${f.file.name}: ${f.message}`).join('\n'),
        })
      }
      if (uploaded.length) {
        toast.success(uploaded.length === 1 ? 'File attached' : `Attached ${uploaded.length} files`)
      }
    },
    onSettled: (_res, _err, { task }) => invalidateAfterChange(qc, task.id),
  })
}

/** Deletes one file for good; removed from the task's list straight away. */
export function useDeleteAttachment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteAttachment,
    onMutate: async (row) => {
      const key = attachmentKeys.task(row.task_id)
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData(key)
      qc.setQueryData(key, (old) => old?.filter((a) => a.id !== row.id))
      return { previous }
    },
    onError: (err, row, ctx) => {
      if (ctx?.previous) qc.setQueryData(attachmentKeys.task(row.task_id), ctx.previous)
      toast.error(err.message ?? 'Could not delete the file')
    },
    onSettled: (_res, _err, row) => invalidateAfterChange(qc, row.task_id),
  })
}

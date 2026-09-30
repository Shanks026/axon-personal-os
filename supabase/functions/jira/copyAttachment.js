import { HttpError } from './http.js'
import {
  attachmentExtension,
  imageSize,
  isIssueKey,
  jiraGet,
  jiraGetBytes,
  normaliseAttachments,
} from './jiraApi.js'

// Feature 17 Phase 4: one Jira attachment into Axon. Everything runs with the caller's JWT, so
// the task check, the Storage upload and the attachments row all go through RLS.

const BUCKET = 'attachments'
const MAX_BYTES = 50 * 1024 * 1024 // the Supabase free plan's per-file cap (the bucket's limit)
const COLUMNS =
  'id, space_id, task_id, path, name, mime, size, width, height, source, jira_attachment_id, external_url, created_at'

const isVideo = (a) =>
  String(a.mimeType).startsWith('video/') || /\.(mp4|mov|webm|mkv|avi|m4v|wmv)$/i.test(a.filename)

async function existingRow(supabase, taskId, attachmentId) {
  const { data, error } = await supabase
    .from('attachments')
    .select(COLUMNS)
    .eq('task_id', taskId)
    .eq('jira_attachment_id', attachmentId)
    .maybeSingle()
  if (error) throw new HttpError(500, 'db', `Couldn't check the task's files: ${error.message}`)
  return data
}

/** Inserts the row; a parallel copy that won the unique index returns its row instead. */
async function insertRow(supabase, row) {
  const { data, error } = await supabase.from('attachments').insert(row).select(COLUMNS).single()
  if (!error) return { attachment: data }
  if (error.code === '23505') {
    return {
      attachment: await existingRow(supabase, row.task_id, row.jira_attachment_id),
      existing: true,
    }
  }
  throw new HttpError(500, 'db', `Couldn't save the file to Axon: ${error.message}`)
}

/**
 * `{ key, attachmentId, taskId }` → `{ attachment, existing?, skipped? }`. The task must be the
 * caller's and imported from `key`, and the attachment must be on that issue. Videos and files over
 * 50 MB aren't downloaded: they're recorded as links to Jira (`skipped: 'video' | 'too_large'`).
 */
export async function copyAttachment(supabase, { site, userId, body }) {
  const key = String(body.key ?? '')
    .trim()
    .toUpperCase()
  const attachmentId = String(body.attachmentId ?? '')
  if (!isIssueKey(key)) throw new HttpError(400, 'bad_key', `Not a Jira issue key: ${body.key}`)
  if (!/^\d+$/.test(attachmentId))
    throw new HttpError(400, 'bad_attachment', 'Not a Jira attachment id.')

  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('id, space_id, jira_key')
    .eq('id', body.taskId ?? '')
    .maybeSingle()
  if (taskError || !task) throw new HttpError(404, 'no_task', 'That task no longer exists.')
  if (task.jira_key !== key)
    throw new HttpError(400, 'wrong_task', `This task isn't imported from ${key}.`)

  const already = await existingRow(supabase, task.id, attachmentId)
  if (already) return { attachment: already, existing: true }

  const issue = await jiraGet(
    site,
    `/rest/api/3/issue/${encodeURIComponent(key)}?fields=attachment`,
  )
  const meta = normaliseAttachments(issue?.fields?.attachment).find((a) => a.id === attachmentId)
  if (!meta) throw new HttpError(404, 'jira_file_gone', `That file isn't on ${key} any more.`)

  const base = {
    space_id: task.space_id,
    task_id: task.id,
    name: meta.filename,
    mime: String(meta.mimeType).slice(0, 150),
    size: meta.size,
    source: 'jira',
    jira_attachment_id: attachmentId,
  }
  const link = `${site}/secure/attachment/${attachmentId}/${encodeURIComponent(meta.filename)}`
  if (isVideo(meta)) {
    return { ...(await insertRow(supabase, { ...base, external_url: link })), skipped: 'video' }
  }
  if (meta.size > MAX_BYTES) {
    return { ...(await insertRow(supabase, { ...base, external_url: link })), skipped: 'too_large' }
  }

  const file = await jiraGetBytes(
    site,
    `/rest/api/3/attachment/content/${attachmentId}?redirect=false`,
    {
      maxBytes: MAX_BYTES,
    },
  )
  if (file.tooLarge) {
    return { ...(await insertRow(supabase, { ...base, external_url: link })), skipped: 'too_large' }
  }

  const path = `${userId}/${task.space_id}/${crypto.randomUUID()}.${attachmentExtension(meta.filename, meta.mimeType)}`
  const contentType = meta.mimeType || file.contentType || 'application/octet-stream'
  const upload = await supabase.storage
    .from(BUCKET)
    .upload(path, file.bytes, { contentType, upsert: false })
  if (upload.error) {
    throw new HttpError(502, 'storage', `Couldn't save the file to Axon: ${upload.error.message}`)
  }

  const size = String(contentType).startsWith('image/') ? imageSize(file.bytes) : null
  try {
    const result = await insertRow(supabase, {
      ...base,
      path,
      size: file.bytes.length,
      width: size?.width ?? null,
      height: size?.height ?? null,
    })
    // Lost a race to a parallel copy: drop our duplicate object.
    if (result.existing) await supabase.storage.from(BUCKET).remove([path])
    return result
  } catch (err) {
    await supabase.storage.from(BUCKET).remove([path])
    throw err
  }
}

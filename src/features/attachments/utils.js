/** Image types the editor accepts (the bucket itself takes any type since Phase 2). */
export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

/** Editor images stay at 10 MB (the bucket allows 50 MB for attachments). */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024

const EXTENSIONS = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

/** A friendly reason the file can't be used, or `null` when it's fine. */
export function validateImageFile(file) {
  if (!file || !IMAGE_TYPES.includes(file.type)) {
    return 'Only PNG, JPEG, WebP and GIF images can be added.'
  }
  if (file.size > MAX_IMAGE_BYTES) return 'Images can be up to 10 MB.'
  return null
}

/** "png" for "image/png" (and "jpg" for JPEG). */
export function imageExtension(mime) {
  return EXTENSIONS[mime] ?? 'bin'
}

/**
 * Storage path for a new image: `{userId}/{spaceId}/{id}.{ext}`. The first segment is what the
 * owner-only storage policies check; the space folder lets a space's files go together later.
 */
export function imagePath({ userId, spaceId, id, mime }) {
  return `${userId}/${spaceId}/${id}.${imageExtension(mime)}`
}

// ── Task file attachments (Phase 2) ──────────────────────────────────────────────────────────

/** The bucket's `file_size_limit`: the Supabase free plan's 50 MB per file. */
export const MAX_FILE_BYTES = 50 * 1024 * 1024

const VIDEO_EXTENSIONS = ['mp4', 'mov', 'webm', 'mkv', 'avi', 'm4v', 'wmv']

/** "report.final.pdf" → "pdf" (lower case), or '' without one. */
export function fileExtension(name) {
  const match = /\.([a-z0-9]{1,10})$/i.exec(String(name ?? ''))
  return match ? match[1].toLowerCase() : ''
}

export function isVideoFile({ type, name }) {
  return String(type ?? '').startsWith('video/') || VIDEO_EXTENSIONS.includes(fileExtension(name))
}

/** A friendly reason a file can't be attached, or `null`. Videos wait (the user's decision). */
export function validateAttachmentFile(file) {
  if (!file) return 'No file to attach.'
  if (isVideoFile(file)) return 'Videos aren’t supported yet.'
  if (file.size === 0) return `“${file.name}” is empty.`
  if (file.size > MAX_FILE_BYTES) return 'Files can be up to 50 MB on the free plan.'
  return null
}

/** Storage path for an attachment: `{userId}/{spaceId}/{id}.{ext}` (the name's extension). */
export function attachmentPath({ userId, spaceId, id, name, mime }) {
  const ext = fileExtension(name) || (EXTENSIONS[mime] ?? 'bin')
  return `${userId}/${spaceId}/${id}.${ext}`
}

/** "0 B" · "820 KB" · "4.2 MB" · "1.1 GB" */
export function formatBytes(bytes) {
  const n = Number(bytes) || 0
  if (n < 1024) return `${n} B`
  const units = ['KB', 'MB', 'GB']
  let value = n / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  const digits = value < 10 && unit > 0 ? 1 : 0
  return `${value.toFixed(digits).replace(/\.0$/, '')} ${units[unit]}`
}

const KIND_EXTENSIONS = {
  pdf: ['pdf'],
  sheet: ['xls', 'xlsx', 'csv', 'tsv', 'ods', 'numbers'],
  doc: ['doc', 'docx', 'txt', 'md', 'rtf', 'odt', 'pages', 'ppt', 'pptx', 'key'],
  archive: ['zip', 'gz', 'tgz', 'rar', '7z', 'tar'],
  code: [
    'js',
    'jsx',
    'ts',
    'tsx',
    'json',
    'html',
    'css',
    'scss',
    'xml',
    'yml',
    'yaml',
    'log',
    'sql',
    'har',
  ],
}

/** The icon family for a file: image · pdf · sheet · doc · archive · code · other. */
export function fileKind(mime, name) {
  const type = String(mime ?? '')
  if (type.startsWith('image/')) return 'image'
  if (type === 'application/pdf') return 'pdf'
  const ext = fileExtension(name)
  for (const [kind, list] of Object.entries(KIND_EXTENSIONS)) {
    if (list.includes(ext)) return kind
  }
  if (type.startsWith('text/')) return 'doc'
  return 'other'
}

/** The image's natural size, so the editor can reserve its space before it loads. */
export async function readImageSize(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file)
      const size = { width: bitmap.width, height: bitmap.height }
      bitmap.close?.()
      return size
    } catch {
      // fall through to <img>
    }
  }
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
      URL.revokeObjectURL(url)
    }
    img.onerror = () => {
      resolve({ width: null, height: null })
      URL.revokeObjectURL(url)
    }
    img.src = url
  })
}

/** Whether a stored attachment opens in the preview lightbox (images and PDFs), not a download. */
export function isPreviewable(attachment) {
  if (!attachment?.path) return false
  const mime = String(attachment.mime ?? '')
  return (
    mime.startsWith('image/') ||
    mime === 'application/pdf' ||
    fileExtension(attachment.name) === 'pdf'
  )
}

export const isPdfAttachment = (a) =>
  String(a?.mime ?? '') === 'application/pdf' || fileExtension(a?.name) === 'pdf'

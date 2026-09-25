/** Image types the `attachments` bucket accepts (mirrors its `allowed_mime_types`). */
export const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

/** Mirrors the bucket's `file_size_limit`. */
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

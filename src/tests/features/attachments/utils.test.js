import { describe, expect, it } from 'vitest'
import {
  imageExtension,
  imagePath,
  MAX_IMAGE_BYTES,
  validateImageFile,
} from '@/features/attachments/utils'

const file = (type, size = 1000) => ({ type, size })

describe('validateImageFile', () => {
  it('accepts PNG, JPEG, WebP and GIF up to 10 MB', () => {
    for (const type of ['image/png', 'image/jpeg', 'image/webp', 'image/gif']) {
      expect(validateImageFile(file(type))).toBeNull()
    }
    expect(validateImageFile(file('image/png', MAX_IMAGE_BYTES))).toBeNull()
  })

  it('rejects other types and oversized files with a friendly message', () => {
    expect(validateImageFile(file('image/svg+xml'))).toMatch(/PNG, JPEG, WebP and GIF/)
    expect(validateImageFile(file('application/pdf'))).toMatch(/PNG/)
    expect(validateImageFile(null)).toMatch(/PNG/)
    expect(validateImageFile(file('image/png', MAX_IMAGE_BYTES + 1))).toBe(
      'Images can be up to 10 MB.',
    )
  })
})

describe('imageExtension', () => {
  it('maps the MIME type to a file extension', () => {
    expect(imageExtension('image/png')).toBe('png')
    expect(imageExtension('image/jpeg')).toBe('jpg')
    expect(imageExtension('image/webp')).toBe('webp')
    expect(imageExtension('text/plain')).toBe('bin')
  })
})

describe('imagePath', () => {
  it('puts the owner first (what the storage policies check), then the space', () => {
    expect(imagePath({ userId: 'u1', spaceId: 's1', id: 'abc', mime: 'image/gif' })).toBe(
      'u1/s1/abc.gif',
    )
  })
})

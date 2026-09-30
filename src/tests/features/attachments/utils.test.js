import { describe, expect, it } from 'vitest'
import {
  attachmentPath,
  fileExtension,
  fileKind,
  formatBytes,
  imageExtension,
  imagePath,
  isVideoFile,
  MAX_FILE_BYTES,
  MAX_IMAGE_BYTES,
  validateAttachmentFile,
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

describe('task attachments (Phase 2)', () => {
  const named = (name, type = '', size = 1000) => ({ name, type, size })

  it('refuses videos by type or extension, empty files and files over 50 MB', () => {
    expect(validateAttachmentFile(named('clip.mp4', 'video/mp4'))).toMatch(/Videos/)
    expect(validateAttachmentFile(named('screen.MOV', ''))).toMatch(/Videos/)
    expect(validateAttachmentFile(named('empty.txt', 'text/plain', 0))).toMatch(/empty/)
    expect(validateAttachmentFile(named('big.zip', 'application/zip', MAX_FILE_BYTES + 1))).toMatch(
      /50 MB/,
    )
    expect(validateAttachmentFile(named('spec.pdf', 'application/pdf', MAX_FILE_BYTES))).toBeNull()
    expect(isVideoFile(named('notes.txt', 'text/plain'))).toBe(false)
  })

  it('builds paths from the name’s extension, else the MIME type, else bin', () => {
    const base = { userId: 'u', spaceId: 's', id: 'i' }
    expect(attachmentPath({ ...base, name: 'Report.Final.PDF', mime: 'application/pdf' })).toBe(
      'u/s/i.pdf',
    )
    expect(attachmentPath({ ...base, name: 'screenshot', mime: 'image/png' })).toBe('u/s/i.png')
    expect(attachmentPath({ ...base, name: 'blob', mime: 'application/x-thing' })).toBe('u/s/i.bin')
    expect(fileExtension('archive.tar.gz')).toBe('gz')
    expect(fileExtension('README')).toBe('')
  })

  it('formats sizes', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(1023)).toBe('1023 B')
    expect(formatBytes(820 * 1024)).toBe('820 KB')
    expect(formatBytes(4.2 * 1024 * 1024)).toBe('4.2 MB')
    expect(formatBytes(1024 ** 3)).toBe('1 GB')
  })

  it('picks an icon family from the MIME type and extension', () => {
    expect(fileKind('image/png', 'a.png')).toBe('image')
    expect(fileKind('application/pdf', 'a.pdf')).toBe('pdf')
    expect(fileKind('', 'budget.xlsx')).toBe('sheet')
    expect(fileKind('application/octet-stream', 'network.har')).toBe('code')
    expect(fileKind('application/zip', 'build.zip')).toBe('archive')
    expect(fileKind('text/plain', 'notes')).toBe('doc')
    expect(fileKind('', 'mystery.bin')).toBe('other')
  })
})

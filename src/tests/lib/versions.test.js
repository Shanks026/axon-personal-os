import { describe, expect, it } from 'vitest'
import { mergeVersions, versionSchema } from '@/lib/versions'

describe('mergeVersions', () => {
  it('dedupes across lists and sorts newest-looking first', () => {
    expect(mergeVersions(['v3.9.0', 'v3.10.0'], ['v3.9.0', 'v2.0'])).toEqual([
      'v3.10.0',
      'v3.9.0',
      'v2.0',
    ])
  })

  it('ignores empty values and handles no input', () => {
    expect(mergeVersions([], [null, ''])).toEqual([])
    expect(mergeVersions()).toEqual([])
  })
})

describe('versionSchema', () => {
  it('accepts free text and rejects array-literal characters', () => {
    expect(versionSchema.safeParse(' v3.9.0 ').data).toBe('v3.9.0')
    expect(versionSchema.safeParse('a,b').success).toBe(false)
    expect(versionSchema.safeParse('').success).toBe(false)
  })
})

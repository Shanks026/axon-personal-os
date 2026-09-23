import { afterEach, describe, expect, it, vi } from 'vitest'

describe('supabase client', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('throws a readable error when env vars are missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '')
    await expect(import('@/lib/supabase')).rejects.toThrow(/VITE_SUPABASE_URL/)
  })

  it('creates a client when configured', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test')
    const { supabase } = await import('@/lib/supabase')
    expect(supabase.auth).toBeDefined()
  })
})

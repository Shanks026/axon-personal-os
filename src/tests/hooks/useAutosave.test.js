import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAutosave } from '@/hooks/useAutosave'

// Lets the save chain (promise microtasks) settle under fake timers.
const settle = () => act(async () => {})

describe('useAutosave', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('debounces edits and saves once after the delay', async () => {
    const save = vi.fn().mockResolvedValue()
    const { result } = renderHook(() => useAutosave({ save, delay: 800 }))

    act(() => result.current.schedule({ title: 'a' }))
    act(() => vi.advanceTimersByTime(500))
    act(() => result.current.schedule({ title: 'ab' }))
    act(() => vi.advanceTimersByTime(799))
    expect(save).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(1))
    await settle()
    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith({ title: 'ab' })
    expect(result.current.status).toBe('saved')
  })

  it('merges pending patches, last write per key winning', async () => {
    const save = vi.fn().mockResolvedValue()
    const { result } = renderHook(() => useAutosave({ save, delay: 800 }))

    act(() => {
      result.current.schedule({ title: 'one', content: 1 })
      result.current.schedule({ content: 2 })
      result.current.schedule({ title: 'two' })
    })
    act(() => vi.advanceTimersByTime(800))
    await settle()
    expect(save).toHaveBeenCalledWith({ title: 'two', content: 2 })
  })

  it('flush saves straight away and flushes on unmount', async () => {
    const save = vi.fn().mockResolvedValue()
    const { result, unmount } = renderHook(() => useAutosave({ save, delay: 800 }))

    act(() => result.current.schedule({ title: 'now' }))
    await act(() => result.current.flush())
    expect(save).toHaveBeenCalledWith({ title: 'now' })

    act(() => result.current.schedule({ title: 'leaving' }))
    unmount()
    await settle()
    expect(save).toHaveBeenLastCalledWith({ title: 'leaving' })
    expect(save).toHaveBeenCalledTimes(2)
  })

  it('keeps a failed patch and retries it with the next edit', async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue()
    const { result } = renderHook(() => useAutosave({ save, delay: 800 }))

    act(() => result.current.schedule({ title: 'x', content: 1 }))
    act(() => vi.advanceTimersByTime(800))
    await settle()
    expect(result.current.status).toBe('error')

    act(() => result.current.schedule({ content: 2 }))
    act(() => vi.advanceTimersByTime(800))
    await settle()
    expect(save).toHaveBeenLastCalledWith({ title: 'x', content: 2 })
    expect(result.current.status).toBe('saved')
  })

  it('flushes on beforeunload', async () => {
    const save = vi.fn().mockResolvedValue()
    const { result } = renderHook(() => useAutosave({ save, delay: 800 }))

    act(() => result.current.schedule({ title: 'tab closing' }))
    act(() => {
      window.dispatchEvent(new Event('beforeunload'))
    })
    await settle()
    expect(save).toHaveBeenCalledWith({ title: 'tab closing' })
  })
})

import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useInboxSelection } from '@/features/inbox/hooks/useInboxSelection'

const ids = ['a', 'b', 'c', 'd', 'e']

describe('useInboxSelection', () => {
  it('toggles single rows', () => {
    const { result } = renderHook(() => useInboxSelection(ids))
    act(() => result.current.toggle('b'))
    act(() => result.current.toggle('d'))
    expect([...result.current.selectedIds]).toEqual(['b', 'd'])
    act(() => result.current.toggle('b'))
    expect([...result.current.selectedIds]).toEqual(['d'])
    expect(result.current.count).toBe(1)
  })

  it('selects a range from the last toggled row, either direction', () => {
    const { result } = renderHook(() => useInboxSelection(ids))
    act(() => result.current.toggle('b'))
    act(() => result.current.toggleRange('d'))
    expect([...result.current.selectedIds]).toEqual(['b', 'c', 'd'])
    act(() => result.current.clear())
    act(() => result.current.toggle('e'))
    act(() => result.current.toggleRange('c'))
    expect([...result.current.selectedIds]).toEqual(['c', 'd', 'e'])
  })

  it('a range with no anchor toggles just that row; clear empties everything', () => {
    const { result } = renderHook(() => useInboxSelection(ids))
    act(() => result.current.toggleRange('c'))
    expect([...result.current.selectedIds]).toEqual(['c'])
    act(() => result.current.clear())
    expect(result.current.count).toBe(0)
  })

  it('drops ids that leave the list', () => {
    let current = ids
    const { result, rerender } = renderHook(() => useInboxSelection(current))
    act(() => result.current.toggle('a'))
    act(() => result.current.toggle('c'))
    current = ['b', 'c']
    rerender()
    expect([...result.current.selectedIds]).toEqual(['c'])
  })
})

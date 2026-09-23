import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { paths } from '@/lib/paths'
import { sectionFromPath } from '@/features/spaces/utils'

/**
 * Navigate to another space while staying in the same section (Tasks in THMP → Tasks in
 * Personal). Detail routes (tasks/:id) fall back to their list. Recording the last space
 * happens in SpaceBoundary, so every way of entering a space is covered.
 */
export function useSwitchSpace() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  return useCallback(
    (slug) => navigate(`${paths.space(slug).root()}/${sectionFromPath(pathname)}`),
    [navigate, pathname],
  )
}

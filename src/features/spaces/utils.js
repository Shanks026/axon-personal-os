import { GLOBAL_SLUG } from '@/lib/paths'
import { positionBetween } from '@/lib/position'

export const SLUG_MAX = 48
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

/** "THMP Marketplace!" → "thmp-marketplace". Never returns the reserved "global". */
export function slugify(name) {
  const base = (name ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, '')
  if (!base) return 'space'
  return base === GLOBAL_SLUG ? `${GLOBAL_SLUG}-1` : base
}

/** Appends -2, -3… until the slug is free (and never "global"). */
export function uniqueSlug(base, existingSlugs) {
  const taken = new Set([GLOBAL_SLUG, ...existingSlugs])
  if (!taken.has(base)) return base
  for (let n = 2; ; n++) {
    const suffix = `-${n}`
    const candidate = `${base.slice(0, SLUG_MAX - suffix.length).replace(/-+$/g, '')}${suffix}`
    if (!taken.has(candidate)) return candidate
  }
}

/** Active spaces in display order, and archived ones (most recently archived first). */
export function splitSpaces(spaces = []) {
  const active = spaces.filter((s) => !s.archived_at)
  const archived = spaces
    .filter((s) => s.archived_at)
    .sort((a, b) => b.archived_at.localeCompare(a.archived_at))
  return { active, archived }
}

/**
 * New fractional position for `activeId` after dropping it onto `overId`, or null when nothing
 * moved. Only the dragged card's position changes.
 */
export function reorderPosition(spaces, activeId, overId) {
  if (!overId || activeId === overId) return null
  const from = spaces.findIndex((s) => s.id === activeId)
  const to = spaces.findIndex((s) => s.id === overId)
  if (from < 0 || to < 0) return null
  const next = [...spaces]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return positionBetween(next[to - 1]?.position ?? null, next[to + 1]?.position ?? null)
}

const SECTIONS = ['dashboard', 'inbox', 'tasks', 'todos', 'notes', 'journal', 'calendar', 'reports', 'trash']

/** The section segment of an app-shell path ("/s/thmp/tasks/123" → "tasks"); defaults to dashboard. */
export function sectionFromPath(pathname) {
  const segment = pathname.split('/')[3]
  return SECTIONS.includes(segment) ? segment : 'dashboard'
}

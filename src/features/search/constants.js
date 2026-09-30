/** Result groups in display order. */
export const RESULT_GROUPS = [
  { type: 'task', label: 'Tasks' },
  { type: 'note', label: 'Notes' },
  { type: 'journal', label: 'Journal' },
  { type: 'todo', label: 'Todos' },
  { type: 'event', label: 'Events' },
  { type: 'report', label: 'Reports' },
]

/** The Tab type filter, All first (the design delta, 2026-09-30). */
export const TYPE_FILTERS = [{ type: null, label: 'All' }, ...RESULT_GROUPS]

/** Queries shorter than this search the static items only (the RPC ignores them too). */
export const MIN_QUERY = 2

// Todo group order and visuals (Todos.dc.html): coloured by urgency.
export const TODO_GROUPS = [
  { key: 'overdue', label: 'Overdue', tone: 'var(--destructive)' },
  { key: 'today', label: 'Today', tone: 'var(--foreground)', emptyHint: 'Nothing due today' },
  { key: 'upcoming', label: 'Upcoming', tone: 'var(--muted-foreground)' },
  { key: 'someday', label: 'Someday', tone: 'var(--muted-foreground)' },
  { key: 'done', label: 'Done', tone: 'var(--ok)' },
]

/** Done todos older than this are left out of the list (windowed, like tasks). */
export const DONE_WINDOW_DAYS = 7

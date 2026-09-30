// Every keyboard shortcut in Axon (Feature 12 Phase 2), defined once: the bindings, the help
// dialog, tooltips and the palette's hints all read this list, so they can't drift apart.
//
// { id, keys, label, group, scope, display?, allowInInputs? }
// - keys: react-hotkeys-hook syntax. Alternatives are comma-separated ('j, down'); sequences
//   use '>' ('g>d'). Keys match physical codes: 'slash', 'backslash', digits.
// - scope: 'global' is always on. Page scopes ('list', 'calendar', …) are on while their page is
//   mounted (`useShortcutScope`); a global shortcut is off while an active page scope uses the
//   same key (the list's `e` edits instead of creating an event).
// - display: how the help and hints show the keys, when it differs from `keys`.
// - allowInInputs: also fires while typing (inputs and the rich editor).

export const SHORTCUT_GROUPS = [
  'General',
  'Create',
  'Navigate',
  'Lists',
  'Calendar',
  'Journal',
  'Task page',
  'Editor',
]

const go = (letter, section, label) => ({
  id: `go.${section}`,
  keys: `g>${letter}`,
  label: `Go to ${label}`,
  group: 'Navigate',
  scope: 'global',
  section,
})

export const SHORTCUTS = [
  // General
  {
    id: 'palette.open',
    keys: 'mod+k',
    label: 'Search and commands',
    group: 'General',
    scope: 'global',
    allowInInputs: true,
  },
  {
    id: 'space.switch',
    keys: 'mod+shift+s',
    label: 'Switch space',
    group: 'General',
    scope: 'global',
    allowInInputs: true,
  },
  {
    id: 'space.byNumber',
    keys: 'alt+0, alt+1, alt+2, alt+3, alt+4, alt+5, alt+6, alt+7, alt+8, alt+9',
    display: 'alt+0–9',
    label: 'Go to space 1–9 (0: Global)',
    group: 'General',
    scope: 'global',
  },
  {
    id: 'sidebar.toggle',
    keys: 'mod+backslash',
    display: 'mod+\\',
    label: 'Toggle sidebar',
    group: 'General',
    scope: 'global',
  },
  {
    id: 'theme.toggle',
    keys: 'mod+shift+l',
    label: 'Toggle light / dark',
    group: 'General',
    scope: 'global',
  },
  {
    id: 'capture.open',
    keys: 'mod+j',
    label: 'Quick capture',
    group: 'General',
    scope: 'global',
    allowInInputs: true,
  },
  {
    id: 'help.open',
    keys: 'shift+slash',
    display: '?',
    label: 'Keyboard shortcuts',
    group: 'General',
    scope: 'global',
  },

  // Create
  { id: 'create.task', keys: 'c', label: 'New task', group: 'Create', scope: 'global' },
  { id: 'create.todo', keys: 'shift+c', label: 'New todo', group: 'Create', scope: 'global' },
  { id: 'create.note', keys: 'n', label: 'New note', group: 'Create', scope: 'global' },
  { id: 'create.event', keys: 'e', label: 'New event', group: 'Create', scope: 'global' },

  // Navigate (g, then a letter, within a second)
  go('d', 'dashboard', 'Dashboard'),
  go('i', 'inbox', 'Inbox'),
  go('t', 'tasks', 'Tasks'),
  go('o', 'todos', 'Todos'),
  go('n', 'notes', 'Notes'),
  go('j', 'journal', 'Journal'),
  go('c', 'calendar', 'Calendar'),
  go('r', 'reports', 'Reports'),

  // Lists (the Tasks table and the Todos page): j / k move while the list is on screen (`listNav`);
  // the rest act on the selected row (`list`, on only while a row is selected).
  {
    id: 'list.next',
    keys: 'j, down',
    display: 'j',
    label: 'Next item',
    group: 'Lists',
    scope: 'listNav',
  },
  {
    id: 'list.prev',
    keys: 'k, up',
    display: 'k',
    label: 'Previous item',
    group: 'Lists',
    scope: 'listNav',
  },
  { id: 'list.open', keys: 'enter', label: 'Open', group: 'Lists', scope: 'list' },
  { id: 'list.toggle', keys: 'x', label: 'Toggle done', group: 'Lists', scope: 'list' },
  { id: 'list.edit', keys: 'e', label: 'Edit', group: 'Lists', scope: 'list' },
  { id: 'list.status', keys: 's', label: 'Set status', group: 'Lists', scope: 'list' },
  { id: 'list.priority', keys: 'p', label: 'Set priority', group: 'Lists', scope: 'list' },
  {
    id: 'list.delete',
    keys: 'backspace, delete',
    display: 'backspace',
    label: 'Move to Trash',
    group: 'Lists',
    scope: 'list',
  },
  {
    id: 'list.clear',
    keys: 'escape',
    display: 'esc',
    label: 'Clear selection',
    group: 'Lists',
    scope: 'list',
  },

  // Calendar
  { id: 'calendar.today', keys: 't', label: 'Today', group: 'Calendar', scope: 'calendar' },
  { id: 'calendar.prev', keys: 'left', label: 'Previous', group: 'Calendar', scope: 'calendar' },
  { id: 'calendar.next', keys: 'right', label: 'Next', group: 'Calendar', scope: 'calendar' },
  { id: 'calendar.month', keys: 'm', label: 'Month view', group: 'Calendar', scope: 'calendar' },
  { id: 'calendar.week', keys: 'w', label: 'Week view', group: 'Calendar', scope: 'calendar' },
  { id: 'calendar.day', keys: 'd', label: 'Day view', group: 'Calendar', scope: 'calendar' },
  { id: 'calendar.agenda', keys: 'a', label: 'Agenda view', group: 'Calendar', scope: 'calendar' },
  { id: 'calendar.create', keys: 'n', label: 'New event', group: 'Calendar', scope: 'calendar' },

  // Journal
  {
    id: 'journal.prev',
    keys: 'alt+left',
    label: 'Previous day',
    group: 'Journal',
    scope: 'journal',
  },
  { id: 'journal.next', keys: 'alt+right', label: 'Next day', group: 'Journal', scope: 'journal' },

  // Task page
  { id: 'task.next', keys: 'j', label: 'Next task', group: 'Task page', scope: 'task' },
  { id: 'task.prev', keys: 'k', label: 'Previous task', group: 'Task page', scope: 'task' },

  // Editor (notes and reports) and Settings
  {
    id: 'editor.save',
    keys: 'mod+s',
    label: 'Save now',
    group: 'Editor',
    scope: 'editor',
    allowInInputs: true,
  },
  {
    id: 'settings.back',
    keys: 'escape',
    display: 'esc',
    label: 'Leave Settings',
    group: 'General',
    scope: 'settings',
    hidden: true,
  },
]

const byId = new Map(SHORTCUTS.map((s) => [s.id, s]))

/** The registry entry for `id`; an unknown id throws (a typo should fail loudly in dev). */
export function shortcutById(id) {
  const entry = byId.get(id)
  if (!entry) throw new Error(`Unknown shortcut: ${id}`)
  return entry
}

/** The individual key combinations of an entry ('j, down' → ['j', 'down']). */
export function shortcutKeyList(entry) {
  return entry.keys.split(',').map((k) => k.trim().toLowerCase())
}

/** Whether a global entry is overridden by an entry of an active page scope using the same key. */
export function isOverridden(entry, activeScopes) {
  if (entry.scope !== 'global') return false
  const keys = new Set(shortcutKeyList(entry))
  return SHORTCUTS.some(
    (s) =>
      s.scope !== 'global' &&
      activeScopes.includes(s.scope) &&
      shortcutKeyList(s).some((k) => keys.has(k)),
  )
}

/** The help dialog's groups, in order: `[{ group, items }]`, hidden entries left out. */
export function shortcutsByGroup() {
  return SHORTCUT_GROUPS.map((group) => ({
    group,
    items: SHORTCUTS.filter((s) => s.group === group && !s.hidden),
  })).filter((g) => g.items.length)
}

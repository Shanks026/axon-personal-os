export const CALENDAR_VIEWS = [
  { value: 'month', label: 'Month', hotkey: 'm' },
  { value: 'week', label: 'Week', hotkey: 'w' },
  { value: 'day', label: 'Day', hotkey: 'd' },
  { value: 'agenda', label: 'Agenda', hotkey: 'a' },
]
export const DEFAULT_VIEW = 'month'
/** Views the page can show (an option can be `disabled` while it is being built). */
export const ENABLED_VIEWS = CALENDAR_VIEWS.filter((v) => !v.disabled).map((v) => v.value)

export const MAX_CHIPS_PER_DAY = 3
export const DEFAULT_EVENT_MINUTES = 60
export const DEFAULT_START_TIME = '09:00'
export const AGENDA_DAYS = 30

/** Per-device layer toggles (tasks / todos with a due date). */
export const LAYERS_STORAGE_KEY = 'axon:calendar:layers'
export const DEFAULT_LAYERS = { tasks: true, todos: true }

/** Week/Day grid: pixels per hour (design: 56px rows), so 15 minutes = 14px. */
export const HOUR_HEIGHT = 56
export const SNAP_MINUTES = 15
export const MIN_EVENT_MINUTES = 15
/** The hour the Week/Day grid opens scrolled to. */
export const SCROLL_TO_HOUR = 8

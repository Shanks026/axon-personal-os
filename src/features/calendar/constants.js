export const CALENDAR_VIEWS = [
  { value: 'month', label: 'Month', hotkey: 'm' },
  { value: 'week', label: 'Week', hotkey: 'w', disabled: true }, // Phase 2
  { value: 'day', label: 'Day', hotkey: 'd', disabled: true }, // Phase 2
  { value: 'agenda', label: 'Agenda', hotkey: 'a' },
]
export const DEFAULT_VIEW = 'month'
/** Views the page can show right now (Week and Day arrive in Phase 2). */
export const ENABLED_VIEWS = CALENDAR_VIEWS.filter((v) => !v.disabled).map((v) => v.value)

export const MAX_CHIPS_PER_DAY = 3
export const DEFAULT_EVENT_MINUTES = 60
export const DEFAULT_START_TIME = '09:00'
export const AGENDA_DAYS = 30

/** Per-device layer toggles (tasks / todos with a due date). */
export const LAYERS_STORAGE_KEY = 'axon:calendar:layers'
export const DEFAULT_LAYERS = { tasks: true, todos: true }

/**
 * Models Axon may call (the Edge Function enforces the same allowlist). Prices are USD per
 * million tokens, input / output, for the hints in the pickers.
 */
export const AI_MODELS = [
  { id: 'claude-sonnet-5', label: 'Sonnet 5', hint: 'Fast, everyday · $2 / $10' },
  { id: 'claude-opus-5-5', label: 'Opus 5.5', hint: 'Best writing and reasoning · $4 / $20' },
  { id: 'claude-haiku-4-5', label: 'Haiku 4.5', hint: 'Cheapest · $1 / $5' },
]

export const AI_MODEL_MAP = Object.fromEntries(AI_MODELS.map((m) => [m.id, m]))

/** Jobs with a default model in Settings. Later phases add checklist, reports and chat. */
export const AI_JOBS = [
  {
    id: 'draft_tasks',
    label: 'Task drafting',
    description: 'Describe with AI in the new-task dialog.',
  },
]

export const DEFAULT_MODELS = {
  draft_tasks: 'claude-sonnet-5',
  checklist: 'claude-sonnet-5',
  report_weekly: 'claude-sonnet-5',
  report_quarterly: 'claude-opus-5-5',
  chat: 'claude-sonnet-5',
}

/** The Edge Function's limit on a description. */
export const AI_MAX_INPUT = 8000

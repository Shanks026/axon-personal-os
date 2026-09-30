/**
 * Models Axon may call (the Edge Function enforces the same allowlist). A model is usable once its
 * provider's key is set; the function's `status` says which. Gemini runs on the free tier for now;
 * Claude stays listed, disabled until an Anthropic key is added (the user's decision, 2026-09-28:
 * the card payment failed). Prices are USD per million tokens, input / output.
 */
export const AI_MODELS = [
  { id: 'gemini-3.8-flash', provider: 'gemini', label: 'Gemini 3.8 Flash', hint: 'Free tier' },
  {
    id: 'gemini-3.5-flash-lite',
    provider: 'gemini',
    label: 'Gemini 3.5 Flash-Lite',
    hint: 'Free tier · fastest',
  },
  {
    id: 'claude-sonnet-5',
    provider: 'anthropic',
    label: 'Claude Sonnet 5',
    hint: 'Fast, everyday · $2 / $10',
  },
  {
    id: 'claude-opus-5-5',
    provider: 'anthropic',
    label: 'Claude Opus 5.5',
    hint: 'Best writing and reasoning · $4 / $20',
  },
  {
    id: 'claude-haiku-4-5',
    provider: 'anthropic',
    label: 'Claude Haiku 4.5',
    hint: 'Cheapest Claude · $1 / $5',
  },
]

export const AI_MODEL_MAP = Object.fromEntries(AI_MODELS.map((m) => [m.id, m]))

export const AI_PROVIDERS = {
  gemini: { label: 'Google Gemini', secret: 'GEMINI_API_KEY' },
  anthropic: { label: 'Anthropic Claude', secret: 'ANTHROPIC_API_KEY' },
}

/** Jobs with a default model in Settings. Chat joins in Phase 6. */
export const AI_JOBS = [
  {
    id: 'draft_tasks',
    label: 'Task drafting',
    description: 'Describe with AI in the new-task dialog, and Suggest tags.',
  },
  {
    id: 'checklist',
    label: 'Checklists',
    description: 'Generate a checklist from a task (and its Jira ticket and comments).',
  },
  {
    id: 'report_weekly',
    label: 'Weekly reports',
    description: 'Reports for a week, or a custom range up to two weeks.',
  },
  {
    id: 'report_quarterly',
    label: 'Quarterly reports',
    description: 'Reports for a fiscal quarter, or a longer custom range.',
  },
]

export const DEFAULT_MODELS = {
  draft_tasks: 'gemini-3.8-flash',
  suggest_tags: 'gemini-3.8-flash',
  checklist: 'gemini-3.8-flash',
  report_weekly: 'gemini-3.8-flash',
  report_quarterly: 'gemini-3.8-flash',
  chat: 'gemini-3.8-flash',
}

/** The Edge Function's limit on a description. */
export const AI_MAX_INPUT = 8000

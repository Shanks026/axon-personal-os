/**
 * Jira status names → Axon statuses (matched case-insensitively). Settings can override any of
 * these per status; an unknown name falls back on its Jira category (`CATEGORY_STATUS`).
 */
export const DEFAULT_STATUS_MAP = {
  'to do': 'todo',
  open: 'todo',
  backlog: 'todo',
  selected: 'todo',
  'selected for development': 'todo',
  'in progress': 'in_progress',
  'in development': 'in_progress',
  'in review': 'in_review',
  'code review': 'in_review',
  review: 'in_review',
  qa: 'in_review',
  'in qa': 'in_review',
  testing: 'in_review',
  blocked: 'blocked',
  'on hold': 'on_hold',
  done: 'done',
  closed: 'done',
  resolved: 'done',
  cancelled: 'cancelled',
  canceled: 'cancelled',
  "won't do": 'cancelled',
  'won’t do': 'cancelled',
}

/** Jira's status categories (`statusCategory.key`) → Axon statuses. */
export const CATEGORY_STATUS = { new: 'todo', indeterminate: 'in_progress', done: 'done' }

/** Jira priority names → Axon priorities (case-insensitive); unknown names become `medium`. */
export const DEFAULT_PRIORITY_MAP = {
  highest: 'urgent',
  blocker: 'urgent',
  critical: 'urgent',
  high: 'high',
  major: 'high',
  medium: 'medium',
  low: 'low',
  lowest: 'low',
  minor: 'low',
  trivial: 'low',
}

export const JIRA_SITE_PLACEHOLDER = 'https://your-company.atlassian.net'

/**
 * Extra keywords for common tag names (lowercase), used while a tag has no keywords of its own
 * in Settings. A tag's own name always counts too.
 */
export const DEFAULT_TAG_SYNONYMS = {
  bug: ['defect'],
  improvement: ['enhancement', 'suggestion', 'suggested'],
  'all portals': ['all the portals', 'across all portals'],
}

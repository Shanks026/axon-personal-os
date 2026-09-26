export const JOURNAL_SECTIONS = ['Yesterday', 'Today', 'Blockers', 'Notes']

export const JOURNAL_AUTOSAVE_DELAY = 800

/** Days shown in the date strip (design: a fixed two-week grid). */
export const JOURNAL_STRIP_DAYS = 14

/** Section headings styled by text in the editor (`features.headingTones`). */
export const JOURNAL_HEADING_TONES = { Blockers: 'destructive' }

const heading = (text) => ({
  type: 'heading',
  attrs: { level: 2 },
  content: [{ type: 'text', text }],
})
const emptyBulletList = {
  type: 'bulletList',
  content: [{ type: 'listItem', content: [{ type: 'paragraph' }] }],
}

/**
 * The standup template a new day opens with: a level-2 heading per section, each followed by an
 * empty bullet, except "Notes", which gets a plain paragraph. Nothing is saved until the first edit.
 */
export const JOURNAL_TEMPLATE = {
  type: 'doc',
  content: JOURNAL_SECTIONS.flatMap((title) => [
    heading(title),
    title === 'Notes' ? { type: 'paragraph' } : emptyBulletList,
  ]),
}

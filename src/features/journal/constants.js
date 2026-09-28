// Each day's entry stands alone: to look back, change the date (the user's decision, 2026-09-26).
export const JOURNAL_SECTIONS = ['Today', 'Blockers', 'Notes']

export const JOURNAL_AUTOSAVE_DELAY = 800

/**
 * Weeks the date strip spans on each side of the selected day's week (a carousel, two weeks on
 * screen). Further away, the mini month jumps and the strip re-centres.
 */
export const JOURNAL_STRIP_WEEKS = 26

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

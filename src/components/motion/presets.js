// The only place motion values live (design-system.md → Motion). CSS mirrors these as --dur-* / --ease-*.

export const durations = { instant: 0.08, fast: 0.12, base: 0.2, slow: 0.32 }

export const easings = {
  standard: [0.2, 0, 0, 1],
  enter: [0.16, 1, 0.3, 1],
  exit: [0.4, 0, 1, 1],
}

export const springs = {
  snappy: { type: 'spring', stiffness: 520, damping: 38, mass: 0.9 },
  gentle: { type: 'spring', stiffness: 260, damping: 30, mass: 1 },
}

const enter = (duration = durations.base) => ({ duration, ease: easings.enter })
const exit = (duration = durations.fast) => ({ duration, ease: easings.exit })

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: enter() },
  exit: { opacity: 0, transition: exit() },
}

export const slideUp = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: enter() },
  exit: { opacity: 0, transition: exit() },
}

/**
 * Page enter: a quick opacity fade only. Moving the page (a y-rise) or keeping the old page for
 * an exit made the scroll area briefly overflow, so the shell just fades the new page in.
 */
export const pageTransition = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: enter(durations.fast) },
}

/** List item: fade and 4px rise in, fade and height collapse out. Pair with `layout` for reorder. */
export const listItem = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0, transition: enter(0.16) },
  exit: { opacity: 0, height: 0, transition: { ...springs.gentle, opacity: exit() } },
}

/** Dialog panel: scale .96 → 1, y 8 → 0 on the snappy spring. */
export const scaleIn = {
  initial: { opacity: 0, scale: 0.96, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0, transition: springs.snappy },
  exit: { opacity: 0, scale: 0.98, transition: exit() },
}

/** Indeterminate progress sweep (splash bar). */
export const progressSweep = {
  initial: { x: '-100%' },
  animate: {
    x: '250%',
    transition: { duration: durations.slow * 4, ease: easings.standard, repeat: Infinity },
  },
}

/** Command palette: pops, never slides. */
export const popIn = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1, transition: enter(durations.fast) },
  exit: { opacity: 0, transition: exit(0.08) },
}

/**
 * Item variants for a staggered entrance: pass the index as `custom={i}`.
 * Only the first `max` items are delayed, so long lists don't crawl in.
 */
export function staggerItem(stagger = 0.02, { max = 8 } = {}) {
  return {
    initial: { opacity: 0, y: 4 },
    animate: (i = 0) => ({
      opacity: 1,
      y: 0,
      transition: { ...enter(0.16), delay: Math.min(i, max - 1) * stagger },
    }),
    exit: { opacity: 0, transition: exit() },
  }
}

/** One-shot background pulse for a `?highlight=<id>` target (search results, inbox triage). */
export const flashPulse = {
  initial: { opacity: 0 },
  animate: {
    opacity: [0, 0.4, 0],
    transition: { duration: durations.slow * 2, times: [0, 0.3, 1], ease: easings.standard },
  },
}

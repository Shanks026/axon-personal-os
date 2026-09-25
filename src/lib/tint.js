export const HUE_KEYS = [
  'slate',
  'blue',
  'indigo',
  'violet',
  'pink',
  'red',
  'orange',
  'amber',
  'green',
  'teal',
]

// Badges and pills (status, priority, tags) use plain Tailwind colour-scale classes directly —
// the user's request, 2026-09-25 — instead of the CSS-variable tint recipe below, which stays in
// place for the space accent (one colour driving many elements: nav, rings, buttons), not just a
// single badge. The class strings must stay fully literal (not built with a template string), or
// Tailwind's build-time scanner won't find them and generates no CSS for them at all.
export const BADGE_CLASSES = {
  slate: 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
  violet: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  pink: 'bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300',
  red: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  green: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300',
  teal: 'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300',
}

/** Text-only tone (dense row icons: status/priority icons tint via `currentColor`). */
export const TEXT_CLASSES = {
  slate: 'text-slate-600 dark:text-slate-300',
  blue: 'text-blue-600 dark:text-blue-400',
  indigo: 'text-indigo-600 dark:text-indigo-400',
  violet: 'text-violet-600 dark:text-violet-400',
  pink: 'text-pink-600 dark:text-pink-400',
  red: 'text-red-600 dark:text-red-400',
  orange: 'text-orange-600 dark:text-orange-400',
  amber: 'text-amber-600 dark:text-amber-400',
  green: 'text-green-600 dark:text-green-400',
  teal: 'text-teal-600 dark:text-teal-400',
}

/** Solid fill (a priority/tag colour dot). */
export const DOT_CLASSES = {
  slate: 'bg-slate-400 dark:bg-slate-500',
  blue: 'bg-blue-500',
  indigo: 'bg-indigo-500',
  violet: 'bg-violet-500',
  pink: 'bg-pink-500',
  red: 'bg-red-500',
  orange: 'bg-orange-500',
  amber: 'bg-amber-500',
  green: 'bg-green-500',
  teal: 'bg-teal-500',
}

/** A selection ring in the same colour (colour swatch pickers). */
export const RING_CLASSES = {
  slate: 'ring-slate-400',
  blue: 'ring-blue-500',
  indigo: 'ring-indigo-500',
  violet: 'ring-violet-500',
  pink: 'ring-pink-500',
  red: 'ring-red-500',
  orange: 'ring-orange-500',
  amber: 'ring-amber-500',
  green: 'ring-green-500',
  teal: 'ring-teal-500',
}

/** Falls back to slate for an unrecognised key, same as `hueVar`. */
export const badgeClasses = (key) => BADGE_CLASSES[key] ?? BADGE_CLASSES.slate
export const textClasses = (key) => TEXT_CLASSES[key] ?? TEXT_CLASSES.slate
export const dotClasses = (key) => DOT_CLASSES[key] ?? DOT_CLASSES.slate
export const ringClasses = (key) => RING_CLASSES[key] ?? RING_CLASSES.slate

/**
 * Inline style for the `tint` utility: a 14% fill with 72% hue text in both themes.
 * @param {string} key hue key (spaces.color / tags.color) or a CSS colour var like 'var(--warn)'
 */
export function tintStyle(key) {
  const value = HUE_KEYS.includes(key) ? `var(--hue-${key})` : key
  return { '--tint': value ?? 'var(--hue-slate)' }
}

/** CSS colour value for a hue key, for dots, borders and charts. */
export function hueVar(key) {
  return HUE_KEYS.includes(key) ? `var(--hue-${key})` : 'var(--hue-slate)'
}

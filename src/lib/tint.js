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
/**
 * Every Tailwind v4.3 colour palette, chromatic first, then the neutrals. Tags can use any of
 * them (the user's request, 2026-09-25); status and priority use a few. Spaces keep HUE_KEYS.
 */
export const TAILWIND_COLORS = [
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
  'slate',
  'gray',
  'zinc',
  'neutral',
  'stone',
  'mauve',
  'olive',
  'mist',
  'taupe',
]

/** Badge/pill fill + text: 100 / 700 in light, a 15% 500 wash / 300 in dark. */
export const BADGE_CLASSES = {
  red: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  yellow: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-300',
  lime: 'bg-lime-100 text-lime-700 dark:bg-lime-500/15 dark:text-lime-300',
  green: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300',
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  teal: 'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300',
  cyan: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300',
  sky: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300',
  violet: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300',
  fuchsia: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/15 dark:text-fuchsia-300',
  pink: 'bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300',
  rose: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  slate: 'bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300',
  gray: 'bg-gray-100 text-gray-700 dark:bg-gray-500/15 dark:text-gray-300',
  zinc: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-500/15 dark:text-zinc-300',
  neutral: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-500/15 dark:text-neutral-300',
  stone: 'bg-stone-100 text-stone-700 dark:bg-stone-500/15 dark:text-stone-300',
  mauve: 'bg-mauve-100 text-mauve-700 dark:bg-mauve-500/15 dark:text-mauve-300',
  olive: 'bg-olive-100 text-olive-700 dark:bg-olive-500/15 dark:text-olive-300',
  mist: 'bg-mist-100 text-mist-700 dark:bg-mist-500/15 dark:text-mist-300',
  taupe: 'bg-taupe-100 text-taupe-700 dark:bg-taupe-500/15 dark:text-taupe-300',
}

/** Text-only tone (dense row icons: status/priority icons tint via `currentColor`). */
export const TEXT_CLASSES = {
  red: 'text-red-600 dark:text-red-400',
  orange: 'text-orange-600 dark:text-orange-400',
  amber: 'text-amber-600 dark:text-amber-400',
  yellow: 'text-yellow-600 dark:text-yellow-400',
  lime: 'text-lime-600 dark:text-lime-400',
  green: 'text-green-600 dark:text-green-400',
  emerald: 'text-emerald-600 dark:text-emerald-400',
  teal: 'text-teal-600 dark:text-teal-400',
  cyan: 'text-cyan-600 dark:text-cyan-400',
  sky: 'text-sky-600 dark:text-sky-400',
  blue: 'text-blue-600 dark:text-blue-400',
  indigo: 'text-indigo-600 dark:text-indigo-400',
  violet: 'text-violet-600 dark:text-violet-400',
  purple: 'text-purple-600 dark:text-purple-400',
  fuchsia: 'text-fuchsia-600 dark:text-fuchsia-400',
  pink: 'text-pink-600 dark:text-pink-400',
  rose: 'text-rose-600 dark:text-rose-400',
  slate: 'text-slate-600 dark:text-slate-300',
  gray: 'text-gray-600 dark:text-gray-300',
  zinc: 'text-zinc-600 dark:text-zinc-300',
  neutral: 'text-neutral-600 dark:text-neutral-300',
  stone: 'text-stone-600 dark:text-stone-300',
  mauve: 'text-mauve-600 dark:text-mauve-300',
  olive: 'text-olive-600 dark:text-olive-300',
  mist: 'text-mist-600 dark:text-mist-300',
  taupe: 'text-taupe-600 dark:text-taupe-300',
}

/** Solid fill (a priority/tag colour dot). Neutrals sit a step lighter so they read as grey. */
export const DOT_CLASSES = {
  red: 'bg-red-500',
  orange: 'bg-orange-500',
  amber: 'bg-amber-500',
  yellow: 'bg-yellow-500',
  lime: 'bg-lime-500',
  green: 'bg-green-500',
  emerald: 'bg-emerald-500',
  teal: 'bg-teal-500',
  cyan: 'bg-cyan-500',
  sky: 'bg-sky-500',
  blue: 'bg-blue-500',
  indigo: 'bg-indigo-500',
  violet: 'bg-violet-500',
  purple: 'bg-purple-500',
  fuchsia: 'bg-fuchsia-500',
  pink: 'bg-pink-500',
  rose: 'bg-rose-500',
  slate: 'bg-slate-400 dark:bg-slate-500',
  gray: 'bg-gray-400 dark:bg-gray-500',
  zinc: 'bg-zinc-400 dark:bg-zinc-500',
  neutral: 'bg-neutral-400 dark:bg-neutral-500',
  stone: 'bg-stone-400 dark:bg-stone-500',
  mauve: 'bg-mauve-400 dark:bg-mauve-500',
  olive: 'bg-olive-400 dark:bg-olive-500',
  mist: 'bg-mist-400 dark:bg-mist-500',
  taupe: 'bg-taupe-400 dark:bg-taupe-500',
}

/** A selection ring in the same colour (colour swatch pickers). */
export const RING_CLASSES = {
  red: 'ring-red-500',
  orange: 'ring-orange-500',
  amber: 'ring-amber-500',
  yellow: 'ring-yellow-500',
  lime: 'ring-lime-500',
  green: 'ring-green-500',
  emerald: 'ring-emerald-500',
  teal: 'ring-teal-500',
  cyan: 'ring-cyan-500',
  sky: 'ring-sky-500',
  blue: 'ring-blue-500',
  indigo: 'ring-indigo-500',
  violet: 'ring-violet-500',
  purple: 'ring-purple-500',
  fuchsia: 'ring-fuchsia-500',
  pink: 'ring-pink-500',
  rose: 'ring-rose-500',
  slate: 'ring-slate-400',
  gray: 'ring-gray-400',
  zinc: 'ring-zinc-400',
  neutral: 'ring-neutral-400',
  stone: 'ring-stone-400',
  mauve: 'ring-mauve-400',
  olive: 'ring-olive-400',
  mist: 'ring-mist-400',
  taupe: 'ring-taupe-400',
}

/**
 * A calendar event block in the week/day grid (design: soft fill, 3px left border in the space
 * colour). Keyed by the space hue keys (`HUE_KEYS`), since only spaces colour events.
 */
export const EVENT_BLOCK_CLASSES = {
  slate: 'border-l-slate-400 bg-slate-500/10 dark:bg-slate-400/15',
  blue: 'border-l-blue-500 bg-blue-500/10 dark:bg-blue-500/15',
  indigo: 'border-l-indigo-500 bg-indigo-500/10 dark:bg-indigo-500/15',
  violet: 'border-l-violet-500 bg-violet-500/10 dark:bg-violet-500/15',
  pink: 'border-l-pink-500 bg-pink-500/10 dark:bg-pink-500/15',
  red: 'border-l-red-500 bg-red-500/10 dark:bg-red-500/15',
  orange: 'border-l-orange-500 bg-orange-500/10 dark:bg-orange-500/15',
  amber: 'border-l-amber-500 bg-amber-500/10 dark:bg-amber-500/15',
  green: 'border-l-green-500 bg-green-500/10 dark:bg-green-500/15',
  teal: 'border-l-teal-500 bg-teal-500/10 dark:bg-teal-500/15',
}

export const eventBlockClasses = (key) => EVENT_BLOCK_CLASSES[key] ?? EVENT_BLOCK_CLASSES.slate

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

/**
 * Inline `@task` / `[[task]]` mentions (the user's request, 2026-09-26): no fill, a readable
 * blue in medium weight (600: 5.25:1 on white, WCAG AA; 400 in dark: 7.46:1), and a dotted
 * underline on the label that turns solid on hover. The same classes while loading and loaded (no shade jump). The editor's prose link
 * style skips `.axon-mention`, so it can't recolour it.
 */
export const MENTION_CLASSES =
  'axon-mention group/mention px-0.5 font-medium text-blue-600 dark:text-blue-400'

/** The mention's label: the dotted underline (with room below it, since the label truncates). */
export const MENTION_LABEL_CLASSES =
  'leading-5 underline decoration-blue-400 decoration-dotted underline-offset-3 group-hover/mention:decoration-solid dark:decoration-blue-500'

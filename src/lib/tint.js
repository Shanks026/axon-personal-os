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

/** True on macOS / iOS, where the primary modifier is ⌘; everywhere else it's Ctrl. */
export function isMac() {
  if (typeof navigator === 'undefined') return false
  const p = navigator.userAgentData?.platform ?? navigator.platform ?? navigator.userAgent ?? ''
  return /mac|iphone|ipad|ipod/i.test(p)
}

// Key symbols, never words (user request): ⌘/⌃ for the primary modifier, ⇧ shift, ⌥ option/alt.
const MAC = { mod: '⌘', ctrl: '⌃', shift: '⇧', alt: '⌥', enter: '↵', esc: 'Esc' }
const PC = { mod: '⌃', ctrl: '⌃', shift: '⇧', alt: '⌥', enter: '↵', esc: 'Esc' }

/**
 * Display keys for a shortcut like "mod+k" or "mod+enter" as symbols in this platform's
 * convention: ['⌘', 'K'] on Mac, ['⌃', 'K'] elsewhere.
 */
export function shortcutKeys(shortcut, mac = isMac()) {
  const names = mac ? MAC : PC
  return shortcut
    .toLowerCase()
    .split('+')
    .map((k) => names[k] ?? (k.length === 1 ? k.toUpperCase() : k[0].toUpperCase() + k.slice(1)))
}

/** Words for screen readers ("Control K"), since the symbols aren't reliably announced. */
export function shortcutLabel(shortcut, mac = isMac()) {
  const words = mac
    ? { mod: 'Command', ctrl: 'Control', shift: 'Shift', alt: 'Option', enter: 'Enter' }
    : { mod: 'Control', ctrl: 'Control', shift: 'Shift', alt: 'Alt', enter: 'Enter' }
  const arrows = { left: 'Left arrow', right: 'Right arrow' }
  return shortcut
    .toLowerCase()
    .split('+')
    .map((k) => words[k] ?? arrows[k] ?? k.toUpperCase())
    .join(' ')
}

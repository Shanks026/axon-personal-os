import { useEffect, useRef } from 'react'
import { useHotkeys, useHotkeysContext } from 'react-hotkeys-hook'
import { isOverridden, SHORTCUTS, shortcutById, shortcutKeyList } from '@/lib/shortcuts'

// Keys pressed inside a dialog or an open menu belong to it (Enter on its buttons, letters in its
// items), so only shortcuts that allow inputs (Ctrl/Cmd+K, Ctrl/Cmd+S) still fire there.
const OVERLAY = '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]'
// Sequences (`g>c`): the second key must not also fire its single-key shortcut (`c`, New task).
// A capture listener remembers the key before this one, so single keys can tell they follow a
// sequence's first key within its 1s window.
const SEQUENCE_STARTS = new Set(
  SHORTCUTS.flatMap(shortcutKeyList)
    .filter((k) => k.includes('>'))
    .map((k) => k.split('>')[0]),
)
let previous = { key: '', at: 0 }
let current = { key: '', at: 0 }
if (typeof window !== 'undefined') {
  window.addEventListener(
    'keydown',
    (e) => {
      previous = current
      current = { key: String(e.key ?? '').toLowerCase(), at: Date.now() }
    },
    true,
  )
}
const followsSequenceStart = () =>
  SEQUENCE_STARTS.has(previous.key) && current.at - previous.at < 1000

const ignoredIn = (entry) => {
  const single = shortcutKeyList(entry).every((k) => !k.includes('>') && !k.includes('+'))
  return (e) =>
    !!e.target?.closest?.('[data-hotkeys-ignore]') ||
    (!entry.allowInInputs && !!e.target?.closest?.(OVERLAY)) ||
    (single && followsSequenceStart())
}

/**
 * Binds a registry shortcut (`lib/shortcuts.js`) to `handler(event)`. The keys, scope and
 * typing rule come from the entry: single keys never fire while typing (inputs, the editor)
 * unless it allows inputs, and nothing fires inside `[data-hotkeys-ignore]`. A global shortcut
 * is off while an active page scope binds the same key (see `isOverridden`). The latest
 * `handler` is always the one called.
 */
export function useShortcut(id, handler, { enabled = true } = {}) {
  const entry = shortcutById(id)
  const { activeScopes } = useHotkeysContext()
  const handlerRef = useRef(handler)
  useEffect(() => {
    handlerRef.current = handler
  })
  const on = enabled && !isOverridden(entry, activeScopes)
  useHotkeys(entry.keys, (event) => handlerRef.current(event), {
    // Without a HotkeysProvider (component tests) every scope counts as active.
    scopes: activeScopes.length ? [entry.scope] : undefined,
    enabled: on,
    // Esc isn't prevented: Radix still needs it to close whatever is open.
    preventDefault: !entry.keys.includes('escape'),
    enableOnFormTags: !!entry.allowInInputs,
    enableOnContentEditable: !!entry.allowInInputs,
    ignoreEventWhen: ignoredIn(entry),
  })
}

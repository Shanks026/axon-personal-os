import { useEffect } from 'react'
import { useHotkeysContext } from 'react-hotkeys-hook'

/**
 * Turns a page's shortcut scope on while the component is mounted (and `active`), e.g.
 * `useShortcutScope('calendar')`. Its shortcuts then fire, and global ones with the same key
 * step aside (`lib/shortcuts.js`).
 */
export function useShortcutScope(scope, active = true) {
  const { enableScope, disableScope } = useHotkeysContext()
  useEffect(() => {
    if (!active) return undefined
    enableScope(scope)
    return () => disableScope(scope)
  }, [scope, active, enableScope, disableScope])
}

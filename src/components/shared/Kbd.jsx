import { shortcutKeys, shortcutLabel } from '@/lib/platform'
import { cn } from '@/lib/utils'

/**
 * Shortcut hint as key symbols: <Kbd shortcut="mod+k" /> → "⌘K" on Mac, "⌃K" on Windows/Linux.
 * Mono, faint, never wraps; screen readers get the words ("Control K").
 */
export function Kbd({ shortcut, className }) {
  return (
    <kbd
      className={cn('font-mono text-xs whitespace-nowrap text-faint', className)}
      aria-label={shortcutLabel(shortcut)}
    >
      {shortcutKeys(shortcut).join('')}
    </kbd>
  )
}

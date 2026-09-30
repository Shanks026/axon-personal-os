import { shortcutById } from '@/lib/shortcuts'
import { cn } from '@/lib/utils'
import { Kbd } from '@/components/shared/Kbd'

/**
 * A registry shortcut's keys (`id`, from `lib/shortcuts.js`) or raw `keys`, as `Kbd` hints. A
 * sequence (`g>d`) reads "G then D"; alternatives show the first (`j, down` → J). The entry's
 * `display` wins when it has one (`?`, `⌘\`).
 */
export function ShortcutKeys({ id, keys, className }) {
  const raw = id ? (shortcutById(id).display ?? shortcutById(id).keys) : keys
  const first = raw.split(',')[0].trim()
  const steps = first.split('>')
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      {steps.map((step, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          {i > 0 && <span className="text-xs text-faint">then</span>}
          <Kbd shortcut={step} />
        </span>
      ))}
    </span>
  )
}

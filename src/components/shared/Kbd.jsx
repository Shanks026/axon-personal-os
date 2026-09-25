import { ArrowBigUp, ArrowLeft, ArrowRight, Command, CornerDownLeft, Option } from 'lucide-react'
import { shortcutLabel } from '@/lib/platform'
import { cn } from '@/lib/utils'

// Modifiers render as icons, not font glyphs: Geist Mono has no ⌃ and some platforms draw ⌘
// tiny. The design shows "⌘K" everywhere, so the primary modifier is the Command icon.
const ICONS = {
  mod: Command,
  cmd: Command,
  shift: ArrowBigUp,
  alt: Option,
  enter: CornerDownLeft,
  left: ArrowLeft,
  right: ArrowRight,
}

/**
 * Shortcut hint (design: "⌘K"): <Kbd shortcut="mod+k" />. Icons for modifiers, mono letters
 * for keys, faint and never wrapping. Screen readers get words ("Control K" / "Command K").
 */
export function Kbd({ shortcut, className }) {
  const parts = shortcut.toLowerCase().split('+')
  return (
    <kbd
      className={cn(
        'inline-flex items-center gap-px font-mono text-xs whitespace-nowrap text-faint',
        className,
      )}
      aria-label={shortcutLabel(shortcut)}
    >
      {parts.map((key, i) => {
        const Icon = ICONS[key]
        return Icon ? (
          <Icon key={i} className="size-3" strokeWidth={2.25} aria-hidden />
        ) : (
          <span key={i} aria-hidden>
            {key.length === 1 ? key.toUpperCase() : key[0].toUpperCase() + key.slice(1)}
          </span>
        )
      })}
    </kbd>
  )
}

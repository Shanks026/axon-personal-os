import { DEFAULT_SPACE_EMOJI, GLOBAL_EMOJI } from '@/components/shared/spaceEmoji'
import { cn } from '@/lib/utils'

// Box size, emoji size. No tile or background: just the emoji (user request, Tricount-style).
const SIZES = {
  xs: 'size-4.5 text-sm',
  sm: 'size-5 text-base',
  md: 'size-8 text-2xl',
  lg: 'size-10 text-3xl',
}

/**
 * A space's emoji (switcher rows, cards, breadcrumb, dialog). `icon` holds the emoji itself.
 * Pass `global` for the Global view (🌐). The box keeps rows aligned whatever the emoji's width.
 */
export function SpaceIcon({ icon, global = false, size = 'md', className }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center leading-none select-none',
        SIZES[size] ?? SIZES.md,
        className,
      )}
    >
      {global ? GLOBAL_EMOJI : icon || DEFAULT_SPACE_EMOJI}
    </span>
  )
}

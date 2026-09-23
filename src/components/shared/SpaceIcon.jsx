import { Folder } from 'lucide-react'
import { GLOBAL_ICON, SPACE_ICONS } from '@/components/shared/spaceIconMap'
import { hueVar } from '@/lib/tint'
import { cn } from '@/lib/utils'

const SIZES = {
  xs: { tile: 'size-4.5 rounded-sm', icon: 'size-2.75' },
  sm: { tile: 'size-5 rounded-md', icon: 'size-3' },
  md: { tile: 'size-8 rounded-lg', icon: 'size-4' },
  lg: { tile: 'size-10 rounded-xl', icon: 'size-5' },
}

/**
 * The space's icon on a soft tile of its accent (design: switcher rows, cards, dialog).
 * Pass `global` for the Global view, which uses the neutral foreground instead of a hue.
 */
export function SpaceIcon({ icon, color, global = false, size = 'md', className }) {
  const Icon = global ? GLOBAL_ICON : (SPACE_ICONS[icon] ?? Folder)
  const hue = global ? 'var(--foreground)' : hueVar(color)
  const s = SIZES[size] ?? SIZES.md
  return (
    <span
      aria-hidden
      className={cn('flex shrink-0 items-center justify-center', s.tile, className)}
      style={{
        color: hue,
        backgroundColor: `color-mix(in oklab, ${hue} var(--space-soft-mix), transparent)`,
      }}
    >
      <Icon className={s.icon} />
    </span>
  )
}

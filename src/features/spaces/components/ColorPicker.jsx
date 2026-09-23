import { hueVar } from '@/lib/tint'
import { cn } from '@/lib/utils'
import { SPACE_COLORS } from '@/features/spaces/constants'

/** Ten accent swatches (design 02c). The selected one gets an offset ring in its own hue. */
export function ColorPicker({ value, onChange }) {
  return (
    <div role="radiogroup" aria-label="Colour" className="flex flex-wrap gap-2">
      {SPACE_COLORS.map((key) => {
        const selected = key === value
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={key}
            onClick={() => onChange(key)}
            className={cn(
              'size-6.5 rounded-full ring-offset-2 ring-offset-card transition-shadow outline-none focus-visible:ring-2 focus-visible:ring-ring',
              selected && 'ring-2',
            )}
            style={{ background: hueVar(key), '--tw-ring-color': hueVar(key) }}
          />
        )
      })}
    </div>
  )
}

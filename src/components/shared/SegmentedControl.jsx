import { useId } from 'react'
import { motion } from 'motion/react'
import { springs } from '@/components/motion/presets'
import { cn } from '@/lib/utils'

/**
 * Segmented control (design: "Week starts on", view toggles). The selected thumb slides
 * between options on the snappy spring.
 * @param {{ value: string, onChange: (v: string) => void, options: { value: string, label: React.ReactNode, icon?: any }[], label: string }} props
 */
export function SegmentedControl({ value, onChange, options, label, className }) {
  const id = useId()
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('inline-flex gap-0.5 rounded-lg bg-muted p-0.5', className)}
    >
      {options.map((opt) => {
        const selected = opt.value === value
        const Icon = opt.icon
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            className={cn(
              'relative flex h-7 items-center gap-1.5 rounded-md px-3 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
              selected ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {selected && (
              <motion.span
                layoutId={`${id}-thumb`}
                transition={springs.snappy}
                className="absolute inset-0 rounded-md bg-card shadow-xs"
              />
            )}
            <span className="relative flex items-center gap-1.5">
              {Icon && <Icon className="size-3.5" aria-hidden />}
              {opt.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

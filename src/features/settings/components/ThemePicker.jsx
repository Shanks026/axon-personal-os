import { Monitor, Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'

const THEMES = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

/** Miniature app window drawn in one theme (the `light` / `dark` class scopes the tokens). */
function Preview({ mode }) {
  return (
    <div
      className={cn('flex size-full bg-background', mode)}
      style={{ colorScheme: mode }}
      aria-hidden
    >
      <div className="w-3/10 border-r bg-sidebar" />
      <div className="flex flex-1 flex-col gap-1.5 p-2.5">
        <div className="h-1.5 w-3/5 rounded-full bg-foreground" />
        <div className="h-1.25 w-5/6 rounded-full bg-border" />
        <div className="h-1.25 w-2/3 rounded-full bg-border" />
      </div>
    </div>
  )
}

/** Three preview cards (design 15a). The selected card gets a 2px ring. */
export function ThemePicker({ value, onChange }) {
  return (
    <div role="radiogroup" aria-label="Theme" className="mt-3 grid grid-cols-3 gap-2.5">
      {THEMES.map(({ value: v, label, icon: Icon }) => {
        const selected = v === value
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(v)}
            className="group flex flex-col gap-2 text-left outline-none"
          >
            <span
              className={cn(
                'relative flex h-18 overflow-hidden rounded-lg border transition-shadow',
                selected
                  ? 'ring-2 ring-foreground ring-offset-2 ring-offset-card'
                  : 'group-hover:border-border-strong group-focus-visible:ring-2 group-focus-visible:ring-ring',
              )}
            >
              {v === 'system' ? (
                <>
                  <Preview mode="light" />
                  <span className="absolute inset-0" style={{ clipPath: 'inset(0 0 0 50%)' }}>
                    <Preview mode="dark" />
                  </span>
                </>
              ) : (
                <Preview mode={v} />
              )}
            </span>
            <span
              className={cn(
                'flex items-center gap-1.5',
                selected ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              <Icon className="size-3.5" aria-hidden />
              {label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

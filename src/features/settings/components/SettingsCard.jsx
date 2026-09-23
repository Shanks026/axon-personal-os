import { cn } from '@/lib/utils'

/** Bordered group of setting rows (design 15a/15b). */
export function SettingsCard({ children, className }) {
  return (
    <div className={cn('divide-y overflow-hidden rounded-xl border bg-card', className)}>
      {children}
    </div>
  )
}

/** One row: label and optional description on the left, the control on the right. */
export function SettingsRow({ label, description, htmlFor, children, className }) {
  return (
    <div className={cn('flex items-center gap-6 px-5 py-4.5', className)}>
      <div className="min-w-0 flex-1">
        <label htmlFor={htmlFor} className="font-medium">
          {label}
        </label>
        {description && <p className="mt-0.5 text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  )
}

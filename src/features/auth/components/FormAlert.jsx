import { CircleAlert } from 'lucide-react'

/** Inline form-level error (server errors that don't belong to one field). */
export function FormAlert({ children }) {
  if (!children) return null
  return (
    <p role="alert" className="flex items-start gap-1.5 text-xs text-destructive">
      <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  )
}

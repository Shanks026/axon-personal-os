import { CircleAlert, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Inline error block for a failed section load, with an optional retry. */
export function ErrorState({ error, onRetry, title = 'Something went wrong', className }) {
  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded-lg border bg-card px-4 py-3 text-left',
        className,
      )}
    >
      <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{title}</p>
        {error?.message && (
          <p className="mt-0.5 text-small break-words text-muted-foreground">{error.message}</p>
        )}
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCw />
          Retry
        </Button>
      )}
    </div>
  )
}

import { CircleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Textarea } from '@/components/ui/textarea'
import { AI_MAX_INPUT } from '@/features/ai/constants'

const PLACEHOLDER = `Describe the task, or several. For example:
Fix RFQ list pagination for v3.9, high priority, due Friday. Check the filters and add a regression test.
Tomorrow: rebase MR 1428, review the vendor form PR, and start the admin role menus.`

/**
 * The "Describe with AI" text box (the footer with the model and Generate lives in the panel).
 * Mod+Enter generates. `error` shows inline under the box.
 */
export function AiTaskComposer({ value, onChange, onSubmit, pending, error }) {
  const tooLong = value.length > AI_MAX_INPUT
  return (
    <div className="flex flex-col gap-2">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            if (!pending && value.trim() && !tooLong) onSubmit()
          }
        }}
        readOnly={pending}
        autoFocus
        aria-label="Describe the tasks"
        aria-invalid={tooLong || undefined}
        placeholder={PLACEHOLDER}
        className={cn(
          'min-h-40 resize-none border-0 bg-transparent px-0 py-0 text-base leading-relaxed shadow-none focus-visible:ring-0 md:text-base dark:bg-transparent',
          pending && 'text-muted-foreground',
        )}
      />
      {tooLong && (
        <p className="text-xs text-destructive">
          Keep it under {AI_MAX_INPUT.toLocaleString()} characters ({value.length.toLocaleString()}{' '}
          now).
        </p>
      )}
      {error && (
        <p role="alert" className="flex items-start gap-1.5 text-xs text-destructive">
          <CircleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  )
}

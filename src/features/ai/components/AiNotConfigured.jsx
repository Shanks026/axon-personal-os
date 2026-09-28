import { KeyRound } from 'lucide-react'
import { Link } from 'react-router'
import { paths } from '@/lib/paths'
import { cn } from '@/lib/utils'

/**
 * Shown while the Anthropic key is missing or still the placeholder: what to do, in three steps.
 * `showSettingsLink` adds a link to Settings → AI & integrations (not needed on that page).
 */
export function AiNotConfigured({ showSettingsLink = true, className }) {
  return (
    <div className={cn('rounded-xl border border-dashed border-border-strong p-4', className)}>
      <p className="flex items-center gap-2 font-medium">
        <KeyRound className="size-4 text-muted-foreground" aria-hidden />
        AI isn’t set up yet
      </p>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
        <li>
          At <span className="font-mono text-xs">platform.claude.com</span>, add credits under
          Billing ($5–10 is plenty to start).
        </li>
        <li>Create an API key under API keys.</li>
        <li>
          In Supabase, open Edge Functions → Secrets and set{' '}
          <span className="font-mono text-xs">ANTHROPIC_API_KEY</span> to that key.
        </li>
      </ol>
      {showSettingsLink && (
        <Link
          to={paths.settings('ai')}
          className="mt-3 inline-block text-sm underline-offset-3 hover:underline"
        >
          Open AI settings
        </Link>
      )}
    </div>
  )
}

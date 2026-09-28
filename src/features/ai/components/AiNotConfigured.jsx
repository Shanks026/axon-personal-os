import { KeyRound } from 'lucide-react'
import { Link } from 'react-router'
import { paths } from '@/lib/paths'
import { cn } from '@/lib/utils'

/**
 * Shown while no AI provider has a key: how to add the Gemini one (free tier, no card needed).
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
          Sign in at <span className="font-mono text-xs">aistudio.google.com</span> with a Google
          account (the free tier needs no card).
        </li>
        <li>
          Open <span className="font-medium">Get API key</span> →{' '}
          <span className="font-medium">Create API key</span>.
        </li>
        <li>
          In Supabase, open Edge Functions → Secrets and add{' '}
          <span className="font-mono text-xs">GEMINI_API_KEY</span>.
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

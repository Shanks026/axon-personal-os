import { Construction } from 'lucide-react'
import { useParams } from 'react-router'
import { PageTransition } from '@/components/motion/PageTransition'
import { EmptyState } from '@/components/shared/EmptyState'
import { ThemeToggleButton } from '@/components/shared/ThemeToggleButton'

/**
 * Temporary route target until the owning feature replaces its page file.
 * Shows the route params so routing can be checked by eye.
 */
export function PlaceholderPage({ title, feature, actions }) {
  const params = useParams()
  const entries = Object.entries(params).filter(([k]) => k !== '*')

  return (
    <PageTransition className="min-h-svh bg-background p-10">
      <div className="mx-auto flex max-w-270 flex-col gap-8">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <div className="flex items-center gap-2">
            {actions}
            <ThemeToggleButton />
          </div>
        </header>
        <EmptyState
          icon={Construction}
          title="Not built yet"
          description={`This page arrives with Feature ${feature}.`}
          action={
            entries.length > 0 && (
              <p className="font-mono text-xs text-muted-foreground">
                {entries.map(([k, v]) => `${k}=${v}`).join(' · ')}
              </p>
            )
          }
        />
      </div>
    </PageTransition>
  )
}

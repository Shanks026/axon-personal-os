import { Construction } from 'lucide-react'
import { useParams } from 'react-router'
import { useSpace } from '@/context/SpaceContext'
import { usePageHeader } from '@/components/layout/PageHeaderContext'
import { EmptyState } from '@/components/shared/EmptyState'

/**
 * Temporary section page inside the app shell until the owning feature replaces the file.
 * In dev it prints the scope, so Global vs single-space wiring can be checked by eye.
 */
export function PlaceholderPage({ title, feature }) {
  usePageHeader({ title })
  const params = useParams()
  const { isGlobal, scopeSpaceIds } = useSpace()
  const detail = Object.entries(params).filter(([k]) => k !== 'spaceSlug' && k !== '*')

  return (
    <div className="mx-auto w-full max-w-270 px-4 py-10 md:px-10">
      <EmptyState
        icon={Construction}
        title={`${title} isn’t built yet`}
        description={`This page arrives with Feature ${feature}.`}
        action={
          import.meta.env.DEV && (
            <p className="font-mono text-xs text-muted-foreground">
              {isGlobal ? 'Global' : 'Space'} · {scopeSpaceIds.length} in scope
              {detail.map(([k, v]) => ` · ${k}=${v}`).join('')}
            </p>
          )
        }
      />
    </div>
  )
}

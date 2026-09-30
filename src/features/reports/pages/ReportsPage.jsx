import { useState } from 'react'
import { FileChartColumn, Sparkles } from 'lucide-react'
import { useSpace } from '@/context/SpaceContext'
import { usePageHeader } from '@/components/layout/PageHeaderContext'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useReports } from '@/features/reports/api'
import { GenerateReportDialog } from '@/features/reports/components/GenerateReportDialog'
import { ReportCard } from '@/features/reports/components/ReportCard'
import { useSpacePaths } from '@/features/spaces/hooks/useSpacePaths'

/** Reports (Feature 17 Phase 5): AI reports for this space (or all spaces in Global), newest period first. */
export default function ReportsPage() {
  const { space, isGlobal, scopeSpaceIds, spaceById } = useSpace()
  const p = useSpacePaths()
  const [generating, setGenerating] = useState(false)
  const {
    data: reports = [],
    isLoading,
    error,
    refetch,
  } = useReports({ spaceIds: scopeSpaceIds, global: isGlobal })
  usePageHeader({ title: 'Reports' })

  const generateButton = (
    <Button onClick={() => setGenerating(true)}>
      <Sparkles />
      Generate report
    </Button>
  )

  return (
    <div className="flex w-full flex-col px-4 pt-8 pb-12 md:px-9">
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-3">
            <h2 className="text-3xl font-semibold tracking-tight">Reports</h2>
            <span className="text-2xl font-light text-faint tabular-nums">{reports.length}</span>
          </div>
          <p className="mt-1.5 truncate text-muted-foreground">
            {isGlobal
              ? 'Weekly and quarterly reports across all spaces.'
              : `Weekly and quarterly reports for ${space?.name}.`}
          </p>
        </div>
        {generateButton}
      </div>

      <div className="mt-8">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" aria-hidden>
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} title="Couldn’t load reports" />
        ) : reports.length === 0 ? (
          <EmptyState
            icon={FileChartColumn}
            title="No reports yet"
            description="Generate one for this quarter."
            action={generateButton}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {reports.map((r) => (
              <ReportCard
                key={r.id}
                report={r}
                to={p.report(r.id)}
                space={r.space_id ? spaceById.get(r.space_id) : null}
                showSpace={isGlobal}
              />
            ))}
          </div>
        )}
      </div>

      <GenerateReportDialog open={generating} onOpenChange={setGenerating} />
    </div>
  )
}

import { Archive, FileQuestion } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router'
import { GLOBAL_SLUG, paths } from '@/lib/paths'
import { useSpace } from '@/context/SpaceContext'
import { usePageHeader } from '@/components/layout/PageHeaderContext'
import { EmptyState } from '@/components/shared/EmptyState'
import { ErrorState } from '@/components/shared/ErrorState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useReport } from '@/features/reports/api'
import { ReportEditor } from '@/features/reports/components/ReportEditor'
import { useSpacePaths } from '@/features/spaces/hooks/useSpacePaths'

/** Header + body for every state other than the loaded editor (which sets its own header). */
function ReportStatus({ children }) {
  const p = useSpacePaths()
  usePageHeader({ title: 'Report', parent: { label: 'Reports', to: p.reports() } })
  return <div className="mx-auto w-full max-w-190 px-4 pt-12 pb-24">{children}</div>
}

/** /s/:slug/reports/:reportId (Feature 17 Phase 5). */
export default function ReportPage() {
  const { reportId } = useParams()
  const { isGlobal, space, activeSpaces } = useSpace()
  const p = useSpacePaths()
  const { data: report, isLoading, error, refetch } = useReport(reportId)

  if (isLoading) {
    return (
      <ReportStatus>
        <div aria-hidden>
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="mt-4 h-4 w-60" />
          <Skeleton className="mt-8 h-4 w-full" />
          <Skeleton className="mt-3 h-4 w-5/6" />
          <Skeleton className="mt-3 h-4 w-3/4" />
        </div>
      </ReportStatus>
    )
  }
  if (error) {
    return (
      <ReportStatus>
        <ErrorState error={error} onRetry={refetch} title="Couldn’t load this report" />
      </ReportStatus>
    )
  }
  if (!report || report.deleted_at) {
    return (
      <ReportStatus>
        <EmptyState
          icon={FileQuestion}
          title="This report doesn’t exist or is in Trash"
          description="It may have been deleted, or the link is wrong."
          action={
            <Button variant="outline" asChild>
              <Link to={p.reports()}>Back to Reports</Link>
            </Button>
          }
        />
      </ReportStatus>
    )
  }

  const reportSpace = report.space_id ? activeSpaces.find((s) => s.id === report.space_id) : null
  if (report.space_id && !reportSpace) {
    return (
      <ReportStatus>
        <EmptyState
          icon={Archive}
          title="This report is in an archived space"
          description="Restore the space to open its reports again."
          action={
            <Button variant="outline" asChild>
              <Link to={paths.spaces()}>Go to spaces</Link>
            </Button>
          }
        />
      </ReportStatus>
    )
  }
  // Canonical URL: a space's report under its space, a Global report under Global.
  if (!isGlobal && report.space_id !== space?.id) {
    const slug = reportSpace?.slug ?? GLOBAL_SLUG
    return <Navigate to={paths.space(slug).report(report.id)} replace />
  }

  // A new key on regeneration remounts the editor with the new content.
  return <ReportEditor key={`${report.id}:${report.generated_at ?? ''}`} report={report} />
}

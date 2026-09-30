import { Sparkles } from 'lucide-react'
import { Link } from 'react-router'
import { formatRelative } from '@/lib/dates'
import { SpaceBadge } from '@/components/shared/SpaceBadge'
import { AI_MODEL_MAP } from '@/features/ai/constants'
import { rangeLabel, reportExcerpt } from '@/features/reports/utils'

const KIND_LABELS = { quarter: 'Quarter', month: 'Month', week: 'Week', custom: 'Custom' }

/**
 * A report in the list: title, period (mono), the space badge in Global ("All spaces" for a
 * Global report), a 2-line excerpt, and "Generated 2d ago · Gemini 3.8 Flash". The whole card
 * links to the report.
 */
export function ReportCard({ report, to, space, showSpace }) {
  const model = AI_MODEL_MAP[report.ai_model]?.label ?? report.ai_model
  const excerpt = reportExcerpt(report.content_text)
  return (
    <article className="group relative flex h-full min-h-37 flex-col rounded-xl border bg-card px-5 py-4.5 transition duration-(--dur-fast) ease-(--ease-standard) hover:-translate-y-px hover:border-border-strong hover:shadow-xs dark:bg-card/50">
      <Link
        to={to}
        className="absolute inset-0 z-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Open ${report.title}`}
        title={report.title}
      />
      <div className="pointer-events-none relative flex items-center gap-2 font-mono text-xs text-muted-foreground">
        <span>{KIND_LABELS[report.period_kind]}</span>
        <span className="text-faint">·</span>
        <span className="truncate">{rangeLabel(report.period_start, report.period_end)}</span>
        {showSpace && (
          <span className="ml-auto shrink-0 font-sans">
            {space ? (
              <SpaceBadge space={space} />
            ) : (
              <span className="text-muted-foreground">All spaces</span>
            )}
          </span>
        )}
      </div>
      <h3 className="pointer-events-none relative mt-2 line-clamp-2 text-base leading-snug font-semibold tracking-tight text-pretty">
        {report.title}
      </h3>
      {excerpt && (
        <p className="pointer-events-none relative mt-1.5 line-clamp-2 leading-relaxed text-muted-foreground">
          {excerpt}
        </p>
      )}
      <div className="flex-1" />
      <footer className="pointer-events-none relative mt-3 flex items-center gap-1.5 border-t border-dashed border-border-strong pt-3.5 text-xs text-muted-foreground">
        <Sparkles className="size-3.5" aria-hidden />
        <span className="truncate">
          {report.generated_at ? `Generated ${formatRelative(report.generated_at)}` : 'Written'}
          {model && ` · ${model}`}
        </span>
      </footer>
    </article>
  )
}

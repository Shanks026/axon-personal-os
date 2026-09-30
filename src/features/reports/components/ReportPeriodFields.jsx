import { CalendarDays } from 'lucide-react'
import { formatDate } from '@/lib/dates'
import { DatePicker } from '@/components/shared/DatePicker'
import { SegmentedControl } from '@/components/shared/SegmentedControl'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ReportFieldRow } from '@/features/reports/components/ReportFieldRow'

const KINDS = [
  { value: 'quarter', label: 'Quarter' },
  { value: 'week', label: 'Week' },
  { value: 'custom', label: 'Custom' },
]

function DateButton({ value, onChange, weekStartsOn, label }) {
  return (
    <DatePicker
      value={value}
      onChange={(v) => v && onChange(v)}
      clearable={false}
      weekStartsOn={weekStartsOn}
    >
      <Button type="button" variant="outline" size="sm" aria-label={label}>
        <CalendarDays aria-hidden />
        {formatDate(value)}
      </Button>
    </DatePicker>
  )
}

/**
 * The period rows of the Generate report dialog: Quarter / Week / Custom, that kind's picker
 * (a quarter select, any day in the week, or a from–to range), and the dates it covers.
 * `state` comes from `useReportPeriod`.
 */
export function ReportPeriodFields({ state, weekStartsOn }) {
  const { kind, setKind, quarters, quarter, setQuarter, period } = state
  return (
    <>
      <ReportFieldRow label="Period">
        <SegmentedControl label="Report period" value={kind} onChange={setKind} options={KINDS} />
      </ReportFieldRow>

      {kind === 'quarter' && (
        <ReportFieldRow label="Quarter">
          <Select value={quarter} onValueChange={setQuarter}>
            <SelectTrigger size="sm" aria-label="Quarter" className="min-w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper">
              {quarters.map((q, i) => (
                <SelectItem key={q.value} value={q.value}>
                  {q.label}
                  {i === 0 && <span className="text-muted-foreground"> · current</span>}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ReportFieldRow>
      )}
      {kind === 'week' && (
        <ReportFieldRow label="Any day in it">
          <DateButton
            value={state.weekDay}
            onChange={state.setWeekDay}
            weekStartsOn={weekStartsOn}
            label="A day in the week"
          />
        </ReportFieldRow>
      )}
      {kind === 'custom' && (
        <ReportFieldRow label="From – to">
          <DateButton
            value={state.start}
            onChange={state.setStart}
            weekStartsOn={weekStartsOn}
            label="First day"
          />
          <span className="text-faint">–</span>
          <DateButton
            value={state.end}
            onChange={state.setEnd}
            weekStartsOn={weekStartsOn}
            label="Last day"
          />
        </ReportFieldRow>
      )}

      <ReportFieldRow label="Covers">
        {period ? (
          <span className="font-mono text-xs text-muted-foreground">
            {formatDate(period.start)} – {formatDate(period.end)}
          </span>
        ) : (
          <span className="text-xs text-destructive">
            Pick an end on or after the start, within a year.
          </span>
        )}
      </ReportFieldRow>
    </>
  )
}

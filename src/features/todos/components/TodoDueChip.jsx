import { DatePicker } from '@/components/shared/DatePicker'
import { DueLabel } from '@/components/shared/DueLabel'
import { usePreferences } from '@/features/settings/api'

/** Due-date chip for a todo row: click to reschedule. */
export function TodoDueChip({ date, onChange }) {
  const { weekStartsOn } = usePreferences()
  return (
    <DatePicker value={date} onChange={onChange} weekStartsOn={weekStartsOn} align="end">
      <button
        type="button"
        aria-label="Change due date"
        className="shrink-0 rounded-sm outline-none hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <DueLabel date={date} />
      </button>
    </DatePicker>
  )
}

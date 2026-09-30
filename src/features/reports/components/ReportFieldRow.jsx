/** A labelled row in the report dialogs: a fixed-width muted label, then the control(s). */
export function ReportFieldRow({ label, children }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-muted-foreground">{label}</span>
      <div className="flex min-w-0 flex-wrap items-center gap-2">{children}</div>
    </div>
  )
}

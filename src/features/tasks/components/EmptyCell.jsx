/** A muted dash for an empty table cell (the user's request: never leave a cell blank). */
export function EmptyCell() {
  return (
    <span className="text-faint" aria-label="None">
      -
    </span>
  )
}

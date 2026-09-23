const STEP = 1000

/** Position for an item dropped between two neighbours (either may be null at list edges). */
export function positionBetween(before, after) {
  if (before == null && after == null) return STEP
  if (before == null) return after - STEP
  if (after == null) return before + STEP
  return (before + after) / 2
}

/** Position for an item appended to the end of a list. */
export function positionAfterLast(positions) {
  if (!positions?.length) return STEP
  return Math.max(...positions) + STEP
}

/** True when two neighbours are too close to split again, so the list needs renumbering. */
export function needsRebalance(a, b) {
  return Math.abs(a - b) < 1e-9
}

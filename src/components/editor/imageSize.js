/** The smallest an image can be resized to, in CSS pixels. */
export const MIN_IMAGE_WIDTH = 80

/** Arrow-key resize step on a focused handle (Shift for a bigger step). */
export const IMAGE_RESIZE_STEP = 20

/**
 * A resize target clamped to [MIN_IMAGE_WIDTH, max]: `max` is the column width, so an image never
 * spills out. Rounded to whole pixels, which is what's saved.
 */
export function clampImageWidth(width, max) {
  const upper = Math.max(MIN_IMAGE_WIDTH, max || Infinity)
  return Math.round(Math.min(upper, Math.max(MIN_IMAGE_WIDTH, width)))
}

/**
 * The width to show: the resized width if set, else the natural width. Both are capped at the
 * column by CSS (`max-width: 100%`); `null` means "fill up to the column".
 */
export function displayWidth({ displayWidth: resized, width: natural }) {
  return resized ?? natural ?? null
}

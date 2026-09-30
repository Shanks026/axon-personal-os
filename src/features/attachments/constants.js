/** The preview lightbox's root class: an open dialog underneath ignores clicks and Esc inside it. */
export const LIGHTBOX_CLASS = 'axon-lightbox'

/** For a Radix dialog's `onInteractOutside` / `onEscapeKeyDown`: stay open while a lightbox is up. */
export function keepOpenForLightbox(event) {
  if (document.querySelector(`.${LIGHTBOX_CLASS}`)) event.preventDefault()
}

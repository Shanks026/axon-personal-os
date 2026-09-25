import { ReactRenderer } from '@tiptap/react'

/**
 * `render` for a Tiptap suggestion (the `/` menu now, `[[` task mentions in Feature 07).
 * `Component` gets the suggestion props (`items`, `command`, `query`, …) and exposes
 * `onKeyDown({ event })` through its ref for ↑ ↓ Enter. The suggestion's `mount` places the
 * element with Floating UI (bottom-start, flipping) and follows scrolls and layout shifts.
 * Escape is handled by the suggestion plugin itself.
 *
 * Inside a modal dialog the popup is placed in the dialog's content first: Radix makes
 * everything outside it inert (and a click out there would close the dialog). `mount` leaves an
 * element that's already in the DOM where it is, and `destroy` removes it again.
 */
export function createSuggestionRenderer(Component) {
  return () => {
    let renderer = null
    let unmount = null

    return {
      onStart: (props) => {
        renderer = new ReactRenderer(Component, { props, editor: props.editor })
        renderer.element.style.zIndex = '50'
        const dialog = props.editor.view.dom.closest('[data-slot="dialog-content"]')
        if (dialog) dialog.appendChild(renderer.element)
        unmount = props.mount(renderer.element)
      },
      onUpdate: (props) => renderer?.updateProps(props),
      onKeyDown: (props) => renderer?.ref?.onKeyDown?.(props) ?? false,
      onExit: () => {
        unmount?.()
        renderer?.destroy()
        unmount = null
        renderer = null
      },
    }
  }
}

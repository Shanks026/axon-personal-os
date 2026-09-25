import { ReactRenderer } from '@tiptap/react'

/**
 * `render` for a Tiptap suggestion (the `/` menu now, `[[` task mentions in Feature 07).
 * `Component` gets the suggestion props (`items`, `command`, `query`, …) and exposes
 * `onKeyDown({ event })` through its ref for ↑ ↓ Enter. The suggestion's `mount` places the
 * element with Floating UI (bottom-start, flipping) and follows scrolls and layout shifts.
 * Escape is handled by the suggestion plugin itself.
 */
export function createSuggestionRenderer(Component) {
  return () => {
    let renderer = null
    let unmount = null

    return {
      onStart: (props) => {
        renderer = new ReactRenderer(Component, { props, editor: props.editor })
        renderer.element.style.zIndex = '50'
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

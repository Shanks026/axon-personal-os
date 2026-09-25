import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach } from 'vitest'

// Lazy route chunks can take >1s to import when the whole suite runs in parallel.
configure({ asyncUtilTimeout: 3000 })

afterEach(() => cleanup())

// jsdom gaps used by next-themes, Radix and motion
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })
}
if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}
// Radix Select / Popover pointer APIs
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false
  Element.prototype.setPointerCapture = () => {}
  Element.prototype.releasePointerCapture = () => {}
}
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {}
if (!Element.prototype.scrollTo) Element.prototype.scrollTo = () => {}
// ProseMirror (Tiptap) measures the selection and the DOM for scrolling and cursor placement.
if (!document.elementFromPoint) document.elementFromPoint = () => null
const noRects = () => ({ length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] })
const emptyRect = () => new DOMRect(0, 0, 0, 0)
for (const proto of [Range.prototype, Element.prototype]) {
  if (!proto.getClientRects) proto.getClientRects = noRects
  if (!proto.getBoundingClientRect) proto.getBoundingClientRect = emptyRect
}
if (!Text.prototype.getClientRects) Text.prototype.getClientRects = noRects

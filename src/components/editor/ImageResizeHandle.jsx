import { useRef } from 'react'
import { cn } from '@/lib/utils'
import { clampImageWidth, IMAGE_RESIZE_STEP } from '@/components/editor/imageSize'

/**
 * A resize handle on one side of a selected image. Dragging changes the width live (`onResize`)
 * and saves it on release (`onCommit`); the height follows the aspect ratio. Arrow keys resize by
 * 20px (Shift: 80px) for keyboard users, and a double-click resets to the natural size.
 * `side="left"` grows the image when dragged left (mirrored).
 */
export function ImageResizeHandle({ side, boxRef, maxWidth, onResize, onCommit, onReset }) {
  const drag = useRef(null)

  const onPointerDown = (e) => {
    // Keep ProseMirror from starting a node drag or moving the selection.
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    drag.current = { x: e.clientX, width: boxRef.current?.getBoundingClientRect().width ?? 0 }
  }
  const widthAt = (clientX) => {
    const dx = clientX - drag.current.x
    return clampImageWidth(drag.current.width + (side === 'left' ? -dx : dx), maxWidth())
  }
  const onPointerMove = (e) => {
    if (drag.current) onResize(widthAt(e.clientX))
  }
  const onPointerUp = (e) => {
    if (!drag.current) return
    const width = widthAt(e.clientX)
    drag.current = null
    onCommit(width)
  }

  const onKeyDown = (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    e.stopPropagation()
    const step = (e.shiftKey ? 4 : 1) * IMAGE_RESIZE_STEP
    const grow = (e.key === 'ArrowRight') === (side === 'right')
    const current = boxRef.current?.getBoundingClientRect().width ?? 0
    onCommit(clampImageWidth(current + (grow ? step : -step), maxWidth()))
  }

  return (
    <button
      type="button"
      contentEditable={false}
      draggable={false}
      aria-label={`Resize image (${side} edge)`}
      title="Drag to resize · double-click to reset"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (drag.current = null)}
      onDoubleClick={onReset}
      onKeyDown={onKeyDown}
      className={cn(
        'group absolute top-1/2 z-10 flex h-12 w-3 -translate-y-1/2 cursor-ew-resize touch-none items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring',
        side === 'left' ? '-left-1.5' : '-right-1.5',
      )}
    >
      <span className="h-10 w-1.5 rounded-full border border-background bg-foreground/70 shadow-xs transition-colors group-hover:bg-foreground group-focus-visible:bg-foreground" />
    </button>
  )
}

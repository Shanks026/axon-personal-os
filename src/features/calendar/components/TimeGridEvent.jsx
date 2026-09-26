import { useDraggable } from '@dnd-kit/core'
import { motion } from 'motion/react'
import { formatTimeRange } from '@/lib/dates'
import { dotClasses } from '@/lib/tint'
import { cn } from '@/lib/utils'
import { springs } from '@/components/motion/presets'
import { TimeGridEventBody } from '@/features/calendar/components/TimeGridEventBody'

/**
 * A timed event in a day column (design: week view). The body drags to move it (15-minute snap,
 * across days in Week); the bottom bar drags to resize it (on the day the event ends). A click
 * opens it. While moving, the block stays behind as a dashed ghost and `DragOverlay` carries the
 * lifted copy. `layout` animates the block into its new slot after a drop.
 */
export function TimeGridEvent({ item, day, isEnd, layout, color, timeZone, onOpen }) {
  // Destructured: the lint treats an object whose member feeds `ref` as a ref.
  const {
    setNodeRef: setMoveRef,
    listeners: moveListeners,
    attributes: moveAttributes,
    isDragging: moving,
  } = useDraggable({ id: `move:${item.id}:${day}`, data: { kind: 'move', item, day } })
  const {
    setNodeRef: setResizeRef,
    listeners: resizeListeners,
    attributes: resizeAttributes,
    isDragging: resizing,
    transform: resizeTransform,
  } = useDraggable({
    id: `resize:${item.id}:${day}`,
    data: { kind: 'resize', item, day },
    disabled: !isEnd,
  })
  const resizePx = resizeTransform?.y ?? 0
  const short = layout.height < (30 / 1440) * 100

  return (
    <motion.div
      layout={!resizing}
      transition={springs.snappy}
      className="group/event absolute z-1 px-0.5"
      style={{
        top: `${layout.top}%`,
        height: `calc(${layout.height}% + ${resizePx}px)`,
        left: `${layout.left}%`,
        width: `${layout.width}%`,
      }}
    >
      <button
        type="button"
        ref={setMoveRef}
        {...moveListeners}
        {...moveAttributes}
        onClick={() => onOpen(item)}
        aria-label={`${item.title}, ${formatTimeRange(item.start, item.end, timeZone)}`}
        className="block h-full w-full cursor-grab rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
      >
        {moving ? (
          <div className="h-full w-full rounded-md border border-dashed border-border-strong" />
        ) : (
          <TimeGridEventBody item={item} color={color} timeZone={timeZone} short={short} />
        )}
      </button>
      {isEnd && !moving && (
        <div
          ref={setResizeRef}
          {...resizeListeners}
          {...resizeAttributes}
          role="slider"
          aria-label="Resize event"
          aria-valuetext={formatTimeRange(item.start, item.end, timeZone)}
          className="absolute inset-x-0.5 bottom-0 flex h-2 cursor-ns-resize items-end justify-center pb-0.75 outline-none"
        >
          <span
            className={cn(
              'h-0.75 w-4.5 rounded-full opacity-0 transition-opacity group-hover/event:opacity-100',
              resizing && 'opacity-100',
              dotClasses(color),
            )}
          />
        </div>
      )}
    </motion.div>
  )
}

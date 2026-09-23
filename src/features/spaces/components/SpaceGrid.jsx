import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { AnimatePresence, motion } from 'motion/react'
import { staggerItem } from '@/components/motion/presets'
import { SpaceCard } from '@/features/spaces/components/SpaceCard'
import { reorderPosition } from '@/features/spaces/utils'

const enter = staggerItem(0.03)

function SortableSpace({ space, ...cardProps }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: space.id,
  })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? 'relative z-20' : undefined}
    >
      <SpaceCard
        space={space}
        dragging={isDragging}
        dragHandle={{ ...attributes, ...listeners }}
        {...cardProps}
      />
    </div>
  )
}

/**
 * Sortable grid of active spaces. `leading` renders first (the Global card) and `trailing` last
 * (the ghost card); neither is sortable. Dropping computes a fractional position for the moved card.
 */
export function SpaceGrid({ spaces, leading, trailing, onReorder, cardProps }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd({ active, over }) {
    const position = reorderPosition(spaces, active.id, over?.id)
    if (position != null) onReorder(active.id, position)
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={spaces.map((s) => s.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {leading && (
            <motion.div variants={enter} custom={0} initial="initial" animate="animate">
              {leading}
            </motion.div>
          )}
          <AnimatePresence initial>
            {spaces.map((space, i) => (
              <motion.div
                key={space.id}
                variants={enter}
                custom={i + 1}
                initial="initial"
                animate="animate"
                exit={{ opacity: 0, scale: 0.96 }}
              >
                <SortableSpace space={space} {...cardProps(space)} />
              </motion.div>
            ))}
          </AnimatePresence>
          {trailing && (
            <motion.div
              variants={enter}
              custom={spaces.length + 1}
              initial="initial"
              animate="animate"
            >
              {trailing}
            </motion.div>
          )}
        </div>
      </SortableContext>
    </DndContext>
  )
}

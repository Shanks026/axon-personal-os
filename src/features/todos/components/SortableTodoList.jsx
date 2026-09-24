import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers'
import {
  sortableKeyboardCoordinates,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { AnimatePresence, motion } from 'motion/react'
import { listItem } from '@/components/motion/presets'
import { positionBetween } from '@/lib/position'
import { useReorderTodo } from '@/features/todos/api'
import { TodoItem } from '@/features/todos/components/TodoItem'

function SortableRow({ todo, flash, ...itemProps }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: todo.id,
  })
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      <TodoItem
        todo={todo}
        flash={flash}
        dragHandleProps={{ ...attributes, ...listeners }}
        {...itemProps}
      />
    </div>
  )
}

/**
 * Drag reorder within one open group (design: cross-group drops aren't allowed — change the due
 * date to move a todo between groups instead). Enter/exit uses `AnimatePresence`; the live reorder
 * itself is dnd-kit's own transform, so it never fights `motion`'s `layout` animation.
 */
export function SortableTodoList({ todos, flashId, ...itemProps }) {
  const reorder = useReorderTodo()
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd({ active, over }) {
    if (!over || active.id === over.id) return
    const from = todos.findIndex((t) => t.id === active.id)
    const to = todos.findIndex((t) => t.id === over.id)
    if (from < 0 || to < 0) return
    const reordered = [...todos]
    reordered.splice(to, 0, reordered.splice(from, 1)[0])
    const i = reordered.findIndex((t) => t.id === active.id)
    const position = positionBetween(
      reordered[i - 1]?.position ?? null,
      reordered[i + 1]?.position ?? null,
    )
    reorder.mutate({ id: active.id, position })
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={todos.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <AnimatePresence initial={false}>
          {todos.map((todo) => (
            <motion.div
              key={todo.id}
              variants={listItem}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <SortableRow todo={todo} flash={flashId === todo.id} {...itemProps} />
            </motion.div>
          ))}
        </AnimatePresence>
      </SortableContext>
    </DndContext>
  )
}

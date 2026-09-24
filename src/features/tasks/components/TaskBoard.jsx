import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { motion } from 'motion/react'
import { positionAfterLast } from '@/lib/position'
import { useSpace } from '@/context/SpaceContext'
import { durations, easings } from '@/components/motion/presets'
import { useCreateTask, useMoveTask } from '@/features/tasks/api'
import { BoardCard } from '@/features/tasks/components/BoardCard'
import { BoardColumn } from '@/features/tasks/components/BoardColumn'
import { DONE_WINDOW_DAYS, TASK_STATUS_MAP } from '@/features/tasks/constants'
import { planBoardMove } from '@/features/tasks/utils'

const KEYBOARD_CODES = { start: ['Space'], cancel: ['Escape'], end: ['Space', 'Enter'] }
const DROP_ANIMATION = {
  duration: durations.base * 1000,
  easing: `cubic-bezier(${easings.enter.join(', ')})`,
}
const LIFT = {
  initial: { scale: 1, rotate: 0 },
  animate: { scale: 1.01, rotate: 1 },
  transition: { duration: durations.fast, ease: easings.standard },
}

/** { status: taskId[] } in position order, for the given columns. */
function columnIds(tasks, statuses) {
  return Object.fromEntries(
    statuses.map((s) => [
      s,
      tasks
        .filter((t) => t.status === s)
        .sort((a, b) => a.position - b.position)
        .map((t) => t.id),
    ]),
  )
}

/**
 * Kanban board (design 04c). Cards drag within and across columns; the drop sets status and a
 * fractional position optimistically. While dragging, column order lives in local state, and
 * that state is kept after the drop until the task list itself changes, so the card never
 * flickers back to where it was.
 */
export function TaskBoard({
  tasks,
  statuses,
  actions,
  tagsById,
  onEdit,
  onCreate,
  windowed,
  onShowAll,
}) {
  const { isGlobal, space, spaceById } = useSpace()
  const move = useMoveTask()
  const create = useCreateTask()
  const [drag, setDrag] = useState(null) // { base, items, activeId, from, overStatus }

  const taskById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks])
  const derived = useMemo(() => columnIds(tasks, statuses), [tasks, statuses])
  const items = drag?.base === tasks ? drag.items : derived
  const activeId = drag?.base === tasks ? drag.activeId : null

  // Handlers and announcements read the latest committed state through a ref.
  const latest = useRef({ items, taskById, drag })
  useLayoutEffect(() => {
    latest.current = { items, taskById, drag }
  })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: KEYBOARD_CODES,
    }),
  )

  const containerOf = (id, list = latest.current.items) =>
    id in list ? id : Object.keys(list).find((s) => list[s].includes(id))
  const titleOf = (id) => latest.current.taskById.get(id)?.title ?? 'Task'
  const labelOf = (status) => TASK_STATUS_MAP[status]?.label ?? status

  function handleDragStart({ active }) {
    const from = containerOf(active.id, items)
    setDrag({
      base: tasks,
      items,
      activeId: active.id,
      from: { status: from, index: items[from].indexOf(active.id) },
      overStatus: from,
    })
  }

  function handleDragOver({ active, over }) {
    if (!over) return
    setDrag((d) => {
      if (!d) return d
      const from = containerOf(active.id, d.items)
      const to = containerOf(over.id, d.items)
      if (!from || !to) return d
      if (from === to) return d.overStatus === to ? d : { ...d, overStatus: to }
      const target = d.items[to]
      const overIndex = target.indexOf(over.id)
      const translated = active.rect.current.translated
      const below = translated && translated.top > over.rect.top + over.rect.height / 2
      const index = overIndex >= 0 ? overIndex + (below ? 1 : 0) : target.length
      return {
        ...d,
        overStatus: to,
        items: {
          ...d.items,
          [from]: d.items[from].filter((id) => id !== active.id),
          [to]: [...target.slice(0, index), active.id, ...target.slice(index)],
        },
      }
    })
  }

  function handleDragEnd({ active, over }) {
    const d = latest.current.drag
    if (!d || !over) return setDrag(null)
    const to = containerOf(over.id, d.items)
    if (!to) return setDrag(null)

    let column = d.items[to]
    const from = column.indexOf(active.id)
    // Over the column itself (not a card): keep the slot the card was dragged into.
    const overIndex = over.id === to ? from : column.indexOf(over.id)
    if (overIndex >= 0 && overIndex !== from) column = arrayMove(column, from, overIndex)
    const index = column.indexOf(active.id)
    if (to === d.from.status && index === d.from.index) return setDrag(null)

    const { position, rebalance } = planBoardMove(
      column.map((id) => taskById.get(id)),
      active.id,
    )
    // Keep the dropped order on screen until the optimistic update replaces `tasks`.
    setDrag({ ...d, items: { ...d.items, [to]: column }, activeId: null, overStatus: null })
    move.mutate({
      id: active.id,
      patch: { status: to, position },
      rebalanceIds: rebalance ? column : undefined,
    })
  }

  const announcements = {
    onDragStart: ({ active }) => `Picked up ${titleOf(active.id)}.`,
    onDragOver: ({ active, over }) => {
      if (!over) return `${titleOf(active.id)} is no longer over a column.`
      const status = containerOf(over.id)
      const column = latest.current.items[status] ?? []
      const n = over.id === status ? column.length : column.indexOf(over.id) + 1
      return `Moved to ${labelOf(status)}, position ${n} of ${column.length}.`
    },
    onDragEnd: ({ active, over }) =>
      over
        ? `Dropped ${titleOf(active.id)} in ${labelOf(containerOf(over.id))}.`
        : `Dropped ${titleOf(active.id)}.`,
    onDragCancel: ({ active }) =>
      `Cancelled. ${titleOf(active.id)} returned to ${labelOf(latest.current.drag?.from.status)}.`,
  }

  const quickAdd = (status, title) =>
    create.mutate({
      title,
      status,
      space_id: space.id,
      position: positionAfterLast(items[status].map((id) => taskById.get(id)?.position ?? 0)),
    })

  const cardProps = (task) => ({
    space: spaceById.get(task.space_id),
    showSpace: isGlobal,
    tags: task.tag_ids?.map((id) => tagsById.get(id)).filter(Boolean),
    onEdit,
    onDelete: actions.remove,
  })
  const active = activeId ? taskById.get(activeId) : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDrag(null)}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable:
            'To pick up a task, press Space. Use the arrow keys to move it, Space or Enter to drop it, or Escape to cancel. Press Enter to open it.',
        },
      }}
    >
      <div className="-mx-4 flex gap-3.5 overflow-x-auto px-4 pb-4 md:-mx-9 md:px-9">
        {statuses.map((status) => (
          <BoardColumn
            key={status}
            status={status}
            tasks={items[status].map((id) => taskById.get(id)).filter(Boolean)}
            highlighted={activeId != null && drag?.overStatus === status}
            cardProps={cardProps}
            onAdd={() => {
              if (!isGlobal) return true
              onCreate(status)
              return false
            }}
            onQuickAdd={(title) => quickAdd(status, title)}
            footer={
              status === 'done' &&
              windowed && (
                <p className="px-2 text-xs text-muted-foreground">
                  Last {DONE_WINDOW_DAYS} days ·{' '}
                  <button
                    type="button"
                    onClick={onShowAll}
                    className="font-medium text-foreground underline-offset-3 hover:underline"
                  >
                    Show all
                  </button>
                </p>
              )
            }
          />
        ))}
      </div>

      <DragOverlay dropAnimation={DROP_ANIMATION}>
        {active && (
          <motion.div {...LIFT}>
            <BoardCard
              task={active}
              space={spaceById.get(active.space_id)}
              showSpace={isGlobal}
              tags={active.tag_ids?.map((id) => tagsById.get(id)).filter(Boolean)}
              overlay
            />
          </motion.div>
        )}
      </DragOverlay>
    </DndContext>
  )
}

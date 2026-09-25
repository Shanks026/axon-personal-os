import { AnimatePresence, motion } from 'motion/react'
import { useSpace } from '@/context/SpaceContext'
import { listItem, springs } from '@/components/motion/presets'
import { TaskCard } from '@/features/tasks/components/TaskCard'

/** 3-column card grid (design 04a/04b). Cards animate in/out and reflow with `layout`. */
export function TaskGrid({ tasks, actions, tagsById, progressByTask, onEdit, onOpen }) {
  const { isGlobal, spaceById } = useSpace()
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      <AnimatePresence initial={false}>
        {tasks.map((task) => (
          <motion.div
            key={task.id}
            layout
            variants={listItem}
            initial="initial"
            animate="animate"
            exit={{ opacity: 0, scale: 0.98 }}
            transition={springs.snappy}
          >
            <TaskCard
              task={task}
              space={spaceById.get(task.space_id)}
              showSpace={isGlobal}
              tags={task.tag_ids?.map((id) => tagsById.get(id)).filter(Boolean)}
              progress={progressByTask?.get(task.id)}
              onEdit={onEdit}
              onOpen={onOpen}
              onSetField={actions.setField}
              onDelete={actions.remove}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

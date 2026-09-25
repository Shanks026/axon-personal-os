import { ChevronRight } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useSpace } from '@/context/SpaceContext'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { listItem, springs } from '@/components/motion/presets'
import { cn } from '@/lib/utils'
import { TaskCard } from '@/features/tasks/components/TaskCard'
import { TaskStatusIcon } from '@/features/tasks/components/TaskPills'
import { TaskRow } from '@/features/tasks/components/TaskRow'
import { TASK_STATUS_MAP } from '@/features/tasks/constants'
import { groupTasksByStatus } from '@/features/tasks/utils'

/** 3-column card grid (design 04a/04b). Cards animate in/out and reflow with `layout`. */
export function TaskGrid({ tasks, actions, tagsById, progressByTask, onEdit }) {
  const { spaceById } = useSpace()
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
              tags={task.tag_ids?.map((id) => tagsById.get(id)).filter(Boolean)}
              progress={progressByTask?.get(task.id)}
              onEdit={onEdit}
              onSetField={actions.setField}
              onDelete={actions.remove}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

/** Status-grouped list (the dense view). Group collapse persists per device. */
export function TaskList({
  tasks,
  actions,
  tagsById,
  progressByTask,
  onEdit,
  windowed,
  onShowAllCompleted,
}) {
  const { isGlobal, spaceById } = useSpace()
  const [collapsed, setCollapsed] = useLocalStorage('axon:tasks:collapsed', ['cancelled'])
  const groups = groupTasksByStatus(tasks).filter((g) => g.tasks.length > 0)

  const toggle = (status) =>
    setCollapsed((c) => (c.includes(status) ? c.filter((s) => s !== status) : [...c, status]))

  return (
    <div className="overflow-hidden rounded-xl border">
      {groups.map(({ status, tasks: groupTasks }) => {
        const open = !collapsed.includes(status)
        return (
          <section key={status}>
            <button
              type="button"
              onClick={() => toggle(status)}
              aria-expanded={open}
              className="flex h-9 w-full items-center gap-2 border-b bg-muted/60 px-3 text-left font-medium outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            >
              <ChevronRight
                className={cn('size-3.5 text-faint transition-transform', open && 'rotate-90')}
                aria-hidden
              />
              <TaskStatusIcon status={status} />
              {TASK_STATUS_MAP[status].label}
              <span className="font-mono text-xs font-normal text-faint">{groupTasks.length}</span>
            </button>
            <AnimatePresence initial={false}>
              {open && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={springs.gentle}
                  className="overflow-hidden"
                >
                  <AnimatePresence initial={false}>
                    {groupTasks.map((task) => (
                      <motion.div
                        key={task.id}
                        layout
                        variants={listItem}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                      >
                        <TaskRow
                          task={task}
                          space={spaceById.get(task.space_id)}
                          showSpace={isGlobal}
                          tags={task.tag_ids?.map((id) => tagsById.get(id)).filter(Boolean)}
                          progress={progressByTask?.get(task.id)}
                          onEdit={onEdit}
                          onSetField={actions.setField}
                          onDelete={actions.remove}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {status === 'done' && windowed && (
                    <p className="flex h-9 items-center gap-1.5 border-b px-3 text-xs text-muted-foreground">
                      Showing the last 30 days ·
                      <button
                        type="button"
                        onClick={onShowAllCompleted}
                        className="font-medium text-foreground underline-offset-3 hover:underline"
                      >
                        Show all
                      </button>
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        )
      })}
    </div>
  )
}

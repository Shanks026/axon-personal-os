import { ChevronRight } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { springs } from '@/components/motion/presets'
import { AnimatedList } from '@/components/motion/AnimatedList'
import { SortableTodoList } from '@/features/todos/components/SortableTodoList'
import { TodoItem } from '@/features/todos/components/TodoItem'

/**
 * One group section (design: Todos.dc.html — a coloured label, a mono count, a border-b header).
 * Only Done is collapsible (controlled, so `useHighlightTodo` can force it open) and it is the
 * only group that isn't drag-sortable.
 */
export function TodoGroup({
  group,
  todos,
  showSpace,
  onEdit,
  flashId,
  collapsed,
  onToggleCollapsed,
}) {
  const collapsible = typeof onToggleCollapsed === 'function'
  const open = !collapsible || !collapsed
  if (todos.length === 0 && !group.emptyHint) return null

  return (
    <section className="mt-7 first:mt-0">
      <button
        type="button"
        onClick={onToggleCollapsed}
        disabled={!collapsible}
        aria-expanded={collapsible ? open : undefined}
        className={cn(
          'flex h-8 w-full items-center gap-2 border-b px-1 text-left font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
          !collapsible && 'cursor-default',
        )}
      >
        {collapsible && (
          <ChevronRight
            className={cn('size-3.5 text-faint transition-transform', open && 'rotate-90')}
            aria-hidden
          />
        )}
        <span style={{ color: group.tone }}>{group.label}</span>
        <span className="font-mono text-xs font-normal text-faint">{todos.length}</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={collapsible ? { height: 0, opacity: 0 } : false}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={springs.gentle}
            className="overflow-hidden"
          >
            {todos.length === 0 ? (
              <p className="flex h-10 items-center px-1 text-muted-foreground">{group.emptyHint}</p>
            ) : group.key === 'done' ? (
              <AnimatedList
                items={todos}
                getKey={(t) => t.id}
                renderItem={(t) => (
                  <TodoItem
                    todo={t}
                    showSpace={showSpace}
                    onEdit={onEdit}
                    flash={flashId === t.id}
                  />
                )}
              />
            ) : (
              <SortableTodoList
                todos={todos}
                renderItem={(t, dragHandleProps) => (
                  <TodoItem
                    todo={t}
                    showSpace={showSpace}
                    onEdit={onEdit}
                    flash={flashId === t.id}
                    dragHandleProps={dragHandleProps}
                  />
                )}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

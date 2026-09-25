import { motion } from 'motion/react'
import { springs } from '@/components/motion/presets'
import { cn } from '@/lib/utils'
import { TASK_TABS } from '@/features/tasks/constants'

/** Underlined tab bar with counts (design 04a). The underline slides between tabs. */
export function TaskTabs({ value, counts, onChange }) {
  return (
    <div
      role="tablist"
      aria-label="Task views"
      className="flex scrollbar-none gap-6 overflow-x-auto border-b"
    >
      {TASK_TABS.map((tab) => {
        const selected = tab.value === value
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.value)}
            className={cn(
              'relative flex h-10 shrink-0 items-center gap-1.75 text-sm whitespace-nowrap transition-colors outline-none focus-visible:text-foreground',
              selected
                ? 'font-medium text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
            <span className="font-mono text-xs text-faint tabular-nums">
              {counts[tab.value] ?? 0}
            </span>
            {selected && (
              <motion.span
                layoutId="task-tab-underline"
                transition={springs.snappy}
                className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-foreground"
              />
            )}
          </button>
        )
      })}
    </div>
  )
}

import { AnimatePresence, motion } from 'motion/react'
import { listItem } from '@/components/motion/presets'

/**
 * Animates items entering, leaving and reordering. First paint does not animate.
 * @param {{ items: any[], getKey: (item) => string, renderItem: (item) => React.ReactNode, className?: string, itemClassName?: string }} props
 */
export function AnimatedList({ items, getKey, renderItem, className, itemClassName }) {
  return (
    <div className={className}>
      <AnimatePresence initial={false}>
        {items.map((item) => (
          <motion.div
            key={getKey(item)}
            layout
            variants={listItem}
            initial="initial"
            animate="animate"
            exit="exit"
            className={itemClassName}
          >
            {renderItem(item)}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

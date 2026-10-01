import { MoveRight, Trash2, X } from 'lucide-react'
import { motion } from 'motion/react'
import { slideUp } from '@/components/motion/presets'
import { Button } from '@/components/ui/button'
import { MoveToSpaceMenu } from '@/features/inbox/components/MoveToSpaceMenu'

/**
 * The bulk bar under the inbox list while items are picked: "3 selected · Move to… · Discard ·
 * Clear". It slides up from the bottom of the page column (sticky). `moveOpen` lets M open its
 * move menu.
 */
export function InboxBulkBar({ count, onMove, onDiscard, onClear, moveOpen, onMoveOpenChange }) {
  return (
    <motion.div
      variants={slideUp}
      initial="initial"
      animate="animate"
      exit="exit"
      className="sticky bottom-4 z-10 mt-4 flex items-center gap-2 rounded-xl border bg-popover px-3 py-2 shadow-md"
      role="region"
      aria-label="Bulk actions"
    >
      <span className="px-1 font-medium tabular-nums">{count} selected</span>
      <div className="flex-1" />
      <MoveToSpaceMenu onMove={onMove} open={moveOpen} onOpenChange={onMoveOpenChange}>
        <Button variant="outline" size="sm">
          <MoveRight />
          Move to…
        </Button>
      </MoveToSpaceMenu>
      <Button variant="destructive" size="sm" onClick={onDiscard}>
        <Trash2 />
        Discard
      </Button>
      <Button variant="ghost" size="icon-sm" onClick={onClear} aria-label="Clear selection">
        <X />
      </Button>
    </motion.div>
  )
}

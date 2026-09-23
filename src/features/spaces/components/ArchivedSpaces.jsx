import { useState } from 'react'
import { Archive, ChevronRight } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { springs } from '@/components/motion/presets'
import { cn } from '@/lib/utils'
import { SpaceCard } from '@/features/spaces/components/SpaceCard'

/** Collapsed "Archived N" row (design 02a) that expands into a grid of muted cards. */
export function ArchivedSpaces({ spaces, cardProps }) {
  const [open, setOpen] = useState(false)
  if (!spaces.length) return null

  return (
    <section className="mt-8 border-t pt-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-md text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ChevronRight
          className={cn('size-3.5 transition-transform duration-(--dur-fast)', open && 'rotate-90')}
          aria-hidden
        />
        <Archive className="size-3.5" aria-hidden />
        <span className="font-medium">Archived</span>
        <span className="font-mono text-xs text-faint">{spaces.length}</span>
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
            <div className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2 lg:grid-cols-3">
              {spaces.map((space) => (
                <SpaceCard key={space.id} space={space} archived {...cardProps(space)} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

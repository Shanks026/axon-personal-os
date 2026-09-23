import { Briefcase, Layers, Leaf, Plus } from 'lucide-react'
import { motion } from 'motion/react'
import { slideUp, springs } from '@/components/motion/presets'
import { hueVar } from '@/lib/tint'
import { Button } from '@/components/ui/button'

const GHOSTS = [
  { Icon: Briefcase, color: hueVar('blue'), tilt: -8 },
  { Icon: Layers, color: 'var(--foreground)', tilt: 0 },
  { Icon: Leaf, color: hueVar('green'), tilt: 8 },
]

/** First-run hero (design 02b): three tilted ghost tiles, one line of why, one action. */
export function SpacesEmptyState({ onCreate }) {
  return (
    <motion.div
      variants={slideUp}
      initial="initial"
      animate="animate"
      className="flex max-w-110 flex-col items-center text-center"
    >
      <div className="mb-7 flex gap-2.5">
        {GHOSTS.map(({ Icon, color, tilt }, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, y: 12, rotate: 0 }}
            animate={{ opacity: 1, y: tilt ? 6 : 0, rotate: tilt }}
            transition={{ ...springs.gentle, delay: 0.08 + i * 0.06 }}
            className="flex size-13 items-center justify-center rounded-2xl border bg-card"
            style={{ color }}
            aria-hidden
          >
            <Icon className="size-5.5" />
          </motion.span>
        ))}
      </div>
      <h1 className="text-3xl font-semibold tracking-tight">Create your first space</h1>
      <p className="mt-2.5 text-base text-muted-foreground">
        Spaces keep work and life separate. Global shows everything.
      </p>
      <Button size="lg" className="mt-7 h-9.5" onClick={onCreate}>
        <Plus />
        Create a space
      </Button>
    </motion.div>
  )
}

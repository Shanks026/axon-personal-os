import { CircleCheckBig } from 'lucide-react'
import { motion } from 'motion/react'
import { springs } from '@/components/motion/presets'
import { ShortcutKeys } from '@/components/shared/ShortcutKeys'
import { Button } from '@/components/ui/button'

/**
 * The empty inbox (design delta): a check that pops in, "Inbox zero", how many things were
 * triaged today, and Quick capture.
 */
export function InboxZero({ triagedToday, onCapture }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-border-strong px-6 py-14 text-center">
      <motion.span
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={springs.snappy}
        className="flex size-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
      >
        <CircleCheckBig className="size-5" aria-hidden />
      </motion.span>
      <h3 className="mt-4 text-base font-semibold">Inbox zero</h3>
      <p className="mt-1 text-muted-foreground">
        {triagedToday > 0
          ? `You triaged ${triagedToday} ${triagedToday === 1 ? 'thing' : 'things'} today.`
          : 'Everything is sorted.'}{' '}
        Capture anything with <ShortcutKeys id="capture.open" className="align-middle" />.
      </p>
      <Button variant="outline" className="mt-5" onClick={onCapture}>
        Quick capture
      </Button>
    </div>
  )
}

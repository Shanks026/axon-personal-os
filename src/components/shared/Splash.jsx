import { motion } from 'motion/react'
import { progressSweep } from '@/components/motion/presets'
import { AxonMark } from '@/components/shared/AxonMark'

/** Full-screen neutral loading state (design 17b). Never redirects; just waits. */
export function Splash({ label = 'Syncing your spaces…' }) {
  return (
    <div
      className="flex min-h-svh flex-col items-center justify-center bg-background"
      role="status"
      aria-live="polite"
    >
      <AxonMark className="size-12 rounded-2xl" />
      <div className="mt-7 h-0.75 w-30 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full w-2/5 rounded-full bg-foreground"
          variants={progressSweep}
          initial="initial"
          animate="animate"
        />
      </div>
      <p className="mt-3.5 font-mono text-small text-faint">{label}</p>
    </div>
  )
}

import { motion } from 'motion/react'
import { slideUp } from '@/components/motion/presets'
import { AxonMark } from '@/components/shared/AxonMark'
import { hueVar } from '@/lib/tint'

const SAMPLE_SPACES = [
  { name: 'THMP', color: 'blue' },
  { name: 'Personal', color: 'green' },
  { name: 'Side projects', color: 'violet' },
]

/** Split auth layout (design 01a/01b): brand panel on the left, a 360px form column on the right. */
export function AuthLayout({ children }) {
  return (
    <div className="flex min-h-svh bg-background">
      <aside className="hidden w-11/24 shrink-0 flex-col border-r bg-sidebar px-14 py-11 md:flex">
        <div className="flex items-center gap-2.5">
          <AxonMark className="size-6.5" />
          <span className="text-lg font-semibold tracking-tight">Axon</span>
        </div>
        <div className="flex-1" />
        <h2 className="max-w-110 text-4xl leading-tight font-semibold tracking-tight text-pretty">
          Log the work.
          <br />
          The quarter writes itself.
        </h2>
        <p className="mt-4 max-w-100 text-base leading-relaxed text-muted-foreground">
          Tasks, notes, a daily log and your calendar, organised by space and rolled up into a clean
          report every fiscal quarter.
        </p>
        <div className="mt-9 flex flex-wrap gap-2">
          {SAMPLE_SPACES.map((s) => (
            <span
              key={s.name}
              className="flex h-7 items-center gap-1.5 rounded-lg border bg-card px-2.5 text-muted-foreground"
            >
              <span className="size-1.75 rounded-full" style={{ background: hueVar(s.color) }} />
              {s.name}
            </span>
          ))}
        </div>
        <div className="flex-1" />
        <p className="font-mono text-xs text-faint">Private by default · single user</p>
      </aside>

      <main className="flex flex-1 items-center justify-center p-6 md:p-10">
        <motion.div
          variants={slideUp}
          initial="initial"
          animate="animate"
          className="w-full max-w-90"
        >
          <div className="mb-8 flex items-center gap-2.5 md:hidden">
            <AxonMark className="size-6.5" />
            <span className="text-lg font-semibold tracking-tight">Axon</span>
          </div>
          {children}
        </motion.div>
      </main>
    </div>
  )
}

/** Title + subtitle block used at the top of every auth form. */
export function AuthHeading({ title, description }) {
  return (
    <div className="mb-7">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {description && <p className="mt-1.5 text-muted-foreground">{description}</p>}
    </div>
  )
}

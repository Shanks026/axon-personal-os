import { motion } from 'motion/react'
import { slideUp } from '@/components/motion/presets'

/** Full-page status message (design 17b): big mono code, title, reason, optional trace, actions. */
export function ErrorPage({ code, title, description, trace, actions }) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-background p-10 text-center">
      <motion.div
        variants={slideUp}
        initial="initial"
        animate="animate"
        className="flex flex-col items-center"
      >
        <p className="font-mono text-8xl leading-none font-medium tracking-tighter text-border-strong">
          {code}
        </p>
        <h1 className="mt-5 text-h2">{title}</h1>
        {description && (
          <p className="mt-2 max-w-100 text-h3 font-normal text-muted-foreground">{description}</p>
        )}
        {trace && (
          <p className="mt-4 rounded-md border bg-muted px-3 py-2 font-mono text-small text-muted-foreground">
            {trace}
          </p>
        )}
        {actions && <div className="mt-6 flex gap-2">{actions}</div>}
      </motion.div>
    </main>
  )
}

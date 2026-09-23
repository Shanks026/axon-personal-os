import { useEffect, useState } from 'react'
import { Check, Mail } from 'lucide-react'
import { motion } from 'motion/react'
import { scaleIn } from '@/components/motion/presets'
import { Button } from '@/components/ui/button'

const RESEND_SECONDS = 60

/** "Check your inbox" confirmation (design 01b) with a resend countdown. */
export function CheckInbox({ email, message, onResend, resendPending, footer }) {
  const [left, setLeft] = useState(RESEND_SECONDS)

  useEffect(() => {
    if (left <= 0) return undefined
    const t = setTimeout(() => setLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [left])

  const mmss = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`

  return (
    <div className="flex flex-col items-center text-center">
      <motion.div
        variants={scaleIn}
        initial="initial"
        animate="animate"
        className="relative flex size-16 items-center justify-center rounded-2xl border bg-card shadow-sm"
      >
        <Mail className="size-6.5" strokeWidth={1.5} aria-hidden />
        <span className="absolute -top-1.5 -right-1.5 flex size-5.5 items-center justify-center rounded-full border-2 border-background bg-ok text-white">
          <Check className="size-3" strokeWidth={3} aria-hidden />
        </span>
      </motion.div>
      <h1 className="mt-5 text-xl font-semibold tracking-tight">Check your inbox</h1>
      <p className="mt-2 leading-relaxed text-muted-foreground">
        {message ?? 'We sent a link to'}{' '}
        <span className="font-medium text-foreground">{email}</span>.
      </p>
      {onResend && (
        <p className="mt-6 text-xs text-faint">
          Didn’t get it?{' '}
          {left > 0 ? (
            <span className="font-mono text-muted-foreground">Resend in {mmss}</span>
          ) : (
            <Button
              variant="link"
              size="xs"
              className="h-auto p-0 text-xs"
              disabled={resendPending}
              onClick={() => {
                onResend()
                setLeft(RESEND_SECONDS)
              }}
            >
              Resend
            </Button>
          )}
        </p>
      )}
      {footer && <div className="mt-6">{footer}</div>}
    </div>
  )
}

import { motion } from 'motion/react'
import { pageTransition } from '@/components/motion/presets'

export function PageTransition({ className, children }) {
  return (
    <motion.div
      className={className}
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {children}
    </motion.div>
  )
}

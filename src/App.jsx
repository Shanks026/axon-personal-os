import { lazy, Suspense } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'motion/react'
import { RouterProvider } from 'react-router'
import { queryClient } from '@/lib/queryClient'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { router as appRouter } from '@/routes/router'

const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() =>
      import('@tanstack/react-query-devtools').then((m) => ({ default: m.ReactQueryDevtools })),
    )
  : () => null

/** Providers only. Feature 02 adds AuthProvider inside QueryClientProvider. */
export default function App({ router = appRouter }) {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <MotionConfig reducedMotion="user">
          <TooltipProvider delayDuration={300}>
            <RouterProvider router={router} />
            <Toaster position="bottom-right" />
          </TooltipProvider>
        </MotionConfig>
        <Suspense>
          <ReactQueryDevtools buttonPosition="bottom-left" />
        </Suspense>
      </QueryClientProvider>
    </ThemeProvider>
  )
}

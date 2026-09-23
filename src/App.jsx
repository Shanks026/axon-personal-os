import { lazy, Suspense } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'motion/react'
import { RouterProvider } from 'react-router'
import { queryClient } from '@/lib/queryClient'
import { AuthProvider } from '@/context/AuthContext'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ProfileThemeSync } from '@/features/settings/components/ProfileThemeSync'
import { router as appRouter } from '@/routes/router'

const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() =>
      import('@tanstack/react-query-devtools').then((m) => ({ default: m.ReactQueryDevtools })),
    )
  : () => null

/** Providers only. */
export default function App({ router = appRouter }) {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ProfileThemeSync />
          <MotionConfig reducedMotion="user">
            <TooltipProvider delayDuration={300}>
              <RouterProvider router={router} />
              <Toaster position="bottom-right" />
            </TooltipProvider>
          </MotionConfig>
        </AuthProvider>
        <Suspense>
          <ReactQueryDevtools buttonPosition="bottom-left" />
        </Suspense>
      </QueryClientProvider>
    </ThemeProvider>
  )
}

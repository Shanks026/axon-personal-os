import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { Outlet, useLocation, useMatch } from 'react-router'
import { GLOBAL_SLUG } from '@/lib/paths'
import { SpaceProvider } from '@/context/SpaceContext'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageHeaderProvider } from '@/components/layout/PageHeaderContext'
import { pageTransition } from '@/components/motion/presets'
import { ErrorState } from '@/components/shared/ErrorState'
import { SidebarProvider } from '@/components/ui/sidebar'
import { useMyProfile } from '@/features/auth/api'
import { useSpaces } from '@/features/spaces/api'
import { splitSpaces } from '@/features/spaces/utils'

// Sidebar 16rem (shadcn's standard; the user tried 16.5 and 15.5 and settled here). Rail: shadcn's 3rem.
const SIDEBAR_WIDTHS = { '--sidebar-width': '16rem', '--sidebar-width-icon': '3rem' }

/**
 * The one persistent frame for every signed-in screen (/spaces, /settings, /s/*), modelled on
 * Tercero's AppShell. It stays mounted across navigation, so nothing flashes:
 * - First load waits (blank) until spaces and the profile are known; after that it never blanks.
 * - The sidebar slot only fills inside a real space; other screens use the full width.
 * - The content column is the only scroll container (fixed height, stable gutter), so the window
 *   never gains or loses a scrollbar, and it scrolls back to the top on every navigation.
 */
export function AppShell() {
  const { pathname } = useLocation()
  const match = useMatch('/s/:spaceSlug/*')
  const spaceSlug = match?.params.spaceSlug
  const { data: spaces, error, refetch } = useSpaces()
  const { isPending: profilePending } = useMyProfile()
  const [open, setOpen] = useLocalStorage('axon:sidebar-open', true)
  const scrollRef = useRef(null)

  // Latch: once shown, background refetches can never swap the shell for a blank screen.
  const [shown, setShown] = useState(false)
  if (!shown && spaces && !profilePending) setShown(true)

  const { active } = splitSpaces(spaces)
  const space = active.find((s) => s.slug === spaceSlug)
  const inSpace = !!spaceSlug && (spaceSlug === GLOBAL_SLUG ? active.length > 0 : !!space)
  const color = space?.color ?? 'slate'

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [pathname])

  // The accent lives on <html> so portalled menus and dialogs pick it up; @property cross-fades it.
  useEffect(() => {
    const root = document.documentElement
    root.dataset.spaceColor = color
    return () => {
      delete root.dataset.spaceColor
    }
  }, [color])

  if (!shown) {
    if (error) {
      return (
        <main className="flex h-svh items-center justify-center bg-background p-6">
          <ErrorState error={error} onRetry={refetch} title="Couldn’t load your spaces" />
        </main>
      )
    }
    return <div className="h-svh bg-background" aria-busy="true" />
  }

  return (
    <SpaceProvider spaceSlug={spaceSlug} spaces={spaces ?? []}>
      <PageHeaderProvider>
        <SidebarProvider open={open} onOpenChange={setOpen} style={SIDEBAR_WIDTHS}>
          {inSpace && <AppSidebar />}
          <div className="flex h-svh min-w-0 flex-1 flex-col">
            {/* Outside the scroll area, so its border spans the full width (no gutter gap). */}
            {inSpace && <PageHeader />}
            <div
              ref={scrollRef}
              className="relative flex min-h-0 flex-1 scrollbar-stable flex-col overflow-x-hidden overflow-y-auto"
            >
              <motion.main
                key={pathname}
                variants={pageTransition}
                initial="initial"
                animate="animate"
                className="flex flex-1 flex-col"
              >
                <Outlet />
              </motion.main>
            </div>
          </div>
        </SidebarProvider>
      </PageHeaderProvider>
    </SpaceProvider>
  )
}

import { useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useLocation, useOutlet } from 'react-router'
import { useSpace } from '@/context/SpaceContext'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { PageHeader } from '@/components/layout/PageHeader'
import { PageHeaderProvider } from '@/components/layout/PageHeaderContext'
import { pageTransition } from '@/components/motion/presets'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'

const SIDEBAR_WIDTHS = { '--sidebar-width': '15rem', '--sidebar-width-icon': '3.5rem' }

/**
 * The app shell for /s/:spaceSlug/*: sidebar (240px, 56px rail), 48px header, and the page with
 * a fade/rise transition. Pages never animate themselves; the header and sidebar never animate.
 */
export function AppLayout() {
  const { space } = useSpace()
  const { pathname } = useLocation()
  const outlet = useOutlet()
  const [open, setOpen] = useLocalStorage('axon:sidebar-open', true)
  const color = space?.color ?? 'slate'

  // The accent lives on <html> so portalled menus and dialogs pick it up; @property cross-fades it.
  useEffect(() => {
    const root = document.documentElement
    root.dataset.spaceColor = color
    return () => {
      delete root.dataset.spaceColor
    }
  }, [color])

  return (
    <SidebarProvider open={open} onOpenChange={setOpen} style={SIDEBAR_WIDTHS}>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <PageHeaderProvider>
          <PageHeader />
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pathname}
              variants={pageTransition}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex min-h-0 flex-1 flex-col"
            >
              {outlet}
            </motion.div>
          </AnimatePresence>
        </PageHeaderProvider>
      </SidebarInset>
    </SidebarProvider>
  )
}

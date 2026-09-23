import { ArrowLeft } from 'lucide-react'
import { useHotkeys } from 'react-hotkeys-hook'
import { Link, NavLink, useNavigate } from 'react-router'
import { paths } from '@/lib/paths'
import { PageTransition } from '@/components/motion/PageTransition'
import { SaveIndicator } from '@/components/shared/SaveIndicator'
import { cn } from '@/lib/utils'
import { SETTINGS_SECTIONS } from '@/features/settings/constants'
import { useProfileSaveStatus } from '@/features/settings/hooks/useProfileSaveStatus'

/**
 * Full-screen settings (design 15a): 240px nav with "Back" (Esc) and a 640px content column.
 * Feature 03 points "Back" at the last used space; until then it returns to /spaces.
 */
export function SettingsLayout({ section, title, description, children }) {
  const navigate = useNavigate()
  const saveStatus = useProfileSaveStatus()
  useHotkeys('esc', () => navigate(paths.spaces()), { enableOnFormTags: false })

  return (
    <div className="flex min-h-svh bg-background">
      <aside className="hidden w-60 shrink-0 flex-col gap-0.5 border-r bg-sidebar px-2 py-3.5 md:flex">
        <Link
          to={paths.spaces()}
          className="mb-3.5 flex h-8 items-center gap-2 rounded-md px-2.5 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          <span className="flex-1">Back to spaces</span>
          <kbd className="font-mono text-xs text-faint">Esc</kbd>
        </Link>
        <p className="px-2.5 pb-1.5 text-xs font-medium text-faint">Settings</p>
        {SETTINGS_SECTIONS.map(({ id, label, icon: Icon }) => (
          <NavLink
            key={id}
            to={paths.settings(id)}
            className={cn(
              'flex h-8 items-center gap-2.5 rounded-md px-2.5 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground',
              section === id && 'bg-sidebar-accent font-medium text-foreground',
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </NavLink>
        ))}
      </aside>

      <main className="min-w-0 flex-1 px-4 py-10 md:px-10 md:py-14">
        <div className="mx-auto max-w-160">
          <nav className="mb-6 flex gap-2 md:hidden" aria-label="Settings sections">
            <Link to={paths.spaces()} className="text-muted-foreground" aria-label="Back to spaces">
              <ArrowLeft className="size-4" />
            </Link>
            {SETTINGS_SECTIONS.map(({ id, label }) => (
              <NavLink
                key={id}
                to={paths.settings(id)}
                className={cn(
                  'text-muted-foreground',
                  section === id && 'font-medium text-foreground',
                )}
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <PageTransition key={section}>
            <header className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                {description && <p className="mt-1.5 text-muted-foreground">{description}</p>}
              </div>
              <SaveIndicator status={saveStatus} className="mt-2" />
            </header>
            <div className="mt-7">{children}</div>
          </PageTransition>
        </div>
      </main>
    </div>
  )
}

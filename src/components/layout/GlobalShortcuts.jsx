import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { GLOBAL_SLUG } from '@/lib/paths'
import { useSpace } from '@/context/SpaceContext'
import { useGlobalDialog } from '@/hooks/useGlobalDialog'
import { useShortcut } from '@/hooks/useShortcut'
import { useTheme } from '@/components/theme/useTheme'
import { useSidebar } from '@/components/ui/sidebar'
import { useSpacePaths } from '@/features/spaces/hooks/useSpacePaths'
import { useSwitchSpace } from '@/features/spaces/hooks/useSwitchSpace'

/**
 * The app-wide keys (`lib/shortcuts.js`: General, Create, Navigate), bound once inside a space.
 * Rendered inside `SidebarProvider` so it can toggle the sidebar; renders nothing.
 * `onPalette(page)` toggles the command palette (`'root'` or `'spaces'`); `onHelp()` opens the
 * shortcuts dialog.
 */
export function GlobalShortcuts({ onPalette, onHelp }) {
  const navigate = useNavigate()
  const p = useSpacePaths()
  const { activeSpaces } = useSpace()
  const { open: openDialog } = useGlobalDialog()
  const switchSpace = useSwitchSpace()
  const { toggleSidebar } = useSidebar()
  const { resolvedTheme, setTheme } = useTheme()

  useShortcut('palette.open', (e) => {
    // In the rich editor, Mod+K with text selected opens its link field (Feature 06).
    const selection = window.getSelection()
    if (e.target?.isContentEditable && selection && !selection.isCollapsed) return
    onPalette('root')
  })
  useShortcut('space.switch', () => onPalette('spaces'))
  useShortcut('space.byNumber', (e) => {
    const n = Number(/\d$/.exec(e.code ?? '')?.[0])
    if (n === 0) switchSpace(GLOBAL_SLUG)
    else if (activeSpaces[n - 1]) switchSpace(activeSpaces[n - 1].slug)
  })
  useShortcut('sidebar.toggle', toggleSidebar)
  useShortcut('theme.toggle', () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark'))
  useShortcut('capture.open', () =>
    toast('Quick capture arrives with Feature 13', { description: 'It’s on the roadmap.' }),
  )
  useShortcut('help.open', onHelp)

  useShortcut('create.task', () => openDialog('task'))
  useShortcut('create.todo', () => openDialog('todo'))
  useShortcut('create.note', () => openDialog('note'))
  useShortcut('create.event', () => openDialog('event'))

  useShortcut('go.dashboard', () => navigate(p.dashboard()))
  useShortcut('go.inbox', () => navigate(p.inbox()))
  useShortcut('go.tasks', () => navigate(p.tasks()))
  useShortcut('go.todos', () => navigate(p.todos()))
  useShortcut('go.notes', () => navigate(p.notes()))
  useShortcut('go.journal', () => navigate(p.journal()))
  useShortcut('go.calendar', () => navigate(p.calendar()))
  useShortcut('go.reports', () => navigate(p.reports()))

  return null
}

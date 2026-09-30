import { useMemo } from 'react'
import {
  CalendarPlus,
  FilePlus,
  Inbox,
  Keyboard,
  Layers,
  ListPlus,
  Moon,
  Settings,
  SquarePen,
  SquarePlus,
  Sun,
  Trash2,
} from 'lucide-react'
import { useNavigate } from 'react-router'
import { GLOBAL_SLUG, paths } from '@/lib/paths'
import { useSpace } from '@/context/SpaceContext'
import { useGlobalDialog } from '@/hooks/useGlobalDialog'
import { NAV_ITEMS } from '@/components/layout/navItems'
import { useTheme } from '@/components/theme/useTheme'
import { useSpacePaths } from '@/features/spaces/hooks/useSpacePaths'
import { useSwitchSpace } from '@/features/spaces/hooks/useSwitchSpace'

/**
 * The palette's static items, each `{ id, label, icon, keywords?, emoji?, disabled?, hint?, run }`:
 * - `actions`: New task, todo, note or event (through `?new=`), Quick capture (Feature 13, a
 *   disabled stub), toggle theme, settings.
 * - `navigate`: every section of the current scope, plus Trash.
 * - `spaces`: Global, then each active space (keeping the current section).
 */
export function usePaletteActions({ onOpenHelp } = {}) {
  const navigate = useNavigate()
  const p = useSpacePaths()
  const { activeSpaces } = useSpace()
  const { open: openDialog } = useGlobalDialog()
  const switchSpace = useSwitchSpace()
  const { resolvedTheme, setTheme } = useTheme()

  return useMemo(() => {
    const actions = [
      {
        id: 'new-task',
        label: 'New task',
        icon: SquarePlus,
        keywords: 'create add',
        shortcut: 'create.task',
        run: () => openDialog('task'),
      },
      {
        id: 'new-todo',
        label: 'New todo',
        icon: ListPlus,
        keywords: 'create add checkbox',
        shortcut: 'create.todo',
        run: () => openDialog('todo'),
      },
      {
        id: 'new-note',
        label: 'New note',
        icon: FilePlus,
        keywords: 'create add write',
        shortcut: 'create.note',
        run: () => openDialog('note'),
      },
      {
        id: 'new-event',
        label: 'New event',
        icon: CalendarPlus,
        keywords: 'create add meeting calendar',
        shortcut: 'create.event',
        run: () => openDialog('event'),
      },
      {
        id: 'quick-capture',
        label: 'Quick capture',
        icon: SquarePen,
        keywords: 'inbox',
        disabled: true,
        hint: 'Coming with Feature 13',
        run: () => {},
      },
      {
        id: 'toggle-theme',
        label: resolvedTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme',
        icon: resolvedTheme === 'dark' ? Sun : Moon,
        keywords: 'theme dark light mode appearance',
        shortcut: 'theme.toggle',
        run: () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark'),
      },
      {
        id: 'shortcuts',
        label: 'Keyboard shortcuts',
        icon: Keyboard,
        keywords: 'keys hotkeys help',
        shortcut: 'help.open',
        run: () => onOpenHelp?.(),
      },
      {
        id: 'settings',
        label: 'Go to settings',
        icon: Settings,
        keywords: 'preferences profile ai jira',
        run: () => navigate(paths.settings()),
      },
    ]

    const sections = NAV_ITEMS.map((item) => ({
      id: `go-${item.section}`,
      label: item.label,
      icon: item.section === 'inbox' ? Inbox : item.icon,
      keywords: 'go open',
      shortcut: `go.${item.section}`,
      run: () => navigate(p[item.section]()),
    }))
    sections.push({
      id: 'go-trash',
      label: 'Trash',
      icon: Trash2,
      keywords: 'go deleted',
      run: () => navigate(p.trash()),
    })

    const spaces = [
      {
        id: 'space-global',
        label: 'All spaces (Global)',
        icon: Layers,
        keywords: 'switch space global',
        run: () => switchSpace(GLOBAL_SLUG),
      },
      ...activeSpaces.map((s) => ({
        id: `space-${s.id}`,
        label: s.name,
        emoji: s.icon,
        keywords: 'switch space',
        run: () => switchSpace(s.slug),
      })),
    ]

    return { actions, navigate: sections, spaces }
  }, [openDialog, navigate, p, activeSpaces, switchSpace, resolvedTheme, setTheme, onOpenHelp])
}

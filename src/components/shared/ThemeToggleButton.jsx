import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/components/theme/useTheme'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const NEXT = { system: 'light', light: 'dark', dark: 'system' }
const ICON = { system: Monitor, light: Sun, dark: Moon }
const LABEL = { system: 'System theme', light: 'Light theme', dark: 'Dark theme' }

/** Cycles system → light → dark. */
export function ThemeToggleButton({ className }) {
  const { theme, setTheme } = useTheme()
  const Icon = ICON[theme] ?? Monitor
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={className}
          aria-label={`${LABEL[theme]}. Switch theme`}
          onClick={() => setTheme(NEXT[theme] ?? 'system')}
        >
          <Icon />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{LABEL[theme]}</TooltipContent>
    </Tooltip>
  )
}

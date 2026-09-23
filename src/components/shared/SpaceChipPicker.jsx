import { Check, ChevronDown } from 'lucide-react'
import { useSpace } from '@/context/SpaceContext'
import { SpaceIcon } from '@/components/shared/SpaceIcon'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

/**
 * Space chip for create dialogs (design 04f: "THMP ⌄ › New task"). Lists active spaces;
 * `value` / `onChange` are space ids. Defaults and validation belong to the form.
 */
export function SpaceChipPicker({ value, onChange }) {
  const { activeSpaces } = useSpace()
  const current = activeSpaces.find((s) => s.id === value)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex h-6 items-center gap-1.5 rounded-md border border-border-strong bg-muted px-2 text-xs text-foreground outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Space"
      >
        <SpaceIcon icon={current?.icon} size="xs" />
        <span className="max-w-40 truncate">{current?.name ?? 'Pick a space'}</span>
        <ChevronDown className="size-3 text-faint" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {activeSpaces.map((s) => (
          <DropdownMenuItem key={s.id} onSelect={() => onChange(s.id)}>
            <SpaceIcon icon={s.icon} size="sm" />
            <span className="flex-1 truncate">{s.name}</span>
            {s.id === value && <Check className="size-3.5" aria-label="Selected" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

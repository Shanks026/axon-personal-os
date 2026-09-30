import { ShortcutKeys } from '@/components/shared/ShortcutKeys'
import { SpaceIcon } from '@/components/shared/SpaceIcon'
import { CommandItem } from '@/components/ui/command'

/** A static item (action, section or space) as a cmdk row. */
export function PaletteStaticItem({ item, onRun }) {
  const Icon = item.icon
  return (
    <CommandItem value={item.id} disabled={item.disabled} onSelect={() => onRun(item)}>
      {item.emoji ? (
        <SpaceIcon icon={item.emoji} size="xs" />
      ) : (
        Icon && <Icon className="size-4 text-muted-foreground" aria-hidden />
      )}
      <span className="flex-1 truncate">{item.label}</span>
      {item.hint && <span className="text-xs text-faint">{item.hint}</span>}
      {item.shortcut && <ShortcutKeys id={item.shortcut} />}
    </CommandItem>
  )
}

import { shortcutsByGroup } from '@/lib/shortcuts'
import { ShortcutKeys } from '@/components/shared/ShortcutKeys'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

/**
 * Every keyboard shortcut, grouped (`?`, the user menu, the palette). 760px, two columns, no
 * filter input (the design delta). Listed straight from `lib/shortcuts.js`, so it matches the
 * real bindings.
 */
export function ShortcutsHelpDialog({ open, onOpenChange }) {
  const groups = shortcutsByGroup()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-dialog flex-col gap-0 overflow-hidden p-0 will-change-transform sm:max-w-190">
        <div className="shrink-0 px-6 pt-6 pb-4">
          <DialogHeader>
            <DialogTitle>Keyboard shortcuts</DialogTitle>
            <DialogDescription>
              Single keys never fire while you type. While a row is selected, list keys take
              priority (E edits instead of creating an event); Esc clears the selection.
            </DialogDescription>
          </DialogHeader>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
          <div className="columns-1 gap-8 sm:columns-2">
            {groups.map(({ group, items }) => (
              <section key={group} className="mb-5 break-inside-avoid">
                <h3 className="mb-1 text-xs font-medium text-muted-foreground">{group}</h3>
                <ul>
                  {items.map((s) => (
                    <li key={s.id} className="flex h-8 items-center gap-3">
                      <span className="min-w-0 flex-1 truncate">{s.label}</span>
                      <ShortcutKeys id={s.id} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

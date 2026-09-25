import { Kbd } from '@/components/shared/Kbd'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EDITOR_SHORTCUTS } from '@/components/editor/editorShortcuts'

/** The editor's keyboard cheat sheet (`EDITOR_SHORTCUTS`), opened from the note header. */
export function EditorShortcutsDialog({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-dialog overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            Format and move around the editor without the mouse.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 sm:grid-cols-2">
          {EDITOR_SHORTCUTS.map((section) => (
            <section key={section.group}>
              <h3 className="mb-1.5 text-xs font-medium text-muted-foreground">{section.group}</h3>
              <dl className="flex flex-col">
                {section.items.map((item) => (
                  <div key={item.label} className="flex h-8 items-center gap-3">
                    <dt className="flex-1 truncate">{item.label}</dt>
                    <dd className="flex items-center gap-1">
                      {item.keys ? (
                        <Kbd shortcut={item.keys} className="text-muted-foreground" />
                      ) : (
                        <kbd className="font-mono text-xs text-muted-foreground">{item.text}</kbd>
                      )}
                      {item.note && (
                        <span className="font-mono text-xs text-faint">{item.note}</span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

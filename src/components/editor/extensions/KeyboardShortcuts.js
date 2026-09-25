import { Extension } from '@tiptap/react'

/** Event the bubble menu listens for to open its inline link field. */
export const EDIT_LINK_EVENT = 'axon:edit-link'

/** Points Mod-s at `onSave` (or nothing). `RichTextEditor` calls it whenever `onSave` changes. */
export function setSaveHandler(editor, onSave) {
  editor.storage.axonShortcuts.onSave = onSave ?? null
}

/**
 * Editor-level shortcuts that aren't part of a node or mark:
 * - Mod-s calls `editor.storage.axonShortcuts.onSave` (Ctrl+S saves now; `RichTextEditor` keeps
 *   it current) and always returns true, so the browser's "Save page" dialog never opens.
 * - Mod-k opens the bubble menu's link field when text is selected; with no selection it does
 *   nothing, so the command palette (Feature 12) keeps Mod-k everywhere else.
 */
export const KeyboardShortcuts = Extension.create({
  name: 'axonShortcuts',

  addStorage() {
    return { onSave: null }
  },

  addKeyboardShortcuts() {
    return {
      'Mod-s': () => {
        this.storage.onSave?.()
        return true
      },
      'Mod-k': () => {
        if (this.editor.state.selection.empty) return false
        this.editor.emit(EDIT_LINK_EVENT)
        return true
      },
    }
  },
})

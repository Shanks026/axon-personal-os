/**
 * The editor's keyboard shortcuts, grouped for the cheat sheet (`EditorShortcutsDialog`).
 * `keys` use the `Kbd` syntax ("mod+shift+s"); `text` is shown instead for typed triggers.
 */
export const EDITOR_SHORTCUTS = [
  {
    group: 'Formatting',
    items: [
      { label: 'Bold', keys: 'mod+b' },
      { label: 'Italic', keys: 'mod+i' },
      { label: 'Underline', keys: 'mod+u' },
      { label: 'Strikethrough', keys: 'mod+shift+s' },
      { label: 'Inline code', keys: 'mod+e' },
      { label: 'Highlight', keys: 'mod+shift+h' },
      { label: 'Link (with text selected)', keys: 'mod+k' },
    ],
  },
  {
    group: 'Blocks',
    items: [
      { label: 'Heading 1–3', keys: 'mod+alt+1', note: '2, 3' },
      { label: 'Bulleted list', keys: 'mod+shift+8' },
      { label: 'Numbered list', keys: 'mod+shift+7' },
      { label: 'Checklist', keys: 'mod+shift+9' },
      { label: 'Code block', keys: 'mod+alt+c' },
      { label: 'Block menu', text: '/' },
    ],
  },
  {
    group: 'Tables',
    items: [
      { label: 'Next cell', keys: 'tab' },
      { label: 'Previous cell', keys: 'shift+tab' },
    ],
  },
  {
    group: 'Note',
    items: [
      { label: 'Save now', keys: 'mod+s' },
      { label: 'Title → body', keys: 'enter' },
    ],
  },
]

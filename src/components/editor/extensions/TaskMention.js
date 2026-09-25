import { Node, ReactNodeViewRenderer } from '@tiptap/react'
import { PluginKey } from '@tiptap/pm/state'
import Suggestion from '@tiptap/suggestion'
import { toast } from 'sonner'
import { MentionList } from '@/components/editor/MentionList'
import { createSuggestionRenderer } from '@/components/editor/suggestionRenderer'

/** A mention node for a task: `{ id, label }`. */
export const mentionNode = (task) => ({
  type: 'taskMention',
  attrs: { id: task.id, label: task.label ?? task.title },
})

/**
 * Inline task mentions (Feature 07 Phase 3). Typing `[[` or `@` (the user asked for both) opens a
 * task search (spaces allowed in the query); picking a task, or "Create task '…'", inserts an atom chip. The editor
 * never imports feature code: `config` (from `features.taskMentions`) supplies
 * `search(query)`, `create(title)` and the chip's `NodeView`. The node reads as `[[label]]` in
 * plain text and Markdown. `editor.storage.taskMention.config` lets the bubble menu's
 * "Make task" reuse `create`.
 */
export const TaskMention = Node.create({
  name: 'taskMention',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addOptions() {
    return { config: null }
  },

  addStorage() {
    return { config: this.options.config }
  },

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-task-id'),
        renderHTML: (attrs) => ({ 'data-task-id': attrs.id }),
      },
      label: {
        default: '',
        parseHTML: (el) =>
          el.getAttribute('data-label') ?? el.textContent.replace(/^\[\[|\]\]$/g, ''),
        renderHTML: (attrs) => ({ 'data-label': attrs.label }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-task-mention]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return ['span', { 'data-task-mention': '', ...HTMLAttributes }, `[[${node.attrs.label}]]`]
  },

  renderText: ({ node }) => `[[${node.attrs.label}]]`,

  renderMarkdown: (node) => `[[${node.attrs?.label ?? ''}]]`,

  addNodeView() {
    const View = this.options.config?.NodeView
    return View ? ReactNodeViewRenderer(View, { as: 'span' }) : null
  },

  addProseMirrorPlugins() {
    const config = this.options.config
    if (!config) return []
    const editor = this.editor
    const insert = (range, task) =>
      editor
        .chain()
        .focus()
        .insertContentAt(range, [mentionNode(task), { type: 'text', text: ' ' }])
        .run()
    const command = ({ range, props }) => {
      if (!props.create) return insert(range, props)
      // Create first, then put the chip where the trigger and query were.
      config.create(props.create).then(
        (task) => insert(range, task),
        (err) => toast.error(err?.message ?? 'Couldn’t create the task'),
      )
    }
    const shared = {
      editor,
      allowSpaces: true,
      allow: ({ state, range }) => !state.doc.resolve(range.from).parent.type.spec.code,
      items: ({ query }) => config.search(query),
      command,
      render: createSuggestionRenderer(MentionList),
    }
    return [
      // [[ anywhere (the wiki-link habit).
      Suggestion({
        ...shared,
        pluginKey: new PluginKey('taskMention'),
        char: '[[',
        allowedPrefixes: null,
      }),
      // @ only at the start of a word, and a space right after it closes the list, so emails,
      // "@media" or "@tanstack/..." stay plain text.
      Suggestion({
        ...shared,
        pluginKey: new PluginKey('taskMentionAt'),
        char: '@',
        allowedPrefixes: [' ', '(', '['],
        shouldShow: ({ query }) => !query.startsWith(' '),
      }),
    ]
  },
})

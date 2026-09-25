import { Extension } from '@tiptap/react'
import Suggestion from '@tiptap/suggestion'
import { PluginKey } from '@tiptap/pm/state'
import { SlashCommandMenu } from '@/components/editor/SlashCommandMenu'
import { createSuggestionRenderer } from '@/components/editor/suggestionRenderer'
import { filterSlashItems } from '@/components/editor/extensions/slashItems'

/**
 * `/` opens the block menu (after a space or at the start of a line, never in code).
 * `exclude` drops item ids (the compact editor leaves out Heading 1 and Table).
 */
export const SlashCommand = Extension.create({
  name: 'slashCommand',

  addOptions() {
    return { exclude: [] }
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        pluginKey: new PluginKey('slashCommand'),
        char: '/',
        allow: ({ state, range }) => !state.doc.resolve(range.from).parent.type.spec.code,
        items: ({ query }) =>
          filterSlashItems(query).filter((item) => !this.options.exclude.includes(item.id)),
        command: ({ editor, range, props }) => props.command({ editor, range }),
        render: createSuggestionRenderer(SlashCommandMenu),
      }),
    ]
  },
})

import { Extension } from '@tiptap/react'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

const key = new PluginKey('headingTones')

function buildDecorations(doc, tones) {
  const decorations = []
  doc.descendants((node, pos) => {
    if (node.type.name !== 'heading') return
    const tone = tones[node.textContent.trim()]
    if (tone) decorations.push(Decoration.node(pos, pos + node.nodeSize, { 'data-tone': tone }))
    return false
  })
  return DecorationSet.create(doc, decorations)
}

/**
 * Tags headings whose text matches a key of `tones` with `data-tone="<tone>"`, for styling by
 * text (the journal's red "Blockers"). Decorations only: nothing is stored in the doc.
 */
export const HeadingTones = Extension.create({
  name: 'headingTones',

  addOptions() {
    return { tones: {} }
  },

  addProseMirrorPlugins() {
    const { tones } = this.options
    return [
      new Plugin({
        key,
        state: {
          init: (_config, state) => buildDecorations(state.doc, tones),
          apply: (tr, old) => (tr.docChanged ? buildDecorations(tr.doc, tones) : old),
        },
        props: {
          decorations: (state) => key.getState(state),
        },
      }),
    ]
  },
})

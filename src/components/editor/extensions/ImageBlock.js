import Image from '@tiptap/extension-image'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { ImageBlockView } from '@/components/editor/ImageBlockView'

const MARKDOWN_PREFIX = 'axon-image:'

/**
 * Block images stored in the private `attachments` bucket. The doc saves only `path`, `alt`,
 * `width` and `height` (no `src`: signed URLs expire); `ImageBlockView` resolves `path` to a URL.
 * `uploadId` exists only while an upload runs and is stripped before saving.
 * HTML keeps `data-path` (copy-paste between notes works); pasted web images without one are
 * ignored. Markdown writes a stable `![alt](axon-image:{path})` reference.
 */
export const ImageBlock = Image.extend({
  addAttributes() {
    return {
      path: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-path'),
        renderHTML: (attrs) => (attrs.path ? { 'data-path': attrs.path } : {}),
      },
      alt: { default: '' },
      width: {
        default: null,
        parseHTML: (el) => Number(el.getAttribute('width')) || null,
      },
      height: {
        default: null,
        parseHTML: (el) => Number(el.getAttribute('height')) || null,
      },
      uploadId: { default: null, rendered: false },
    }
  },

  parseHTML() {
    return [{ tag: 'img[data-path]' }]
  },

  parseMarkdown: (token, helpers) =>
    helpers.createNode('image', {
      path: token.href?.startsWith(MARKDOWN_PREFIX)
        ? token.href.slice(MARKDOWN_PREFIX.length)
        : null,
      alt: token.text ?? '',
    }),

  renderMarkdown: (node) =>
    `![${node.attrs?.alt ?? ''}](${MARKDOWN_PREFIX}${node.attrs?.path ?? ''})`,

  addNodeView() {
    return ReactNodeViewRenderer(ImageBlockView)
  },
}).configure({ inline: false, allowBase64: false })

import type { NodeViewRenderer } from '@tiptap/core'
import { mergeAttributes, Node } from '@tiptap/core'
import { VueNodeViewRenderer } from '@tiptap/vue-3'
import MentionNode from './MentionNode.vue'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mention: {
      insertMention: (params: { id: string }) => ReturnType
    }
  }
}

export default Node.create({
  name: 'mention',
  group: 'inline',
  inline: true,
  selectable: false,
  atom: true,
  addOptions() {
    return {
      list: [],
    }
  },
  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: element => element.getAttribute('data-id'),
        renderHTML: (attributes) => {
          if (!attributes.id) {
            return {}
          }

          return {
            'data-id': attributes.id,
          }
        },
      },
    }
  },
  parseHTML() {
    return [{
      tag: 'span[data-type="mention"]',
    }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-type': 'mention' })]
  },
  addNodeView(): NodeViewRenderer {
    return VueNodeViewRenderer(MentionNode)
  },
  addCommands(): Partial<any> {
    return {
      insertMention:
        (attributes?: Record<string, any>) =>
          ({ commands }: any) => {
            return commands.insertContent({
              type: this.name,
              attrs: attributes,
            })
          },
    }
  },
})

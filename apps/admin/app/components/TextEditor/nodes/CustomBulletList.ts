import { BulletList } from '@tiptap/extension-list'

export default BulletList.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      level: {
        default: 1,
        parseHTML: (element: HTMLElement) => {
          let level = 1
          // 反显层级
          let parent = element.parentElement?.parentElement
          while (parent && parent.nodeName === 'UL') {
            level++
            parent = parent.parentElement?.parentElement
          }
          return level
        },
        renderHTML: (attributes) => {
          const level = attributes.level
          const listType = ['disc', 'circle', 'square'][(level - 1) % 3]
          return {
            'data-level': attributes.level,
            'style': `list-style-type: ${listType}`,
          }
        },
      },
    }
  },
})

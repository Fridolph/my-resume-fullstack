import { Link } from '@tiptap/extension-link'

export default Link.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      style: {
        default: null,
        parseHTML: element => element.getAttribute('style'),
        renderHTML: (attributes) => {
          return attributes.style
            ? { style: attributes.style }
            : {}
        },
      },
    }
  },
})

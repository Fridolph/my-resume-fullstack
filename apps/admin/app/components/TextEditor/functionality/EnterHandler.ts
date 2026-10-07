import { Extension } from '@tiptap/vue-3'

export default Extension.create({
  name: 'enterHandler',
  addKeyboardShortcuts() {
    return {
      Enter: () => {
        // listItem 采用默认的 tab 行为
        if (this.editor.isActive('listItem')) {
          return false
        }
        return this.editor.commands.splitBlock({ keepMarks: !1 })
      },
    }
  },
})

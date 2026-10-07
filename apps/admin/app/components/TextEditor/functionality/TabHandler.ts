import { Extension } from '@tiptap/vue-3'
import { decreaseIndent } from '~/components/TextEditor/utils'

export default Extension.create({
  name: 'tabHandler',
  addKeyboardShortcuts() {
    return {
      'Tab': () => {
        // listItem 采用默认的 tab 行为
        if (this.editor.isActive('listItem')) {
          // 处理层级编号的逻辑
          nextTick(() => {
            const { selection } = this.editor.state
            const $from = selection.$from

            // 查找当前列表节点
            let currentList = null
            let currentDepth = null

            for (let depth = $from.depth; depth > 0; depth--) {
              const node = $from.node(depth)
              if (node.type.name === 'orderedList' || node.type.name === 'bulletList') {
                currentList = node
                currentDepth = depth
                break
              }
            }

            if (currentList && currentDepth !== null) {
              const currentLevel = currentList.attrs.level || 1

              // 查找父级列表
              let parentLevel = 0
              for (let depth = currentDepth - 1; depth > 0; depth--) {
                const node = $from.node(depth)
                if (node.type.name === 'orderedList' || node.type.name === 'bulletList') {
                  parentLevel = node.attrs.level || 1
                  break
                }
              }

              if (parentLevel > 0 && currentLevel < parentLevel + 1) {
                // 计算新 level
                const newLevel = parentLevel + 1

                // 使用命令更新属性
                this.editor.chain()
                  .focus()
                  .updateAttributes(currentList.type.name, {
                    level: newLevel,
                  })
                  .run()
              }
              else {
                this.editor.commands.insertContent('\t')
              }
            }
          })
          this.editor.chain().sinkListItem('listItem').focus().run()
          return true
        }
        this.editor.commands.insertContent('\t')
        return true // 阻止默认行为
      },
      'Shift-Tab': () => {
        // listItem 采用默认的 tab 行为
        if (this.editor.isActive('listItem')) {
          return false
        }
        decreaseIndent(this.editor as any)
        return true
      },
    }
  },
})

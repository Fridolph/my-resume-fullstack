import type { Editor } from '@tiptap/vue-3'

export function decreaseIndent(editor: Editor) {
  const { from } = editor.state.selection
  const text = editor.state.doc.textBetween(from - 1, from)
  if (text === '\t') {
    editor
      .chain()
      .deleteRange({
        from: from - 1,
        to: from,
      })
      .focus()
      .run()
  }
}

import type { EditorCustomHandlers } from '@nuxt/ui'
import type { Editor } from '@tiptap/vue-3'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Emoji from '@tiptap/extension-emoji'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import { TableKit } from '@tiptap/extension-table'
import TextAlignExtension from '@tiptap/extension-text-align'
import { TextStyleKit } from '@tiptap/extension-text-style'
import css from 'highlight.js/lib/languages/css'
import js from 'highlight.js/lib/languages/javascript'
import ts from 'highlight.js/lib/languages/typescript'
import html from 'highlight.js/lib/languages/xml'
import { all, createLowlight } from 'lowlight'
import { Headings, TextAlign, TextFontFamily } from './contants'
import EnterHandler from './functionality/EnterHandler'
import TabHandler from './functionality/TabHandler'
import CustomLink from './marks/CustomLink'
import CustomBulletList from './nodes/CustomBulletList'
import CustomOrderList from './nodes/CustomOrderList'
import Mention from './nodes/Mention'
import Title from './nodes/Title'
import { decreaseIndent } from './utils'

export default function () {
  const controlType = shallowRef('view')
  const handlers = {
    bold: {
      canExecute: (editor: Editor) => editor.can().toggleBold(),
      execute: (editor: Editor) => editor.chain().focus().toggleBold().run(),
      isActive: (editor: Editor) => editor.isActive('bold'),
      isDisabled: () => controlType.value === 'code',
    },
    italic: {
      canExecute: (editor: Editor) => editor.can().toggleItalic(),
      execute: (editor: Editor) => editor.chain().focus().toggleItalic().run(),
      isActive: (editor: Editor) => editor.isActive('italic'),
      isDisabled: () => controlType.value === 'code',
    },
    underline: {
      canExecute: (editor: Editor) => editor.can().toggleUnderline(),
      execute: (editor: Editor) => editor.chain().focus().toggleUnderline().run(),
      isActive: (editor: Editor) => editor.isActive('underline'),
      isDisabled: () => controlType.value === 'code',
    },
    orderList: {
      canExecute: (editor: Editor) => editor.can().toggleOrderedList(),
      execute: (editor: Editor) => editor.chain().focus().toggleOrderedList().run(),
      isActive: (editor: Editor) => editor.isActive('orderList'),
      isDisabled: () => controlType.value === 'code',
    },
    bulletList: {
      canExecute: (editor: Editor) => editor.can().toggleBulletList(),
      execute: (editor: Editor) => editor.chain().focus().toggleBulletList().run(),
      isActive: (editor: Editor) => editor.isActive('bulletList'),
      isDisabled: () => controlType.value === 'code',
    },
    increase: {
      canExecute: () => true,
      execute: (editor: Editor) => {
        editor.commands.insertContent('\t')
        editor.commands.focus()
      },
      isActive: () => false,
      isDisabled: () => controlType.value === 'code',
    },
    decrease: {
      canExecute: () => true,
      execute: (editor: Editor) => decreaseIndent(editor),
      isActive: () => false,
      isDisabled: () => controlType.value === 'code',
    },
    horizontal: {
      canExecute: (editor: Editor) => editor.can().setHorizontalRule(),
      execute: (editor: Editor) => editor.chain().focus().setHorizontalRule().run(),
      isActive: () => false,
      isDisabled: () => controlType.value === 'code',
    },
  } satisfies EditorCustomHandlers

  const lowlight = createLowlight(all)
  lowlight.register('html', html)
  lowlight.register('css', css)
  lowlight.register('js', js)
  lowlight.register('ts', ts)
  const extensions = [
    // Nodes
    CustomOrderList,
    CustomBulletList,
    Title,
    Mention,
    TableKit,
    Emoji,
    CodeBlockLowlight.configure({
      lowlight,
      defaultLanguage: 'javascript',
    }),
    // Marks
    CustomLink,
    Subscript,
    Superscript,
    // Functionality
    TextStyleKit,
    TextAlignExtension.configure({
      types: ['heading', 'paragraph', 'title'],
    }),
    TabHandler,
    EnterHandler,
  ]

  const textFontFamily = shallowRef(TextFontFamily.ROBOTO)
  const heading = shallowRef(Headings.NORMAL)
  const textAlign = shallowRef(TextAlign.LEFT)
  function selectionUpdate({ editor }: any) {
    // Heading
    if (editor.isActive('title')) {
      heading.value = Headings.TITLE
    } else if (editor.isActive('heading', { level: 1 })) {
      heading.value = Headings.HEADING_1
    } else if (editor.isActive('heading', { level: 2 })) {
      heading.value = Headings.HEADING_2
    } else if (editor.isActive('heading', { level: 3 })) {
      heading.value = Headings.HEADING_3
    } else if (editor.isActive('heading', { level: 4 })) {
      heading.value = Headings.HEADING_4
    } else if (editor.isActive('heading', { level: 5 })) {
      heading.value = Headings.HEADING_5
    } else if (editor.isActive('heading', { level: 6 })) {
      heading.value = Headings.HEADING_6
    } else {
      heading.value = Headings.NORMAL
    }

    // Font Family
    if (editor.isActive('textStyle', { fontFamily: TextFontFamily.ROBOTO })) {
      textFontFamily.value = TextFontFamily.ROBOTO
    } else if (editor.isActive('textStyle', { fontFamily: TextFontFamily.POPPINS })) {
      textFontFamily.value = TextFontFamily.POPPINS
    } else {
      textFontFamily.value = TextFontFamily.ROBOTO
    }

    // Align
    if (editor.isActive({ textAlign: 'center' })) {
      textAlign.value = TextAlign.CENTER
    } else if (editor.isActive({ textAlign: 'right' })) {
      textAlign.value = TextAlign.RIGHT
    } else if (editor.isActive({ textAlign: 'justify' })) {
      textAlign.value = TextAlign.JUSTIFY
    } else {
      textAlign.value = TextAlign.LEFT
    }
  }

  return {
    controlType,
    heading,
    textAlign,
    textFontFamily,
    handlers,
    extensions,
    selectionUpdate,
  }
}

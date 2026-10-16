import type { EditorToolbarItem } from '@nuxt/ui'

/**
 * 自定义模块富文本的**工具栏配置**。
 *
 * ## 为什么用有限的一组按钮，而不是"把能显示的都放上"
 *
 * 工具栏产出的节点/标记必须能被**渲染侧**还原。渲染走的是
 * `CustomSection.vue` 的 `generateHTML(doc, [StarterKit])` —— 只认 **StarterKit** 的节点集合。
 * 所以这里只放开 StarterKit 提供的那些（`bold` / `italic` / `strike` / `code` /
 * 标题 / 引用 / 代码块 / 两种列表 / 分割线 / 撤销重做）。
 *
 * ⚠️ 典型反例：`underline`、`link`、表格、图片都**不在 StarterKit 里**。
 * 加进来会出现"编辑器里能点、公开页渲染不出来/报错"的割裂 ——
 * 要放开它们，必须同时给编辑器与渲染侧配置对应扩展（渲染侧会因缺扩展而抛
 * `There is no mark type link in this schema`）。
 *
 * ## 为什么分组（二维数组）
 *
 * `EditorToolbar` 支持 `EditorToolbarItem[][]`：外层是"组"，组间画分隔线。
 * 按 **历史 / 块级 / 行内** 分三组，视觉上能把"改整段"和"改选中文字"分开。
 */
export const resumeRichTextToolbarItems: EditorToolbarItem[][] = [
  [
    { kind: 'undo', icon: 'i-lucide-undo-2', tooltip: { text: '撤销' } },
    { kind: 'redo', icon: 'i-lucide-redo-2', tooltip: { text: '重做' } },
  ],
  [
    {
      icon: 'i-lucide-heading',
      tooltip: { text: '标题级别' },
      content: { align: 'start' },
      items: [
        { kind: 'heading', level: 1, icon: 'i-lucide-heading-1', label: '一级标题' },
        { kind: 'heading', level: 2, icon: 'i-lucide-heading-2', label: '二级标题' },
        { kind: 'heading', level: 3, icon: 'i-lucide-heading-3', label: '三级标题' },
      ],
    },
    { kind: 'bulletList', icon: 'i-lucide-list', tooltip: { text: '无序列表' } },
    { kind: 'orderedList', icon: 'i-lucide-list-ordered', tooltip: { text: '有序列表' } },
    { kind: 'blockquote', icon: 'i-lucide-text-quote', tooltip: { text: '引用' } },
    { kind: 'codeBlock', icon: 'i-lucide-square-code', tooltip: { text: '代码块' } },
    { kind: 'horizontalRule', icon: 'i-lucide-separator-horizontal', tooltip: { text: '分割线' } },
  ],
  [
    { kind: 'mark', mark: 'bold', icon: 'i-lucide-bold', tooltip: { text: '加粗' } },
    { kind: 'mark', mark: 'italic', icon: 'i-lucide-italic', tooltip: { text: '斜体' } },
    { kind: 'mark', mark: 'strike', icon: 'i-lucide-strikethrough', tooltip: { text: '删除线' } },
    { kind: 'mark', mark: 'code', icon: 'i-lucide-code', tooltip: { text: '行内代码' } },
    { kind: 'clearFormatting', icon: 'i-lucide-remove-formatting', tooltip: { text: '清除格式' } },
  ],
]

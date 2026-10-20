/** 只统一侧边面板宽度，不影响上下抽屉的高度与布局。 */
const sideContent = 'min-w-[min(var(--ui-drawer-min-width),var(--ui-drawer-available-width,100vw))]'
const insetContent = '[--ui-drawer-available-width:calc(100vw-2rem)]'

export default defineAppConfig({
  ui: {
    slideover: {
      variants: {
        side: { left: { content: sideContent }, right: { content: sideContent } },
        inset: { true: { content: insetContent } },
      },
    },
    drawer: {
      variants: {
        direction: { left: { content: sideContent }, right: { content: sideContent } },
        inset: { true: { content: insetContent } },
      },
    },
  },
})

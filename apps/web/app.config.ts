export default defineAppConfig({
  ui: {
    colors: { primary: 'indigo', neutral: 'slate' },
    // 展示设置抽屉全站只有一处用法，统一在这里配置，组件里不再写 :ui
    drawer: {
      slots: { content: 'w-full sm:max-w-md' },
    },
  },
})

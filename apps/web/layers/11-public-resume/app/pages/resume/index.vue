<script setup lang="ts">
/**
 * `/resume` —— **过渡重定向**。
 *
 * 这个页面原先是一份 **mock 驱动**的"公开站预览"（`useResumeContent` + `useResumeDisplay`，
 * 内容手写在 `mock/resume-content.zh.ts`）。它与 `/resume/draft` 的**契约文档工作台**是两套数据流，
 * 而且已经漂移：排布改成按 section id 寻址后，手写 mock 里没有区块清单，页面直接渲染不出内容。
 *
 * 与其维护两份必然继续漂移的实现，这里直接转到唯一那条正确的路径：
 * `/resume/draft`（真实接口 + 契约文档 + 自动保存 + 冲突处理）。
 *
 * ⚠️ 待办：多份简历的**入口**还没定（"看哪一份"）—— 见 `dao/tasks/DAO-037` 与讨论。
 * 定了之后这里会更像"我的简历列表"或带 id 的工作台入口，而不是重定向。
 */
await navigateTo('/resume/draft', { redirectCode: 302 })
</script>

<template>
  <div />
</template>

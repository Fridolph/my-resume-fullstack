<script setup lang="ts">
import type { ResumeContent, ResumeDisplayConfig, ResumeDocument } from '@rs/common'
import ResumePageContainer from './ResumePageContainer.vue'

/**
 * 公开简历的**只读展示**：给一份契约文档，渲染出整页内容。
 *
 * ## 为什么单独抽一个组件
 *
 * 两个路由都要它：`/`（默认简历）与 `/resume/:id`（指定简历）。差别的只有"数据从哪来"，
 * 渲染必须完全一致 —— 早先 `/resume` 那份手写实现就是各写一份然后漂移掉的。
 *
 * ## 为什么复用 `ResumePageContainer`
 *
 * 它已经是本域唯一的"布局 + 分栏 + 区块注册表"实现（`editable=false` 时纯只读，
 * 不加载 sortablejs、不渲染拖拽手柄）。另起一套只读渲染 = 再养一份必然漂移的代码。
 *
 * ## ⚠️ 落点说明（给后人）
 *
 * 它现在依赖 web 的 `#layers/public-resume/...` 别名（`ResumeColumn` 等仍在本域）。
 * **admin 的只读详情页目前有自己的 `ResumePreview`**，所以这轮不急着上提；
 * 等两端确实要共用同一份只读视图时，再把 `ResumePageContainer` + `ResumeColumn` 一起
 * 提到 `packages/ui`（并去掉 web 别名依赖），本组件跟着搬即可。
 */
const props = defineProps<{
  document: ResumeDocument
  /** 生效的展示配置（由调用方给：可能叠了本机覆盖） */
  config: ResumeDisplayConfig
  /** 生效的内容（由调用方给） */
  content: ResumeContent
  /**
   * 是否可编辑（就地拖拽 / 上下移动 / 隐藏 / 编辑内容）。
   *
   * 由调用方决定：公开页会在"作者 + 编辑模式打开"时传 true，
   * 其余情况一律 false —— 访客拿到的永远是只读页面。
   */
  editable?: boolean
}>()

const emit = defineEmits<{ hide: [id: string]; edit: [id: string] }>()
</script>

<template>
  <ResumePageContainer
    :content="content"
    :config="config"
    :editable="editable === true"
    @hide="emit('hide', $event)"
    @edit="emit('edit', $event)"
  />
</template>

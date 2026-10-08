<script lang="ts" setup>
interface Props {
  /** 是否将封面排除在总页数之外，页码从非封面页开始 */
  excludeCover?: boolean
}

const { excludeCover = true } = defineProps<Props>()

const { totalPages } = providePdfDocument({ excludeCover: () => excludeCover })

const { hasDocument, ready } = usePdfRenderState()

// setup 阶段（SSR + 客户端）即标记本页包含页码：
// 布局锚点位于 <slot /> 之后，SSR 渲染到锚点时此标记已生效，
// 因而含页码页面的就绪锚点不会在 SSR 阶段提前出现。
hasDocument.value = true
ready.value = false

onMounted(async () => {
  // 子组件（PdfPage）的 onMounted 先于父组件执行，此处所有页均已注册；
  // 再等一帧确保页码 footer 已刷新到 DOM，之后才对外宣告就绪。
  await nextTick()
  ready.value = true
})

onBeforeUnmount(() => {
  ready.value = false
  hasDocument.value = false
})

defineExpose({ totalPages })
</script>

<template>
  <div class="pdf-document">
    <slot :total-pages="totalPages" />
  </div>
</template>

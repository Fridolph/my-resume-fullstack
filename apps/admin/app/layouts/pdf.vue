<script setup lang="ts">
/**
 * pdf —— PDF 预览 / 打印布局
 *
 * 只输出纸张内容（无 admin 壳），右上角浮动工具栏（打印时隐藏）：
 * - Back：返回上一页
 * - Config：打开页面里的配置抽屉（`usePdfConfig().openDrawer()`，状态跨组件共享）
 * - Print：调起浏览器打印预览，另存为 PDF
 *
 * 页面用 `definePageMeta({ layout: 'pdf' })`；外层 `.pdf-pages-wrapper`
 * 复用 `assets/css/main.css` 里的命名页打印规则（@page portrait/landscape 等）。
 */
const router = useRouter();
const { openDrawer } = usePdfConfig();

function handleBack() {
  if (import.meta.client && window.history.length > 1) router.back();
  else navigateTo("/");
}

function handlePrint() {
  if (import.meta.client) window.print();
}
</script>

<template>
  <div class="pdf-layout min-h-dvh bg-muted print:bg-white" data-layout="pdf">
    <div class="fixed right-4 top-4 z-[60] flex items-center gap-2 print:hidden">
      <UButton
        icon="i-lucide-arrow-left"
        color="neutral"
        variant="solid"
        size="sm"
        label="Back"
        @click="handleBack"
      />
      <UButton
        icon="i-lucide-sliders-horizontal"
        color="neutral"
        variant="solid"
        size="sm"
        label="Config"
        @click="openDrawer"
      />
      <UButton icon="i-lucide-printer" size="sm" label="Print" @click="handlePrint" />
    </div>

    <div class="pdf-pages-wrapper flex flex-col items-center gap-6 py-6">
      <slot />
    </div>
  </div>
</template>

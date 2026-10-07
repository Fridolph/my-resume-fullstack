<script setup lang="ts">
definePageMeta({
  layout: 'has-sidebar',
  title: 'Loaders',
})

// UButton 手动 loading（模拟接口等待）
const manualLoading = ref(false)
function manualSubmit() {
  manualLoading.value = true
  setTimeout(() => (manualLoading.value = false), 1500)
}

// loading-auto：点击后返回 Promise，自动管理 loading
async function autoSubmit() {
  await new Promise(resolve => setTimeout(resolve, 1500))
}
</script>

<template>
  <div class="content-pad">
    <h1 class="text-xl font-semibold tracking-tight text-highlighted">Loaders</h1>
    <p class="mt-2 text-sm leading-6 text-muted">
      加载反馈：整块区域用
      <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">LoadersColorSpin</code>；
      按钮等待 / 接口交互用 <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">UButton</code> 的
      <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">loading</code> / <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">loading-auto</code>；
      内容骨架屏后续用 <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">LoadersSkeleton</code>。
    </p>

    <div class="mt-6 space-y-10">
      <section>
        <h2 class="text-lg font-semibold text-highlighted">Color spin（区域加载）</h2>
        <p class="mt-1 text-sm text-muted">
          放在 <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">relative</code> 容器内居中；
          <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">size</code> 控制直径。
        </p>

        <div class="relative mt-3 h-64 rounded-xl border border-default bg-muted/20">
          <LoadersColorSpin :size="64" />
        </div>
      </section>

      <section>
        <h2 class="text-lg font-semibold text-highlighted">Button loading（接口等待）</h2>
        <p class="mt-1 text-sm text-muted">
          涉及用户等待 / 接口交互的按钮，统一加 loading 态。
        </p>

        <div class="mt-3 flex flex-wrap gap-3">
          <UButton label="Manual loading" :loading="manualLoading" @click="manualSubmit" />
          <UButton label="loading-auto" loading-auto color="neutral" variant="outline" @click="autoSubmit" />
        </div>
      </section>
    </div>
  </div>
</template>

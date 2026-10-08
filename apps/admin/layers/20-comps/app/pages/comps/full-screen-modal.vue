<script setup lang="ts">
definePageMeta({
  layout: 'has-sidebar',
  title: 'Full screen gallery',
})

/**
 * `MyFullScreenGallery`（packages/ui）的组件索引页。
 *
 * 覆盖：带外链的图集 / 无外链的纯展示卡片 / 空态。
 * 具体业务场景（兴趣图集）见 `/demos/hobby-modal`。
 */
const shot = (text: string, color: string) =>
  `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23${color}'/%3E%3Ctext x='200' y='172' font-size='72' font-family='sans-serif' fill='%23ffffff' text-anchor='middle'%3E${encodeURIComponent(text)}%3C/text%3E%3C/svg%3E`

const linkedOpen = ref(false)
const linkedItems = [
  { id: 'a', url: shot('一', '1578d0'), title: '第一张', href: 'https://example.com/1' },
  { id: 'b', url: shot('二', '2f9e63'), title: '第二张', href: 'https://example.com/2' },
  { id: 'c', url: shot('三', 'b45309'), title: '第三张', href: 'https://example.com/3' },
  { id: 'd', url: shot('四', '7c3aed'), title: '第四张', href: 'https://example.com/4' },
]

const plainOpen = ref(false)
const plainItems = [
  { id: 'p1', url: shot('甲', '0f766e'), title: '只有标题' },
  { id: 'p2', url: shot('乙', 'be123c'), title: '带说明', description: '没有 href → 纯展示卡片，不可点' },
  { id: 'p3', url: shot('丙', '1d4ed8') },
]

const emptyOpen = ref(false)
</script>

<template>
  <div class="content-pad">
    <h1 class="text-xl font-semibold tracking-tight text-highlighted">Full screen gallery（全屏图片浏览）</h1>
    <p class="mt-2 text-sm leading-6 text-muted">
      来自
      <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">packages/ui</code>
      的共享组件
      <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">MyFullScreenGallery</code>：浏览一组图片， 传
      <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">href</code> 的卡片可跳外链。 契约与
      <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">MyDrawer</code> /
      <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">MyModal</code> 一致：<code
        class="rounded bg-elevated px-1.5 py-0.5 text-xs"
        >v-model:open</code
      >
      + <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">items</code>。
    </p>

    <div class="mt-6 space-y-10">
      <p class="max-w-3xl text-sm leading-6 text-muted">
        实现要点：基于
        <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">UModal fullscreen</code>
        —— 焦点陷阱、背景 inert、Esc 关闭、过渡动画都交给 Nuxt UI；图片区沿用深色衬底（lightbox 惯例，
        不跟随业务主题），以免图片衬底随主题变化。样式全部写在标签上（Tailwind），组件内没有
        <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">&lt;style&gt;</code>。
      </p>

      <section>
        <h2 class="text-lg font-semibold text-highlighted">带外链的图集</h2>
        <p class="mt-1 text-sm text-muted">每张卡片新窗口打开对应外链；右上角有外链角标。</p>
        <UButton class="mt-3" label="打开图集（4 张）" @click="linkedOpen = true" />
      </section>

      <section>
        <h2 class="text-lg font-semibold text-highlighted">纯展示卡片（无 href）</h2>
        <p class="mt-1 text-sm text-muted">没有 href 的卡片渲染成 div，不可点、没有角标。</p>
        <UButton class="mt-3" variant="outline" label="打开图集（3 张）" @click="plainOpen = true" />
      </section>

      <section>
        <h2 class="text-lg font-semibold text-highlighted">空态</h2>
        <p class="mt-1 text-sm text-muted">
          <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">items</code> 为空时显示
          <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">emptyText</code>（默认「暂无图片」）。
        </p>
        <UButton class="mt-3" variant="outline" label="打开空图集" @click="emptyOpen = true" />
      </section>
    </div>

    <MyFullScreenGallery
      v-model:open="linkedOpen"
      title="示例图集"
      description="点击任意卡片在新窗口打开对应外链"
      :items="linkedItems"
    />
    <MyFullScreenGallery
      v-model:open="plainOpen"
      title="纯展示图集"
      :items="plainItems"
      empty-text="这个兴趣还没配图"
    />
    <MyFullScreenGallery v-model:open="emptyOpen" title="空图集" :items="[]" />
  </div>
</template>

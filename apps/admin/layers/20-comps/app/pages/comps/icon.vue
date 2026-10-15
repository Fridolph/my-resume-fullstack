<script setup lang="ts">
definePageMeta({
  layout: 'has-sidebar',
  title: 'Icon',
})

/**
 * 图标用法示例（`UIcon`，来自 Nuxt UI）。
 *
 * 三件事在这里一次看全：**图标来源**、**装饰 vs 语义**、**尺寸档位**。
 */
const SOURCES = [
  {
    title: 'Lucide（Nuxt UI 默认集）',
    note: '已安装，`i-lucide-*`',
    names: ['i-lucide-check', 'i-lucide-x', 'i-lucide-trash-2', 'i-lucide-settings'],
  },
  {
    title: 'Remix Icon（扩展）',
    note: '已装 `@iconify-json/ri`，用 `i-ri-*` —— 这就是"Nuxt UI 不够用"时的补位方式',
    names: ['i-ri-github-fill', 'i-ri-translate-2', 'i-ri-bar-chart-2-line', 'i-ri-shield-keyhole-line'],
  },
  {
    title: '本地 svg',
    note: '`app/assets/icons/star-badge.svg` → `i-local:star-badge`（文件名即图标名）',
    names: ['i-local:star-badge'],
  },
]

const SIZES = ['xs', 'sm', 'md', 'lg', 'xl'] as const

/** 尺寸类要写全（只有 w-* 会让图标被拉变形） */
const SIZE_CLASS: Record<(typeof SIZES)[number], string> = {
  xs: 'size-3',
  sm: 'size-3.5',
  md: 'size-4',
  lg: 'size-5',
  xl: 'size-6',
}
</script>

<template>
  <div class="content-pad">
    <h1 class="text-xl font-semibold tracking-tight text-highlighted">Icon</h1>
    <p class="mt-2 max-w-3xl text-sm leading-6 text-muted">
      图标用法（<code class="rounded bg-elevated px-1.5 py-0.5 text-xs">UIcon</code>）：<code class="rounded bg-elevated px-1.5 py-0.5 text-xs">i-lucide-*</code>、
      <code class="rounded bg-elevated px-1.5 py-0.5 text-xs">i-ri-*</code>、任意 iconify 集、
      以及<strong>本地 svg</strong>（<code class="rounded bg-elevated px-1.5 py-0.5 text-xs">i-local:*</code>）
      都能用。⚠️ 尺寸类要写全（<code>size-4</code> 而不是 <code>w-4</code>，否则图标会被拉变形），
      可访问性也要自己加 —— <strong>装饰图标给 <code>aria-hidden="true"</code></strong>，语义图标才给 <code>role="img"</code> + <code>aria-label</code>。
    </p>

    <div class="mt-6 space-y-8">
      <section v-for="group in SOURCES" :key="group.title" class="rounded-lg border border-default bg-default p-4">
        <h2 class="text-sm font-semibold text-highlighted">{{ group.title }}</h2>
        <p class="mt-1 text-xs text-muted">{{ group.note }}</p>
        <div class="mt-4 flex flex-wrap items-center gap-5">
          <div v-for="name in group.names" :key="name" class="flex items-center gap-2">
            <UIcon :name="name" class="size-5 shrink-0 text-primary" />
            <code class="text-xs text-muted">{{ name }}</code>
          </div>
        </div>
      </section>

      <section class="rounded-lg border border-default bg-default p-4">
        <h2 class="text-sm font-semibold text-highlighted">装饰 vs 语义</h2>
        <p class="mt-1 text-xs leading-5 text-muted">
          图标大多数是<strong>装饰</strong>（旁边已经有文字）。<code>UIcon</code> 本身不会替你加无障碍属性，
          要手写：装饰图标给 <code>aria-hidden="true"</code>（不给读屏添乱）；只有<strong>图标本身就是信息</strong>时
          才补 <code>role="img"</code> + <code>aria-label</code>。
        </p>
        <div class="mt-4 flex flex-wrap items-center gap-6">
          <span class="flex items-center gap-2 text-sm text-muted">
            <UIcon name="i-lucide-info" class="size-4 shrink-0" aria-hidden="true" />
            装饰：aria-hidden="true"（读屏跳过它）
          </span>
          <span class="flex items-center gap-2 text-sm text-muted">
            <UIcon name="i-lucide-circle-check" class="size-4 shrink-0 text-green-600" role="img" aria-label="已完成" />
            语义：<code class="text-xs">role="img" + aria-label</code>
          </span>
        </div>
      </section>

      <section class="rounded-lg border border-default bg-default p-4">
        <h2 class="text-sm font-semibold text-highlighted">尺寸档位</h2>
        <p class="mt-1 text-xs text-muted">
          <code>xs</code> 12px · <code>sm</code> 14px · <code>md</code> 16px（默认）· <code>lg</code> 20px · <code>xl</code> 24px
        </p>
        <div class="mt-4 flex flex-wrap items-end gap-5">
          <span v-for="s in SIZES" :key="s" class="flex flex-col items-center gap-2">
            <UIcon name="i-lucide-sparkles" :class="SIZE_CLASS[s]" class="text-primary" />
            <code class="text-xs text-muted">{{ s }}</code>
          </span>
        </div>
      </section>

      <section class="rounded-lg border border-default bg-elevated/40 p-4">
        <h2 class="text-sm font-semibold text-highlighted">怎么再加一套图标</h2>
        <ol class="mt-2 list-decimal space-y-1 pl-5 text-xs leading-5 text-muted">
          <li>
            <strong>iconify 集</strong>：<code>pnpm --filter @template/admin add -D @iconify-json/&lt;集名&gt;</code>
            —— 装完就能写 <code>i-&lt;集名&gt;-&lt;图标&gt;</code>，<strong>不用改代码</strong>
            （集清单在 <a class="text-primary underline" href="https://icones.netlify.app" target="_blank" rel="noreferrer">icones.netlify.app</a>）
          </li>
          <li>
            <strong>本地 svg</strong>：把文件放到 <code>app/assets/icons/</code>（可再分目录），
            文件名即图标名 → <code>i-local:&lt;文件名&gt;</code>
          </li>
        </ol>
      </section>
    </div>
  </div>
</template>

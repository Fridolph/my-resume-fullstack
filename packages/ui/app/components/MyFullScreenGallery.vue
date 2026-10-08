<script lang="ts">
/** 全屏 gallery 里的一张卡片 */
export interface MyFullScreenGalleryItem {
  /** 稳定 key（缺省用 `url`） */
  id?: string
  url: string
  title?: string
  description?: string
  /** 有值 → 卡片是链接（新窗口打开）；无值 → 纯展示卡片 */
  href?: string
}
</script>

<script setup lang="ts">
/**
 * 全屏图片浏览（lightbox / gallery）—— 基于 `UModal fullscreen`。
 *
 * 早期版本用原生 `<dialog>` + `showModal()` 手写：焦点陷阱、背景 inert、Esc 关闭、过渡动画、
 * 背板与网格样式全都自己维护（316 行里约 185 行原生 CSS）。
 * 而 Nuxt UI v4 的 `UModal` **已内置 `fullscreen`**，这些它本来就负责 ——
 * 再维护一套既没必要，也和 `MyDrawer` / `MyModal` 的路子不一致。
 *
 * 之所以保留这个组件（而不是让调用方直接用 `UModal`）：它承载的是
 * 「一组图片怎么摆、怎么点」的**业务语义** —— `items` 契约、caption、外链角标、空态；
 * 调用方只需要 `v-model:open` + `items`。
 *
 * 观感：图片区沿用**深色衬底**（lightbox 惯例，不跟随业务主题）—— 图片在任何主题下都有稳定背景；
 * 因此标题 / 说明 / 关闭按钮都覆写成白色系。
 *
 * 样式全部写在标签上（Tailwind），本文件不含 style 块（注释里也不能出现它的标签字面量 ——
 * 那会被 SFC 分块扫描器当成真正的块开头）；字号一律用 `text-[…]` 精确值，
 * 避免 `text-sm` 之类**自带行高**的类改变原有行高。
 */
const props = withDefaults(
  defineProps<{
    title?: string
    description?: string
    items?: MyFullScreenGalleryItem[]
    /** 无图时的提示 */
    emptyText?: string
  }>(),
  {
    title: '',
    description: '',
    items: () => [],
    emptyText: '暂无图片',
  },
)

const open = defineModel<boolean>('open', { default: false })

/**
 * 「点空白关闭」。
 *
 * `UModal` 的 `fullscreen` 形态没有遮罩可点（面板铺满），所以按**点到什么**判断：
 * 卡片、链接、图片、caption 都不关；其余（网格间隙、面板留白、空白区）算"点空白"。
 */
const IGNORE_CLICK_TARGETS = 'a, button, img, [data-gallery-caption]'

/*
 * 关于 `ui` 覆写里的 `sm:p-0`：`UModal` 的 body 默认带 `sm:p-6`，只写 `p-0` 会被它盖住，
 * 于是桌面端 body 四周留出 24px 内边距 —— 点在那一圈不属于内容区，「点空白关闭」就失效了
 * （实测踩到过：点右下角关不掉）。内边距统一交给内容容器控制。
 *
 * ⚠️ 另外：模板里的内联对象**不能写 `//` 行注释** —— 编译器把 `:ui="{…}"` 整段当表达式解析，
 * 行注释会把后面剩的对象字面量一起注释掉，直接 500。要注释请写在这里或换成块注释。
 */

function onSurfaceClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null
  if (!target || target.closest(IGNORE_CLICK_TARGETS)) {
    return
  }

  open.value = false
}
</script>

<template>
  <UModal
    v-model:open="open"
    fullscreen
    :title="props.title"
    :description="props.description"
    :ui="{
      content: 'flex flex-col',
      header: 'shrink-0 border-b border-white/10 px-4 py-3 sm:px-6',
      title: 'text-[1.125rem] font-semibold tracking-[-0.01em]',
      description: 'mt-1 text-[0.8125rem]',
      body: 'min-h-0 flex-1 overflow-y-auto p-0 sm:p-0',
    }"
  >
    <template #body>
      <div class="flex h-full flex-col p-4 md:px-8 md:pt-6 md:pb-8" @click="onSurfaceClick">
        <p v-if="!props.items.length" class="mt-8 text-[0.875rem]">{{ props.emptyText }}</p>

        <div
          v-else
          class="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3 md:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] md:gap-4"
        >
          <component
            :is="item.href ? 'a' : 'div'"
            v-for="item in props.items"
            :key="item.id ?? item.url"
            class="group relative block cursor-pointer overflow-hidden rounded-[0.75rem] border border-white/15 text-inherit no-underline transition-[transform,border-color] duration-[250ms] ease-[ease] hover:-translate-y-0.5 hover:border-white/45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            :href="item.href"
            :target="item.href ? '_blank' : undefined"
            :rel="item.href ? 'noreferrer' : undefined"
          >
            <img :src="item.url" :alt="item.title || ''" loading="lazy" class="block aspect-[4/3] w-full object-cover" />

            <span
              v-if="item.title || item.description"
              data-gallery-caption
              class="absolute inset-x-0 bottom-0 grid gap-px bg-gradient-to-t from-black/65 to-transparent px-2 py-1.5"
            >
              <span v-if="item.title" class="text-[0.75rem] font-semibold">{{ item.title }}</span>
              <span v-if="item.description" class="text-[0.6875rem]">{{ item.description }}</span>
            </span>

            <UIcon v-if="item.href" name="i-lucide-arrow-up-right" class="absolute end-1.5 top-1.5 size-4 rounded bg-black/45 p-0.5" />
          </component>
        </div>
      </div>
    </template>
  </UModal>
</template>

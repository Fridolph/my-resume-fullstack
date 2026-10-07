<script lang="ts" setup>
import type { PdfAlign, PdfCoverConfig, PdfTextVertical } from '~/types/pdf'

/**
 * PdfCoverSheet —— 配置驱动的封面页。
 *
 * 与底层原语 `PdfCover`（slot 驱动）的分工：
 * - `PdfCover`：纸张 + 上白下渐变两段结构，版式完全交给调用方；
 * - `PdfCoverSheet`：接收 `PdfCoverConfig`，把「封面图 / 标题 / 位置」渲染开，
 *   适合「配置面板 → 即时预览」和简历这类可定制文档。
 *
 * 是否渲染封面由父级判断（`v-if="config.enabled"`），本组件只负责版式。
 */
const props = defineProps<{
  config: PdfCoverConfig
}>()

const alignTokens: Record<PdfAlign, { text: string, items: string }> = {
  left: { text: 'text-left', items: 'items-start' },
  center: { text: 'text-center', items: 'items-center' },
  right: { text: 'text-right', items: 'items-end' },
}

const justifyTokens: Record<PdfTextVertical, string> = {
  top: 'justify-start',
  center: 'justify-center',
  bottom: 'justify-end',
}

const align = computed(() => alignTokens[props.config.align ?? 'left'])
const justify = computed(() => justifyTokens[props.config.vertical ?? 'top'])

const imageMode = computed(() => props.config.imageMode ?? 'none')
const hasImage = computed(() => !!props.config.image && imageMode.value !== 'none')

const gradientStyle = computed(() => ({
  background: `linear-gradient(132deg, ${props.config.gradientFrom ?? '#00e944'} 0%, ${props.config.gradientTo ?? '#06f'} 101.41%)`,
}))
</script>

<template>
  <!-- 整页背景图：文字叠在图上，自动加暗色遮罩保证可读性 -->
  <PdfPage v-if="hasImage && imageMode === 'background'" page-type="cover" class="relative overflow-hidden">
    <img :src="config.image" alt="" class="absolute inset-0 size-full object-cover">
    <div class="absolute inset-0 bg-black/50" />

    <div class="relative flex h-full flex-col p-[10.58333mm]" :class="justify">
      <div class="flex flex-col" :class="[align.text, align.items]">
        <p v-if="config.eyebrow" class="text-xs font-medium uppercase tracking-[0.2em] text-white/80">
          {{ config.eyebrow }}
        </p>
        <h1 v-if="config.title" class="mt-3 text-4xl font-bold tracking-tight text-white">
          {{ config.title }}
        </h1>
        <p v-if="config.description" class="mt-4 max-w-lg text-sm leading-6 text-white/85">
          {{ config.description }}
        </p>
      </div>
    </div>

    <div
      v-if="config.footerTitle || config.footerText"
      class="absolute inset-x-0 bottom-0 p-[10.58333mm] text-white"
      :class="[align.text, align.items]"
    >
      <p v-if="config.footerTitle" class="text-xl font-semibold">
        {{ config.footerTitle }}
      </p>
      <p v-if="config.footerText" class="mt-2 max-w-md text-xs text-white/80">
        {{ config.footerText }}
      </p>
    </div>
  </PdfPage>

  <!-- 默认：上白（可放横幅图 + 标题）下渐变（底部文案） -->
  <PdfCover v-else :gradient-from="config.gradientFrom" :gradient-to="config.gradientTo">
    <template #top>
      <div class="flex h-full flex-col p-[10.58333mm]" :class="justify">
        <img
          v-if="hasImage"
          :src="config.image"
          alt=""
          class="max-h-48 w-full rounded-lg object-cover"
        >

        <div class="flex flex-col" :class="[align.text, align.items, hasImage ? 'mt-8' : '']">
          <p v-if="config.eyebrow" class="text-xs font-medium uppercase tracking-[0.2em] text-gray-400">
            {{ config.eyebrow }}
          </p>
          <h1 v-if="config.title" class="mt-2 text-4xl font-bold tracking-tight text-gray-900">
            {{ config.title }}
          </h1>
          <p v-if="config.description" class="mt-3 max-w-lg text-sm leading-6 text-gray-500">
            {{ config.description }}
          </p>
        </div>
      </div>
    </template>

    <template #bottom>
      <div class="flex h-full flex-col justify-end p-[10.58333mm]" :class="[align.text, align.items]">
        <p v-if="config.footerTitle" class="text-2xl font-semibold">
          {{ config.footerTitle }}
        </p>
        <p v-if="config.footerText" class="mt-2 max-w-md text-sm text-white/80">
          {{ config.footerText }}
        </p>
      </div>
    </template>
  </PdfCover>
</template>

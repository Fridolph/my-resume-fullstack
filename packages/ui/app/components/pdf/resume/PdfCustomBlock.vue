<script setup lang="ts">
import type { ResumeSection } from '@rs/common'
import { listOf, sectionData, texts, firstText } from './format'

/**
 * 自定义模块：**按 `view` 分四种纸面形态**（textList / tagCloud / timeline / richText）。
 *
 * 为什么在这里分叉而不是交给父组件：四种 view 的纸面版式差别很大
 *（列表 / 标签云 / 时间线 / 富文本），塞进父组件会变成一个 4 分支的 `v-if` 树。
 */
const props = defineProps<{ section: ResumeSection }>()

const data = computed(() => sectionData(props.section))
const view = computed(() => String(data.value.view ?? 'textList'))
const items = computed(() => listOf(data.value, 'items'))
/** 富文本的 TipTap JSON：取 `content.content` 里的纯文本行（纸面不引入编辑器样式） */
const richLines = computed(() => {
  const content = data.value.content as { content?: unknown } | undefined
  return texts(content?.content)
})
</script>

<template>
  <section class="break-inside-avoid">
    <h2 class="mb-1 border-b border-neutral-300 pb-0.5 text-[11px] font-semibold uppercase tracking-wider">
      {{ section.title }}
    </h2>
    <p v-if="section.description" class="mb-1 text-[10px] text-neutral-500">{{ section.description }}</p>

    <!-- 文本列表 -->
    <ul v-if="view === 'textList'" class="list-disc space-y-0.5 pl-4 text-[10px] leading-4">
      <li v-for="(item, index) in items" :key="index">
        <span class="font-medium">{{ firstText(item, ['title']) }}</span>
        <span v-if="firstText(item, ['text', 'description'])" class="text-neutral-600">
          — {{ firstText(item, ['text', 'description']) }}
        </span>
      </li>
    </ul>

    <!-- 标签云 -->
    <div v-else-if="view === 'tagCloud'" class="flex flex-wrap gap-1">
      <span
        v-for="(item, index) in items"
        :key="index"
        class="rounded border border-neutral-300 px-1.5 py-0.5 text-[10px] text-neutral-700"
      >
        {{ firstText(item, ['text', 'title']) }}
      </span>
    </div>

    <!-- 时间线 -->
    <ul v-else-if="view === 'timeline'" class="space-y-1 border-l border-neutral-300 pl-3 text-[10px] leading-4">
      <li v-for="(item, index) in items" :key="index">
        <span class="font-medium">{{ firstText(item, ['title']) }}</span>
        <span v-if="firstText(item, ['time'])" class="ml-1 text-neutral-500">{{ firstText(item, ['time']) }}</span>
        <p v-if="firstText(item, ['description'])" class="text-neutral-600">{{ firstText(item, ['description']) }}</p>
      </li>
    </ul>

    <!-- 富文本：纸上用纯文本行渲染（不引入编辑器样式，保证打印可控） -->
    <div v-else class="space-y-0.5 text-[10px] leading-4">
      <p v-for="(line, index) in richLines" :key="index">{{ line }}</p>
    </div>
  </section>
</template>

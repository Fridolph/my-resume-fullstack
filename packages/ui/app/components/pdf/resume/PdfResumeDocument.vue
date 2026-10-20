<script setup lang="ts">
import type { ResumeDocument } from '@rs/common'
import { resolvePdfSection } from './registry'

/**
 * 简历的**纸面文档**：一张 A4、按 `display` 的排序与显隐排模块、页脚带作者名与页码。
 *
 * ## 边界
 *
 * 只管"纸怎么排"，不管"数据从哪来"：web 传公开读到的、admin 传鉴权读到的，
 * 两边共用这一份。这样"纸面版式"只维护一处，主题变体以后也只在这一层加。
 *
 * ## 排序的兜底
 *
 * `order` 里可能有文档中已不存在的 id（删过模块），忽略；
 * 文档里有但 `order` 未列到的，**补在末尾** —— 否则新加的模块会静默消失。
 */
const props = withDefaults(
  defineProps<{
    document: ResumeDocument
    /** 页脚左侧文字（通常是作者名）；不传则只显示页码 */
    author?: string
  }>(),
  { author: '' },
)

const sections = computed(() => {
  const all = props.document.content.sections
  const order = props.document.display.sections.order ?? []
  const hidden = new Set(props.document.display.sections.hidden ?? [])
  const byId = new Map(all.map(section => [section.id, section]))
  const ordered = order
    .map(id => byId.get(id))
    .filter((section): section is NonNullable<typeof section> => Boolean(section))
  const rest = all.filter(section => !order.includes(section.id))

  return [...ordered, ...rest].filter(section => !hidden.has(section.id))
})

const pageClass = 'pdf-page relative flex w-[210mm] min-h-[297mm] flex-col bg-white p-[12mm] text-black'
</script>

<template>
  <article :class="pageClass" data-orientation="portrait">
    <div class="flex-1 space-y-3">
      <template v-for="section in sections" :key="section.id">
        <component
          :is="resolvePdfSection(section)?.component"
          v-if="resolvePdfSection(section)"
          :section="section"
          :variant="resolvePdfSection(section)?.variant"
        />
      </template>
    </div>

    <footer class="mt-3 flex items-center justify-between border-t border-neutral-300 pt-1 text-[9px] text-neutral-500">
      <span>{{ author }}</span>
      <span>1</span>
    </footer>
  </article>
</template>

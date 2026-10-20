<script setup lang="ts">
import type { ResumeSection } from '@rs/common'
import { firstText, formatDate, listOf, sectionData, texts } from './format'

/**
 * 通用「条目列表」模块：亮点 / 教育 / 工作 / 项目 / 评价 都是同一种纸面形态
 *（标题 + 副标题 + 起止 + 若干行），差别只在取哪几个字段。
 *
 * 为什么抽成一个而不是 5 份复制：纸面版式要改时（列宽、密度、分割线），
 * 改这一处就全变；而"取哪些字段"由 `variant` 表达，加一个模块只是加一个映射。
 */
const props = withDefaults(defineProps<{ section: ResumeSection; variant?: 'plain' | 'dated' | 'rich' }>(), {
  variant: 'dated',
})

const data = computed(() => sectionData(props.section))
const items = computed(() => listOf(data.value, 'items'))

/** 每条条目的三行：主标题 / 副标题 / 补充行 */
function rows(item: Record<string, unknown>) {
  const head = firstText(item, ['company', 'school', 'name', 'title'])
  const sub = firstText(item, ['role', 'degree', 'major', 'description'])
  const date = formatDate(item.date)
  const detail = firstText(item, ['overview', 'summary'])
  const bullets = [...texts(item.achievements), ...texts(item.features), ...texts(item.highlights)]
  const tech = texts(item.tech)

  return { head, sub, date, detail, bullets, tech }
}
</script>

<template>
  <section class="break-inside-avoid">
    <h2 class="mb-1 border-b border-neutral-300 pb-0.5 text-[11px] font-semibold uppercase tracking-wider">
      {{ section.title }}
    </h2>

    <ul class="space-y-1.5">
      <li v-for="(item, index) in items" :key="index">
        <div class="flex items-baseline justify-between gap-3">
          <span class="text-[11px] font-semibold">{{ rows(item).head || rows(item).sub }}</span>
          <span v-if="rows(item).date" class="shrink-0 text-[10px] text-neutral-500">{{ rows(item).date }}</span>
        </div>
        <p v-if="rows(item).sub && rows(item).head" class="text-[10px] text-neutral-600">{{ rows(item).sub }}</p>
        <p v-if="variant === 'rich' && rows(item).detail" class="mt-0.5 text-[10px] leading-4 text-neutral-700">
          {{ rows(item).detail }}
        </p>
        <ul v-if="variant === 'rich' && rows(item).bullets.length" class="mt-0.5 list-disc pl-4 text-[10px] leading-4">
          <li v-for="(bullet, bulletIndex) in rows(item).bullets.slice(0, 6)" :key="bulletIndex">{{ bullet }}</li>
        </ul>
        <p v-if="variant === 'rich' && rows(item).tech.length" class="mt-0.5 text-[10px] text-neutral-500">
          {{ rows(item).tech.join(' · ') }}
        </p>
      </li>
    </ul>
  </section>
</template>

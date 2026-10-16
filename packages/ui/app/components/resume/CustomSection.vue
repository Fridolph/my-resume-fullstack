<script setup lang="ts">
import { generateHTML } from '@tiptap/html'
import StarterKit from '@tiptap/starter-kit'
import type { ResumeSectionProps } from '../../types/resume-view-props'
import ResumeSectionCard from './ResumeSectionCard.vue'

/**
 * 自定义模块：用户自建、自选展示方式。
 *
 * 与其它区块的关键差别是**多实例** —— 同一个 view 可以有多个模块，`content.custom` 是个数组，
 * 所以这里先按 `section.id` 找到自己那一份，再按 `view` 渲染。
 *
 * 四种展示方式：
 * - `textList`：带强调点的条目列表
 * - `tagCloud`：标签簇
 * - `timeline`：时间轴（左侧时间、右侧标题与说明），与教育 / 工作经历的观感一致
 * - `richText`：富文本，内容存的是 **TipTap JSON**，这里用 `generateHTML` 渲染 ——
 *   不存 HTML 是为了不在公开页开 `v-html` 的口子（那是真实的 XSS 面）；JSON 的节点类型由
 *   TipTap schema 收口，生成不出可注入的标记。
 */
const props = defineProps<ResumeSectionProps>()

const custom = computed(() => props.content.custom.find(item => item.id === props.section.id))

/** TipTap JSON → HTML：只在有内容时执行，且 StarterKit 决定允许的节点集合 */
const richTextHtml = computed(() => {
  const doc = custom.value?.document

  return doc ? generateHTML(doc, [StarterKit]) : ''
})
</script>

<template>
  <ResumeSectionCard :section="section" :variant="variant">
    <!-- 条目列表 -->
    <ul v-if="custom?.view === 'textList'" class="space-y-2">
      <li v-for="(item, index) in custom.items" :key="index" class="flex gap-2">
        <UIcon name="i-lucide-dot" class="resume-accent mt-1 size-4 shrink-0" />
        <span class="resume-muted">{{ item }}</span>
      </li>
    </ul>

    <!-- 标签簇 -->
    <div v-else-if="custom?.view === 'tagCloud'" class="flex flex-wrap gap-2">
      <span
        v-for="(item, index) in custom.items"
        :key="index"
        class="rounded-full border px-3 py-1 text-xs"
        :style="{ borderColor: 'var(--resume-border)', background: 'var(--resume-chip)' }"
      >
        {{ item }}
      </span>
    </div>

    <!-- 时间轴 -->
    <ol v-else-if="custom?.view === 'timeline'" class="space-y-4">
      <li v-for="item in custom.timeline" :key="item.id" class="flex gap-3">
        <span class="resume-muted shrink-0 text-xs tabular-nums">{{ item.time }}</span>
        <div class="min-w-0 border-l pl-3" :style="{ borderColor: 'var(--resume-border)' }">
          <p class="text-sm font-medium">{{ item.title }}</p>
          <p v-if="item.description" class="resume-muted mt-1 text-xs">{{ item.description }}</p>
        </div>
      </li>
    </ol>

    <!-- 富文本（TipTap JSON → HTML，节点由 StarterKit 收口） -->
    <div v-else-if="custom?.view === 'richText'" class="resume-rich-text space-y-2 text-sm" v-html="richTextHtml" />
  </ResumeSectionCard>
</template>

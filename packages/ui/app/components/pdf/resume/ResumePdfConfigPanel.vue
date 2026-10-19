<script setup lang="ts">
import type { ResumePdfConfig, ResumeDocument } from '@rs/common'
const config = defineModel<ResumePdfConfig>({ required: true })
const props = defineProps<{ document: ResumeDocument; disabled: boolean }>()
const fields = [
  ['interests', '兴趣爱好'],
  ['stats', '个人统计'],
  ['profileSummary', '个人简介'],
  ['sectionDescriptions', '模块说明'],
  ['overviews', '工作与项目概述'],
  ['capabilitySummaries', '能力分组说明'],
  ['ratings', '能力自评'],
  ['footerNote', '正文末尾备注'],
] as const
const margins = [
  ['marginTop', '上边距'],
  ['marginRight', '右边距'],
  ['marginBottom', '下边距'],
  ['marginLeft', '左边距'],
] as const
const typography = [
  ['fontSize', '正文字号（px）', 10, 16, 0.5],
  ['lineHeight', '行高', 1.2, 2, 0.05],
  ['blockSpacing', '内容间距（px）', 2, 16, 1],
] as const
const sections = computed(() => {
  const byId = new Map(props.document.content.sections.map(section => [section.id, section]))
  return [...new Set([...config.value.sections.order, ...props.document.display.sections.order])].flatMap(id =>
    byId.has(id) ? [byId.get(id)!] : [],
  )
})
/** 切换独立配置时复制网页当前选择，不能意外重新显示隐藏模块。 */
function setMode(event: Event) {
  const mode = (event.target as HTMLSelectElement).value as ResumePdfConfig['sections']['mode']
  config.value.sections = {
    mode,
    order: [...props.document.display.sections.order],
    hidden: [...props.document.display.sections.hidden],
  }
}
function toggle(id: string) {
  const hidden = config.value.sections.hidden
  config.value.sections.hidden = hidden.includes(id) ? hidden.filter(value => value !== id) : [...hidden, id]
}
function move(id: string, offset: number) {
  const order = sections.value.map(section => section.id)
  const index = order.indexOf(id)
  const next = index + offset
  if (next < 0 || next >= order.length) return
  ;[order[index], order[next]] = [order[next]!, order[index]!]
  config.value.sections.order = order
}
</script>

<template>
  <fieldset :disabled="disabled" class="pdf-config-fields space-y-6">
    <section class="space-y-3">
      <h2 class="font-semibold">内容</h2>
      <label class="block text-sm"
        >模块编排
        <select aria-label="模块编排" :value="config.sections.mode" @change="setMode">
          <option value="followWeb">跟随网页排序与显隐</option>
          <option value="independent">PDF 独立配置</option>
        </select>
      </label>
      <div v-if="config.sections.mode === 'independent'" class="space-y-2">
        <div v-for="(section, index) in sections" :key="section.id" class="flex items-center gap-2">
          <label class="flex min-w-0 flex-1 items-center gap-2 text-sm">
            <input
              type="checkbox"
              :checked="!config.sections.hidden.includes(section.id)"
              @change="toggle(section.id)"
            />{{ section.title }}
          </label>
          <UButton
            icon="i-lucide-arrow-up"
            :aria-label="`上移${section.title}`"
            color="neutral"
            variant="ghost"
            size="xs"
            :disabled="disabled || index === 0"
            @click="move(section.id, -1)"
          />
          <UButton
            icon="i-lucide-arrow-down"
            :aria-label="`下移${section.title}`"
            color="neutral"
            variant="ghost"
            size="xs"
            :disabled="disabled || index === sections.length - 1"
            @click="move(section.id, 1)"
          />
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <label v-for="[key, label] in fields" :key="key" class="flex items-center gap-2 text-sm"
          ><input v-model="config.fields[key]" type="checkbox" />{{ label }}</label
        >
      </div>
    </section>
    <section class="space-y-3">
      <h2 class="font-semibold">纸张与文字</h2>
      <p class="text-xs text-muted">A4 纵向 · 边距单位 mm，字号单位 px</p>
      <div class="grid grid-cols-2 gap-3">
        <label v-for="[key, label] in margins" :key="key" class="text-sm"
          >{{ label
          }}<input v-model.number="config.page[key]" type="number" min="5" max="30" step="1" :aria-label="label"
        /></label>
        <label v-for="[key, label, min, max, step] in typography" :key="key" class="text-sm"
          >{{ label
          }}<input
            v-model.number="config.typography[key]"
            type="number"
            :min="min"
            :max="max"
            :step="step"
            :aria-label="label"
        /></label>
        <label class="text-sm"
          >主题色<input v-model="config.typography.primaryColor" type="color" aria-label="主题色"
        /></label>
      </div>
    </section>
    <section v-for="key in ['header', 'footer'] as const" :key="key" class="space-y-3">
      <h2 class="font-semibold">{{ key === 'header' ? '页眉' : '页脚' }}</h2>
      <label class="flex items-center gap-2 text-sm"
        ><input v-model="config[key].enabled" type="checkbox" />{{ key === 'header' ? '显示页眉' : '显示页脚' }}</label
      >
      <div v-if="config[key].enabled" class="space-y-3">
        <label class="block text-sm"
          >{{ key === 'header' ? '页眉文字 / slogan' : '页脚文字 / slogan'
          }}<input
            v-model="config[key].text"
            type="text"
            maxlength="100"
            :aria-label="`${key === 'header' ? '页眉' : '页脚'}文字`"
        /></label>
        <p class="text-xs text-muted">可用变量：{name} 姓名、{page} 当前页、{pages} 总页数。单行展示，过长省略。</p>
        <label class="block text-sm"
          >对齐<select v-model="config[key].align" :aria-label="`${key}对齐`">
            <option value="left">居左</option>
            <option value="center">居中</option>
            <option value="right">居右</option>
          </select></label
        >
        <label class="flex items-center gap-2 text-sm"
          ><input v-model="config[key].hideFirstPage" type="checkbox" />首页隐藏（保留位置）</label
        >
        <label class="flex items-center gap-2 text-sm"
          ><input v-model="config[key].separator" type="checkbox" />显示分隔线</label
        >
      </div>
    </section>
  </fieldset>
</template>

<style scoped>
.pdf-config-fields input:not([type='checkbox']),
.pdf-config-fields select {
  display: block;
  width: 100%;
  min-width: 0;
  margin-top: 6px;
  border: 1px solid var(--ui-border-accented);
  border-radius: 6px;
  padding: 6px 8px;
  background: var(--ui-bg);
  color: var(--ui-text);
}
.pdf-config-fields input[type='color'] {
  height: 36px;
  padding: 3px;
}
.pdf-config-fields input:focus-visible,
.pdf-config-fields select:focus-visible {
  outline: 2px solid var(--ui-primary);
  outline-offset: 2px;
}
</style>

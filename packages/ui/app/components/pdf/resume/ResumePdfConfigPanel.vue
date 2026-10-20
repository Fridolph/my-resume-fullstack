<script setup lang="ts">
import type { ResumePdfConfig, ResumeDocument } from '@rs/common'
const config = defineModel<ResumePdfConfig>({ required: true })
const fieldDescriptionId = useId()
// 无文档时编辑公共预设：仅展示可复用字段，不出现简历实例编排。
const props = defineProps<{ document?: ResumeDocument; disabled: boolean }>()
const fields = [
  ['interests', '兴趣爱好', '个人资料中的爱好及其介绍，例如阅读、摄影。'],
  ['stats', '个人统计', '个人资料中的统计项，例如工作年限、项目数量。'],
  ['profileSummary', '个人简介', '姓名、联系方式附近的自我介绍段落。'],
  [
    'sectionDescriptions',
    '模块说明',
    '模块标题下的介绍，例如「项目经历」下的「精选近期代表项目」，不影响模块内的条目。',
  ],
  ['overviews', '工作与项目概述', '每段工作经历或每个项目的简短介绍，不影响具体职责、功能与成果。'],
  [
    'capabilitySummaries',
    '能力分组说明',
    '能力分组标题下的概述，例如「客户端开发能力」下的「能够独立交付复杂前端应用」。',
  ],
  ['ratings', '能力自评', '自定义能力维度的评分与说明，例如「沟通协作：4 / 5」。'],
  [
    'footerNote',
    '正文末尾备注',
    '整份简历最后仅出现一次的附言，例如「感谢阅读，期待交流」。每页重复的文字请在下方「页脚」设置。',
  ],
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
const modes = [
  { label: '跟随网页排序与显隐', value: 'followWeb' as const },
  { label: 'PDF 独立配置', value: 'independent' as const },
]
const alignments = [
  { label: '居左', value: 'left' as const },
  { label: '居中', value: 'center' as const },
  { label: '居右', value: 'right' as const },
]
const sections = computed(() => {
  if (!props.document) return []
  const byId = new Map(props.document.content.sections.map(section => [section.id, section]))
  return [...new Set([...config.value.sections.order, ...props.document.display.sections.order])].flatMap(id =>
    byId.has(id) ? [byId.get(id)!] : [],
  )
})
/** 切换独立配置时复制网页当前选择，不能意外重新显示隐藏模块。 */
function setMode(mode: ResumePdfConfig['sections']['mode']) {
  if (!props.document) return
  config.value.sections = {
    mode,
    order: [...props.document.display.sections.order],
    hidden: [...props.document.display.sections.hidden],
  }
}
function setVisible(id: string, visible: boolean | 'indeterminate') {
  const hidden = config.value.sections.hidden
  config.value.sections.hidden = visible === true ? hidden.filter(value => value !== id) : [...new Set([...hidden, id])]
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
  <fieldset :disabled="disabled" class="space-y-6">
    <section class="space-y-4">
      <h2 class="font-semibold text-highlighted">内容</h2>
      <p v-if="!document" class="text-xs text-muted">模块排序与显隐跟随各份简历，可在其 PDF 预览中单独调整。</p>
      <URadioGroup
        v-if="document"
        legend="模块编排"
        :model-value="config.sections.mode"
        :items="modes"
        :disabled="disabled"
        @update:model-value="setMode"
      />
      <div v-if="document && config.sections.mode === 'independent'" class="space-y-2">
        <div v-for="(section, index) in sections" :key="section.id" class="flex items-center gap-2">
          <UCheckbox
            class="min-w-0 flex-1"
            :model-value="!config.sections.hidden.includes(section.id)"
            :label="section.title"
            :disabled="disabled"
            @update:model-value="setVisible(section.id, $event)"
          />
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
      <p class="text-xs text-muted">
        以下开关仅控制已有内容在 PDF / 打印中的显示，不修改网页内容；未填写的内容不会显示。
      </p>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <UCheckbox
          v-for="[key, label, description] in fields"
          :key="key"
          v-model="config.fields[key]"
          :label="label"
          :aria-describedby="`${fieldDescriptionId}-${key}`"
          :disabled="disabled"
        >
          <template #description>
            <span :id="`${fieldDescriptionId}-${key}`">{{ description }}</span>
          </template>
        </UCheckbox>
      </div>
    </section>
    <section class="space-y-4">
      <h2 class="font-semibold text-highlighted">纸张与文字</h2>
      <p class="text-xs text-muted">A4 纵向 · 边距单位 mm，字号单位 px</p>
      <div class="grid grid-cols-2 gap-3">
        <UFormField v-for="[key, label] in margins" :key="key" :label="label">
          <UInput
            v-model.number="config.page[key]"
            type="number"
            :min="5"
            :max="30"
            :step="1"
            :aria-label="label"
            :disabled="disabled"
            class="w-full"
          />
        </UFormField>
        <UFormField v-for="[key, label, min, max, step] in typography" :key="key" :label="label">
          <UInput
            v-model.number="config.typography[key]"
            type="number"
            :min="min"
            :max="max"
            :step="step"
            :aria-label="label"
            :disabled="disabled"
            class="w-full"
          />
        </UFormField>
        <UFormField label="主题色">
          <UInput
            v-model="config.typography.primaryColor"
            type="color"
            aria-label="主题色"
            :disabled="disabled"
            class="w-full"
            :ui="{ base: 'h-8 p-1' }"
          />
        </UFormField>
      </div>
    </section>
    <section v-for="key in ['header', 'footer'] as const" :key="key" class="space-y-4">
      <h2 class="font-semibold text-highlighted">{{ key === 'header' ? '页眉' : '页脚' }}</h2>
      <UCheckbox
        v-model="config[key].enabled"
        :label="key === 'header' ? '显示页眉' : '显示页脚'"
        :disabled="disabled"
      />
      <div v-if="config[key].enabled" class="space-y-3">
        <UFormField
          :label="key === 'header' ? '页眉文字 / slogan' : '页脚文字 / slogan'"
          help="可用变量：{name} 姓名、{page} 当前页、{pages} 总页数。单行展示，过长省略。"
        >
          <UInput
            v-model="config[key].text"
            :maxlength="100"
            :aria-label="`${key === 'header' ? '页眉' : '页脚'}文字`"
            :disabled="disabled"
            class="w-full"
          />
        </UFormField>
        <UFormField label="对齐">
          <USelect
            v-model="config[key].align"
            :items="alignments"
            :aria-label="`${key === 'header' ? '页眉' : '页脚'}对齐`"
            :disabled="disabled"
            class="w-full"
          />
        </UFormField>
        <UCheckbox v-model="config[key].hideFirstPage" label="首页隐藏（保留位置）" :disabled="disabled" />
        <UCheckbox v-model="config[key].separator" label="显示分隔线" :disabled="disabled" />
      </div>
    </section>
  </fieldset>
</template>

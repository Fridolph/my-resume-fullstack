<script setup lang="ts">
import type { ResumeDocument } from '@rs/common'
import { getSectionDefinition, toLegacySectionKey } from '#layers/public-resume/app/config/resume-sections'
import { useResumeThemeVariables } from '#layers/ui/app/composables/useResumeThemeVariables'

/**
 * 公开页的「展示设置」抽屉：把**这份简历当前生效的展示配置**列清楚。
 *
 * ## 为什么是新写的，而不是复用工作台那个 `ResumeSettingsDrawer`
 *
 * 那个抽屉绑在 `useResumeDisplay()`（**本地 mock 状态 + 自动保存**）上 ——
 * 它是编辑态的东西。公开页现在读的是**服务端文档**，两者不是同一份数据源，
 * 硬接会出现"抽屉里改的是本地、页面显示的是服务端"的撕裂。
 *
 * ## 本轮的口径：只读
 *
 * 访问者能**看到**这份简历用了什么主题 / 风格 / 布局和开了哪些显示项，
 * 但暂不提供修改（那需要"访客侧覆盖配置"的设计，属后续任务）。
 * 只读也足够兑现 Owner 要的"配置入口要留着" —— 入口有、信息清楚、不误导。
 */
const props = defineProps<{ document: ResumeDocument }>()
const open = defineModel<boolean>('open', { default: false })

const display = computed(() => props.document.display)

/** 复用共享的主题变量计算：抽屉里的配色小样与正文一致 */
const previewVars = useResumeThemeVariables(computed(() => display.value))

const STYLE_LABEL: Record<string, string> = {
  minimal: '极简',
  standard: '标准',
  pro: '精致',
}
const LAYOUT_LABEL: Record<string, string> = {
  single: '单栏',
  split: '双栏',
  threeColumn: '三栏',
}

/** 显示项开关的中文名（与 `ResumeDisplayOptions` 的字段一一对应） */
const OPTION_LABEL: Record<string, string> = {
  showPhone: '手机号',
  showEmail: '邮箱',
  showLocation: '所在地',
  showYears: '工作年限',
  showEducation: '学历',
}

const optionRows = computed(() => {
  const options = display.value.options as Record<string, unknown>
  return Object.entries(options)
    .filter(([, value]) => typeof value === 'boolean')
    .map(([key, value]) => ({ key, label: OPTION_LABEL[key] ?? key, on: value === true }))
})

/** 模块清单（含隐藏项），让作者一眼看到"哪些模块进了页面" */
const sectionRows = computed(() =>
  display.value.sections.order.map(id => {
    const section = props.document.content.sections.find(item => item.id === id)
    const key = section ? toLegacySectionKey(section.type) : 'profile'
    const definition = getSectionDefinition(key)
    return {
      id,
      label: section?.type === 'custom' ? (section.title ?? '自定义模块') : (definition?.label ?? key),
      hidden: display.value.sections.hidden.includes(id),
      slot: display.value.sections.slot[id] ?? definition?.defaultSlot ?? 'main',
    }
  }),
)
</script>

<template>
  <MyDrawer v-model:open="open" title="展示设置" description="这份简历当前生效的展示配置（只读）">
    <div class="space-y-5 text-sm">
      <!-- 外观：给一个配色小样，直观看出主题 -->
      <section class="space-y-2">
        <h3 class="text-xs font-semibold text-dimmed">外观</h3>
        <div class="flex items-center gap-3 rounded-lg border border-default p-3">
          <span
            class="size-8 shrink-0 rounded-md"
            :style="{ background: 'linear-gradient(135deg, var(--resume-gradient-from), var(--resume-gradient-to))' }"
            aria-hidden="true"
          />
          <dl class="grid flex-1 grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div class="flex justify-between">
              <dt class="text-muted">风格</dt>
              <dd>{{ STYLE_LABEL[display.style.id] ?? display.style.id }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-muted">明暗</dt>
              <dd>{{ display.theme.mode === 'dark' ? '深色' : '浅色' }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-muted">布局</dt>
              <dd>{{ LAYOUT_LABEL[display.layout.mode] ?? display.layout.mode }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-muted">主色</dt>
              <dd class="font-mono">{{ display.theme[display.theme.mode].primary }}</dd>
            </div>
          </dl>
        </div>
      </section>

      <!-- 显示项 -->
      <section v-if="optionRows.length" class="space-y-2">
        <h3 class="text-xs font-semibold text-dimmed">显示项</h3>
        <ul class="space-y-1.5">
          <li v-for="row in optionRows" :key="row.key" class="flex items-center gap-2">
            <UIcon
              :name="row.on ? 'i-lucide-eye' : 'i-lucide-eye-off'"
              class="size-4"
              :class="row.on ? 'text-primary' : 'text-dimmed'"
            />
            <span :class="row.on ? '' : 'text-dimmed'">{{ row.label }}</span>
          </li>
        </ul>
      </section>

      <!-- 模块清单 -->
      <section class="space-y-2">
        <h3 class="text-xs font-semibold text-dimmed">模块（按展示顺序）</h3>
        <ol class="space-y-1.5">
          <li v-for="(row, index) in sectionRows" :key="row.id" class="flex items-center gap-2">
            <span class="w-4 shrink-0 text-right text-xs text-dimmed">{{ index + 1 }}</span>
            <span :class="row.hidden ? 'text-dimmed line-through' : ''">{{ row.label }}</span>
            <UBadge v-if="row.hidden" size="sm" color="neutral" variant="subtle" label="已隐藏" />
            <span class="ml-auto text-xs text-dimmed">{{ row.slot }}</span>
          </li>
        </ol>
      </section>

      <p class="text-xs text-muted">
        访客侧暂不提供修改（改动会写回服务端，属后续任务）。要调整请到
        <NuxtLink to="/my-resumes" class="underline">我的简历</NuxtLink> 打开工作台。
      </p>
    </div>
  </MyDrawer>
</template>
